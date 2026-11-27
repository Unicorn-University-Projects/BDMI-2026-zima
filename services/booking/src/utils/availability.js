import reservationDao from "../dao/reservation-dao.js";
import { generateSlots, getFreeSlots } from "./slots.js";

function slotKey(sportsGroundId, date) {
  return `${sportsGroundId}|${date}`;
}

async function loadOccupiedSlots(sportsGroundIdList, dateFrom, dateTo) {
  const reservations = await reservationDao.listActiveBySportsGroundListAndDateRange(
    sportsGroundIdList,
    dateFrom,
    dateTo,
  );
  const occupied = new Map();
  for (const item of reservations) {
    const key = slotKey(item.sportsGroundId, item.date);
    if (!occupied.has(key)) occupied.set(key, []);
    occupied.get(key).push(item.startTime);
  }
  return occupied;
}

function getDaySlots(sportsGround, date, occupiedSlots, now) {
  return generateSlots({
    openingHours: sportsGround.openingHours,
    priceList: sportsGround.priceList,
    date,
    occupiedStartTimes: occupiedSlots.get(slotKey(sportsGround.id, date)) ?? [],
    now,
  });
}

function summarizeFreeSlots(slotList) {
  const freeSlots = getFreeSlots(slotList);
  return {
    freeSlotCount: freeSlots.length,
    priceFrom: freeSlots.length > 0 ? Math.min(...freeSlots.map((slot) => slot.price)) : null,
  };
}

export default { loadOccupiedSlots, getDaySlots, summarizeFreeSlots };
