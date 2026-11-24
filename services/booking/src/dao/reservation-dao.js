import pool from "../db.js";
import memoryStore from "./memory-store.js";

const useMemory = process.env.BOOKING_MEMORY_DB === "1";
const ACTIVE_STATES = ["created", "confirmed"];

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

async function create(reservation) {
  if (useMemory) {
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
    const row = [...memoryStore.state.reservations.values()].find(
      (item) =>
        item.sportsGroundId === sportsGroundId &&
        item.date === date &&
        item.startTime === startTime &&
        ACTIVE_STATES.includes(item.state),
    );
    return mapReservation(row);
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

export default {
  create,
  get,
  getActiveBySlot,
};
