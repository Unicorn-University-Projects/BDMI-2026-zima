import { apiFetch } from './api';

// Volné a obsazené hodinové sloty sportoviště pro jeden den.
// Backend: GET /booking/sportsGround/getAvailability?sportsGroundId=...&date=RRRR-MM-DD
// Odpověď: { sportsGround, date, dayOfWeek, isClosed, slotList }
// Slot:    { startTime: "17:00", endTime: "18:00", price: 450, isPeak: true, status: "free" | "occupied" | "past" }
export async function getAvailability(sportsGroundId, date) {
  const query = `sportsGroundId=${encodeURIComponent(sportsGroundId)}&date=${encodeURIComponent(date)}`;
  const data = await apiFetch(`/booking/sportsGround/getAvailability?${query}`);

  return {
    date: data.date,
    dayOfWeek: data.dayOfWeek,
    isClosed: Boolean(data.isClosed),
    slotList: (data.slotList ?? []).map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      price: Number(slot.price),
      isPeak: Boolean(slot.isPeak),
      status: slot.status
    }))
  };
}
