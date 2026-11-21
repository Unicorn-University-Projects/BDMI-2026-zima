import pool from "../db.js";
import ensureSchema from "./ensure-schema.js";
import memoryStore from "./memory-store.js";
import { formatTime, parsePeakDays } from "../utils/opening-hours.js";

const useMemory = process.env.VENUE_MEMORY_DB === "1";

function mapPriceList(row) {
  if (!row || row.regularPrice == null) return null;
  const hasPeak = Boolean(row.hasPeak) || row.peakPrice != null;
  return {
    basePrice: Number(row.regularPrice),
    regularPrice: Number(row.regularPrice),
    hasPeak,
    peakPrice: row.peakPrice == null ? null : Number(row.peakPrice),
    peakDays: hasPeak ? parsePeakDays(row.peakDays) : [],
    peakFrom: formatTime(row.peakFrom),
    peakTo: formatTime(row.peakTo),
  };
}

function mapOpeningHour(row) {
  return {
    dayOfWeek: Number(row.dayOfWeek),
    openFrom: row.isClosed ? null : formatTime(row.openFrom),
    openTo: row.isClosed ? null : formatTime(row.openTo),
    isClosed: Boolean(row.isClosed),
  };
}

function mapSportsGround(row, openingHours = [], priceList = null) {
  if (!row) return null;
  const list = priceList ?? mapPriceList(row);
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
    regularPrice: list?.regularPrice ?? (row.regularPrice == null ? null : Number(row.regularPrice)),
    peakPrice: list?.peakPrice ?? (row.peakPrice == null ? null : Number(row.peakPrice)),
    priceList: list,
    openingHours,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const selectSql = `
  SELECT sg.*,
    s.code AS sportCode,
    s.name AS sportName,
    pl.regularPrice,
    pl.peakPrice,
    pl.hasPeak,
    pl.peakDays,
    pl.peakFrom,
    pl.peakTo
  FROM sports_grounds sg
  JOIN sports s ON s.id = sg.sportId
  LEFT JOIN price_lists pl ON pl.sportsGroundId = sg.id
`;

async function loadOpeningHours(sportsGroundId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT sportsGroundId, dayOfWeek, openFrom, openTo, isClosed
     FROM opening_hours
     WHERE sportsGroundId = ?
     ORDER BY dayOfWeek ASC`,
    [sportsGroundId],
  );
  return rows.map(mapOpeningHour);
}

async function enrich(row, connection = pool) {
  if (!row) return null;
  const openingHours = await loadOpeningHours(row.id, connection);
  return mapSportsGround(row, openingHours, mapPriceList(row));
}

function memorySport(sportId) {
  return memoryStore.sports.find((item) => item.id === sportId) ?? null;
}

function memoryGet(id) {
  const row = memoryStore.state.sportsGrounds.get(id);
  if (!row) return null;
  const sport = memorySport(row.sportId);
  const price = memoryStore.state.priceLists.get(id) ?? null;
  const openingHours = [...(memoryStore.state.openingHours.get(id) ?? [])].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek,
  );
  return mapSportsGround(
    {
      ...row,
      sportCode: sport?.code ?? null,
      sportName: sport?.name ?? null,
      regularPrice: price?.regularPrice ?? null,
      peakPrice: price?.peakPrice ?? null,
      hasPeak: price?.hasPeak ?? false,
      peakDays: price?.peakDays ?? [],
      peakFrom: price?.peakFrom ?? null,
      peakTo: price?.peakTo ?? null,
    },
    openingHours,
    price ? mapPriceList(price) : null,
  );
}

async function create(sportsGround) {
  if (useMemory) {
    const now = new Date().toISOString();
    memoryStore.state.sportsGrounds.set(sportsGround.id, {
      id: sportsGround.id,
      venueId: sportsGround.venueId,
      sportId: sportsGround.sportId,
      name: sportsGround.name,
      surface: sportsGround.surface,
      coverType: sportsGround.coverType,
      status: "inactive",
      createdAt: now,
      updatedAt: null,
    });
    return memoryGet(sportsGround.id);
  }

  await ensureSchema();
  await pool.execute(
    `INSERT INTO sports_grounds (id, venueId, sportId, name, surface, coverType, status)
     VALUES (?, ?, ?, ?, ?, ?, 'inactive')`,
    [
      sportsGround.id,
      sportsGround.venueId,
      sportsGround.sportId,
      sportsGround.name,
      sportsGround.surface,
      sportsGround.coverType,
    ],
  );
  return get(sportsGround.id);
}

async function get(id) {
  if (useMemory) return memoryGet(id);
  await ensureSchema();
  const [rows] = await pool.execute(`${selectSql} WHERE sg.id = ?`, [id]);
  return enrich(rows[0]);
}

async function getByVenueAndName(venueId, name) {
  if (useMemory) {
    const row = [...memoryStore.state.sportsGrounds.values()].find(
      (item) => item.venueId === venueId && item.name.toLowerCase() === String(name).toLowerCase(),
    );
    return row ? memoryGet(row.id) : null;
  }

  await ensureSchema();
  const [rows] = await pool.execute(
    `${selectSql} WHERE sg.venueId = ? AND LOWER(sg.name) = LOWER(?)`,
    [venueId, name],
  );
  return enrich(rows[0]);
}

async function list({ venueId, status } = {}) {
  if (useMemory) {
    let items = [...memoryStore.state.sportsGrounds.values()];
    if (venueId) items = items.filter((item) => item.venueId === venueId);
    if (status) items = items.filter((item) => item.status === status);
    return items.map((item) => memoryGet(item.id)).sort((a, b) => a.name.localeCompare(b.name));
  }

  await ensureSchema();
  const where = [];
  const params = [];
  if (venueId) {
    where.push("sg.venueId = ?");
    params.push(venueId);
  }
  if (status) {
    where.push("sg.status = ?");
    params.push(status);
  }
  const sql = `${selectSql}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY sg.name ASC`;
  const [rows] = await pool.execute(sql, params);
  return Promise.all(rows.map((row) => enrich(row)));
}

async function update(id, sportsGround) {
  if (useMemory) {
    const current = memoryStore.state.sportsGrounds.get(id);
    memoryStore.state.sportsGrounds.set(id, {
      ...current,
      sportId: sportsGround.sportId,
      name: sportsGround.name,
      surface: sportsGround.surface,
      coverType: sportsGround.coverType,
      status: sportsGround.status,
      updatedAt: new Date().toISOString(),
    });
    return memoryGet(id);
  }

  await ensureSchema();
  await pool.execute(
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
  return get(id);
}

async function hasOpeningHoursAndPriceList(id) {
  if (useMemory) {
    return memoryStore.state.openingHours.has(id) && memoryStore.state.priceLists.has(id);
  }
  await ensureSchema();
  const [hours] = await pool.execute(
    "SELECT 1 AS ok FROM opening_hours WHERE sportsGroundId = ? LIMIT 1",
    [id],
  );
  const [prices] = await pool.execute(
    "SELECT 1 AS ok FROM price_lists WHERE sportsGroundId = ? LIMIT 1",
    [id],
  );
  return hours.length > 0 && prices.length > 0;
}

async function setOpeningHoursAndPriceList(id, { openingHours, priceList }) {
  if (useMemory) {
    memoryStore.state.openingHours.set(
      id,
      openingHours.map((day) => ({ ...day })),
    );
    memoryStore.state.priceLists.set(id, {
      sportsGroundId: id,
      regularPrice: priceList.regularPrice,
      peakPrice: priceList.peakPrice,
      hasPeak: priceList.hasPeak,
      peakDays: priceList.peakDays,
      peakFrom: priceList.peakFrom,
      peakTo: priceList.peakTo,
    });
    const current = memoryStore.state.sportsGrounds.get(id);
    memoryStore.state.sportsGrounds.set(id, {
      ...current,
      status: "active",
      updatedAt: new Date().toISOString(),
    });
    return memoryGet(id);
  }

  await ensureSchema();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("DELETE FROM opening_hours WHERE sportsGroundId = ?", [id]);
    for (const day of openingHours) {
      await connection.execute(
        `INSERT INTO opening_hours (sportsGroundId, dayOfWeek, openFrom, openTo, isClosed)
         VALUES (?, ?, ?, ?, ?)`,
        [id, day.dayOfWeek, day.openFrom, day.openTo, day.isClosed ? 1 : 0],
      );
    }

    const peakDaysJson = JSON.stringify(priceList.peakDays ?? []);
    await connection.execute(
      `INSERT INTO price_lists
        (sportsGroundId, regularPrice, peakPrice, hasPeak, peakDays, peakFrom, peakTo)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         regularPrice = VALUES(regularPrice),
         peakPrice = VALUES(peakPrice),
         hasPeak = VALUES(hasPeak),
         peakDays = VALUES(peakDays),
         peakFrom = VALUES(peakFrom),
         peakTo = VALUES(peakTo)`,
      [
        id,
        priceList.regularPrice,
        priceList.peakPrice,
        priceList.hasPeak ? 1 : 0,
        peakDaysJson,
        priceList.peakFrom,
        priceList.peakTo,
      ],
    );

    await connection.execute("UPDATE sports_grounds SET status = 'active' WHERE id = ?", [id]);
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
  if (useMemory) {
    memoryStore.state.sportsGrounds.delete(id);
    memoryStore.state.openingHours.delete(id);
    memoryStore.state.priceLists.delete(id);
    return;
  }
  await pool.execute("DELETE FROM sports_grounds WHERE id = ?", [id]);
}

export default {
  create,
  get,
  getByVenueAndName,
  list,
  update,
  hasOpeningHoursAndPriceList,
  setOpeningHoursAndPriceList,
  deleteById,
};
