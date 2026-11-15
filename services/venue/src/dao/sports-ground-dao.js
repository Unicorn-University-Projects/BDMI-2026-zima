import pool from "../db.js";

function mapSportsGround(row) {
  if (!row) return null;
  return {
    id: row.id,
    venueId: row.venueId,
    sportId: row.sportId,
    name: row.name,
    surface: row.surface,
    coverType: row.coverType,
    status: row.status,
    sportCode: row.sportCode ?? null,
    sportName: row.sportName ?? null,
    regularPrice: row.regularPrice == null ? null : Number(row.regularPrice),
    peakPrice: row.peakPrice == null ? null : Number(row.peakPrice),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const selectSql = `
  SELECT sg.*,
    s.code AS sportCode,
    s.name AS sportName,
    pl.regularPrice,
    pl.peakPrice
  FROM sports_grounds sg
  JOIN sports s ON s.id = sg.sportId
  LEFT JOIN price_lists pl ON pl.sportsGroundId = sg.id
`;

async function create(sportsGround) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO sports_grounds (id, venueId, sportId, name, surface, coverType, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        sportsGround.id,
        sportsGround.venueId,
        sportsGround.sportId,
        sportsGround.name,
        sportsGround.surface,
        sportsGround.coverType,
        sportsGround.status,
      ],
    );
    if (sportsGround.regularPrice != null) {
      await connection.execute(
        `INSERT INTO price_lists (sportsGroundId, regularPrice, peakPrice)
         VALUES (?, ?, ?)`,
        [sportsGround.id, sportsGround.regularPrice, sportsGround.peakPrice ?? null],
      );
    }
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
  return get(sportsGround.id);
}

async function get(id) {
  const [rows] = await pool.execute(`${selectSql} WHERE sg.id = ?`, [id]);
  return mapSportsGround(rows[0]);
}

async function list({ venueId } = {}) {
  if (venueId) {
    const [rows] = await pool.execute(
      `${selectSql} WHERE sg.venueId = ? ORDER BY sg.name ASC`,
      [venueId],
    );
    return rows.map(mapSportsGround);
  }
  const [rows] = await pool.execute(`${selectSql} ORDER BY sg.name ASC`);
  return rows.map(mapSportsGround);
}

async function update(id, sportsGround) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE sports_grounds
       SET sportId = ?, name = ?, surface = ?, coverType = ?, status = ?
       WHERE id = ?`,
      [
        sportsGround.sportId,
        sportsGround.name,
        sportsGround.surface,
        sportsGround.coverType,
        sportsGround.status,
        id,
      ],
    );
    if (sportsGround.regularPrice != null) {
      await connection.execute(
        `INSERT INTO price_lists (sportsGroundId, regularPrice, peakPrice)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE regularPrice = VALUES(regularPrice), peakPrice = VALUES(peakPrice)`,
        [id, sportsGround.regularPrice, sportsGround.peakPrice ?? null],
      );
    }
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
  return get(id);
}

async function deleteById(id) {
  await pool.execute("DELETE FROM sports_grounds WHERE id = ?", [id]);
}

export default {
  create,
  get,
  list,
  update,
  deleteById,
};
