import pool from "../db.js";

async function create(venue) {
  await pool.execute(
    `INSERT INTO venues (id, operatorId, name, street, city, noteForAthletes, email, phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      venue.id,
      venue.operatorId,
      venue.name,
      venue.street,
      venue.city,
      venue.noteForAthletes,
      venue.email,
      venue.phone,
    ],
  );
  return get(venue.id);
}

async function get(id) {
  const [rows] = await pool.execute("SELECT * FROM venues WHERE id = ?", [id]);
  return rows[0] ?? null;
}

async function getByNameAndAddress(operatorId, name, street, city) {
  const [rows] = await pool.execute(
    `SELECT * FROM venues
     WHERE operatorId = ? AND name = ? AND street = ? AND city = ?`,
    [operatorId, name, street, city],
  );
  return rows[0] ?? null;
}

async function listByOperatorId(operatorId) {
  const [rows] = await pool.execute(
    "SELECT * FROM venues WHERE operatorId = ? ORDER BY name ASC",
    [operatorId],
  );
  return rows;
}

async function update(id, venue) {
  await pool.execute(
    `UPDATE venues
     SET name = ?, street = ?, city = ?, noteForAthletes = ?, email = ?, phone = ?
     WHERE id = ?`,
    [venue.name, venue.street, venue.city, venue.noteForAthletes, venue.email, venue.phone, id],
  );
  return get(id);
}

async function deleteById(id) {
  await pool.execute("DELETE FROM venues WHERE id = ?", [id]);
}

export default {
  create,
  get,
  getByNameAndAddress,
  listByOperatorId,
  update,
  deleteById,
};
