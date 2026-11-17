import pool from "../db.js";
import memoryStore from "./memory-store.js";

const useMemory = process.env.VENUE_MEMORY_DB === "1";

async function list() {
  if (useMemory) return [...memoryStore.sports].sort((a, b) => a.name.localeCompare(b.name));
  const [rows] = await pool.execute("SELECT * FROM sports ORDER BY name ASC");
  return rows;
}

async function get(id) {
  if (useMemory) return memoryStore.sports.find((item) => item.id === id) ?? null;
  const [rows] = await pool.execute("SELECT * FROM sports WHERE id = ?", [id]);
  return rows[0] ?? null;
}

async function getByCode(code) {
  if (useMemory) return memoryStore.sports.find((item) => item.code === code) ?? null;
  const [rows] = await pool.execute("SELECT * FROM sports WHERE code = ?", [code]);
  return rows[0] ?? null;
}

export default {
  list,
  get,
  getByCode,
};
