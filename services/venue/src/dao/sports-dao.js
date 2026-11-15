import pool from "../db.js";

async function list() {
  const [rows] = await pool.execute("SELECT * FROM sports ORDER BY name ASC");
  return rows;
}

async function get(id) {
  const [rows] = await pool.execute("SELECT * FROM sports WHERE id = ?", [id]);
  return rows[0] ?? null;
}

async function getByCode(code) {
  const [rows] = await pool.execute("SELECT * FROM sports WHERE code = ?", [code]);
  return rows[0] ?? null;
}

export default {
  list,
  get,
  getByCode,
};
