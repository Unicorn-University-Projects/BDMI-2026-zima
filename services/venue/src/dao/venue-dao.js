import pool from "../db.js";
import memoryStore from "./memory-store.js";

const useMemory = process.env.VENUE_MEMORY_DB === "1";

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

function memoryCountSportsGrounds(venueId) {
  return [...memoryStore.state.sportsGrounds.values()].filter((item) => item.venueId === venueId).length;
}

function memoryGet(id) {
  const row = memoryStore.state.venues.get(id);
  if (!row) return null;
  return mapVenue({ ...row, sportsFieldsCount: memoryCountSportsGrounds(id) });
}

async function create(venue) {
  if (useMemory) {
    const now = new Date().toISOString();
    memoryStore.state.venues.set(venue.id, {
      ...venue,
      createdAt: now,
      updatedAt: null,
    });
    return memoryGet(venue.id);
  }

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
  if (useMemory) return memoryGet(id);
  const [rows] = await pool.execute(`${venueSelect} WHERE venues.id = ?`, [id]);
  return mapVenue(rows[0]);
}

async function getByNameAndAddress(operatorId, name, street, city) {
  if (useMemory) {
    return (
      [...memoryStore.state.venues.values()].find(
        (item) =>
          item.operatorId === operatorId &&
          item.name === name &&
          item.street === street &&
          item.city === city,
      ) ?? null
    );
  }
  const [rows] = await pool.execute(
    `${venueSelect}
     WHERE venues.operatorId = ? AND venues.name = ? AND venues.street = ? AND venues.city = ?`,
    [operatorId, name, street, city],
  );
  return mapVenue(rows[0]);
}

async function listByOperatorId(operatorId) {
  if (useMemory) {
    return [...memoryStore.state.venues.values()]
      .filter((item) => item.operatorId === operatorId)
      .map((item) => memoryGet(item.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  const [rows] = await pool.execute(
    `${venueSelect} WHERE venues.operatorId = ? ORDER BY venues.name ASC`,
    [operatorId],
  );
  return rows.map(mapVenue);
}

async function update(id, venue) {
  if (useMemory) {
    const current = memoryStore.state.venues.get(id);
    memoryStore.state.venues.set(id, {
      ...current,
      ...venue,
      updatedAt: new Date().toISOString(),
    });
    return memoryGet(id);
  }
  await pool.execute(
    `UPDATE venues
     SET name = ?, street = ?, city = ?, noteForAthletes = ?, email = ?, phone = ?
     WHERE id = ?`,
    [venue.name, venue.street, venue.city, venue.noteForAthletes, venue.email, venue.phone, id],
  );
  return get(id);
}

async function countSportsGrounds(venueId) {
  if (useMemory) return memoryCountSportsGrounds(venueId);
  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS count FROM sports_grounds WHERE venueId = ?",
    [venueId],
  );
  return Number(rows[0]?.count ?? 0);
}

async function deleteById(id) {
  if (useMemory) {
    memoryStore.state.venues.delete(id);
    return;
  }
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
