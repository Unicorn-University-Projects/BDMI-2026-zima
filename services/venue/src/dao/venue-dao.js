import pool from "../db.js";

function mapVenue(row) {
  if (!row) return null;
  return {
    ...row,
    sportsFieldsCount: Number(row.sportsFieldsCount ?? 0),
  };
}

const venueSelect = `
  SELECT venues.*,
    (SELECT COUNT(*) FROM sports_grounds sg WHERE sg.venueId = venues.id) AS sportsFieldsCount
  FROM venues
`;

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
  const [rows] = await pool.execute(`${venueSelect} WHERE venues.id = ?`, [id]);
  return mapVenue(rows[0]);
}

async function getByNameAndAddress(operatorId, name, street, city) {
  const [rows] = await pool.execute(
    `${venueSelect}
     WHERE venues.operatorId = ? AND venues.name = ? AND venues.street = ? AND venues.city = ?`,
    [operatorId, name, street, city],
  );
  return mapVenue(rows[0]);
}

async function listByOperatorId(operatorId) {
  const [rows] = await pool.execute(
    `${venueSelect} WHERE venues.operatorId = ? ORDER BY venues.name ASC`,
    [operatorId],
  );
  return rows.map(mapVenue);
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

async function countSportsGrounds(venueId) {
  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS count FROM sports_grounds WHERE venueId = ?",
    [venueId],
  );
  return Number(rows[0]?.count ?? 0);
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
  countSportsGrounds,
  deleteById,
};
