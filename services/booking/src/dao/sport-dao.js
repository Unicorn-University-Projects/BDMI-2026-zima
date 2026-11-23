// Číselník sportů (tabulku sports vlastní služba venue).
import pool, { useMemory } from "../db.js";
import memoryStore from "./memory-store.js";

async function getByCode(code) {
  if (useMemory) return memoryStore.state.sports.find((item) => item.code === code) ?? null;
  const [rows] = await pool.execute("SELECT id, code, name FROM sports WHERE code = ?", [code]);
  return rows[0] ?? null;
}

export default {
  getByCode,
};
