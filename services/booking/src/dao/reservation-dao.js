import pool from "../db.js";
import memoryStore from "./memory-store.js";

const useMemory = process.env.BOOKING_MEMORY_DB === "1";
const ACTIVE_STATES = ["created", "confirmed"];
const ACTIVE_SLOT_INDEX = "uq_reservations_active_slot";

class SlotTakenError extends Error {
  constructor({ sportsGroundId, date, startTime }) {
    super(`Slot ${sportsGroundId} ${date} ${startTime} is already reserved.`);
    this.name = "SlotTakenError";
    this.slot = { sportsGroundId, date, startTime };
  }
}

function isActiveSlotConflict(error) {
  return (
    (error.code === "ER_DUP_ENTRY" || error.errno === 1062) &&
    String(error.sqlMessage ?? error.message).includes(ACTIVE_SLOT_INDEX)
  );
}

function formatDate(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  return text.length >= 10 ? text.slice(0, 10) : text;
}

function formatTime(value) {
  if (value == null) return null;
  const text = String(value);
  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text.slice(0, 5);
  return text;
}

function mapReservation(row) {
  if (!row) return null;
  return {
    id: row.id,
    sportsGroundId: row.sportsGroundId,
    athleteId: row.athleteId,
    date: formatDate(row.date),
    startTime: formatTime(row.startTime),
    price: Number(row.price),
    state: row.state,
    note: row.note ?? null,
    rejectionReason: row.rejectionReason ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt ?? null,
  };
}

function findActiveInMemory(sportsGroundId, date, startTime) {
  return [...memoryStore.state.reservations.values()].find(
    (item) =>
      item.sportsGroundId === sportsGroundId &&
      item.date === date &&
      item.startTime === startTime &&
      ACTIVE_STATES.includes(item.state),
  );
}

async function create(reservation) {
  if (useMemory) {
    if (findActiveInMemory(reservation.sportsGroundId, reservation.date, reservation.startTime)) {
      throw new SlotTakenError(reservation);
    }
    const now = new Date().toISOString();
    const row = {
      id: reservation.id,
      sportsGroundId: reservation.sportsGroundId,
      athleteId: reservation.athleteId,
      date: reservation.date,
      startTime: reservation.startTime,
      price: reservation.price,
      state: "created",
      note: reservation.note ?? null,
      rejectionReason: null,
      createdAt: now,
      updatedAt: null,
    };
    memoryStore.state.reservations.set(row.id, row);
    return mapReservation(row);
  }

  try {
    await pool.execute(
      `INSERT INTO reservations
        (id, sportsGroundId, athleteId, date, startTime, price, state, note, rejectionReason)
       VALUES (?, ?, ?, ?, ?, ?, 'created', ?, NULL)`,
      [
        reservation.id,
        reservation.sportsGroundId,
        reservation.athleteId,
        reservation.date,
        reservation.startTime,
        reservation.price,
        reservation.note ?? null,
      ],
    );
  } catch (error) {
    if (isActiveSlotConflict(error)) {
      throw new SlotTakenError(reservation);
    }
    throw error;
  }
  return get(reservation.id);
}

async function get(id) {
  if (useMemory) {
    return mapReservation(memoryStore.state.reservations.get(id));
  }
  const [rows] = await pool.execute("SELECT * FROM reservations WHERE id = ?", [id]);
  return mapReservation(rows[0]);
}

async function getActiveBySlot(sportsGroundId, date, startTime) {
  if (useMemory) {
    return mapReservation(findActiveInMemory(sportsGroundId, date, startTime));
  }

  const [rows] = await pool.execute(
    `SELECT * FROM reservations
     WHERE sportsGroundId = ? AND date = ? AND startTime = ?
       AND state IN ('created', 'confirmed')
     LIMIT 1`,
    [sportsGroundId, date, startTime],
  );
  return mapReservation(rows[0]);
}

export { SlotTakenError };

export default {
  create,
  get,
  getActiveBySlot,
};
