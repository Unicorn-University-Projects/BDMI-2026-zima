import pool from "../db.js";
import ensureSchema from "./ensure-schema.js";
import memoryStore from "./memory-store.js";
import { formatTime, normalizePeakDays } from "../utils/opening-hours.js";

const useMemory = process.env.VENUE_MEMORY_DB === "1";

function parsePeakDays(value) {
  return normalizePeakDays(value);
}

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
  try {
    const [rows] = await connection.execute(
      `SELECT sportsGroundId, dayOfWeek, openFrom, openTo, isClosed
       FROM opening_hours
       WHERE sportsGroundId = ?
       ORDER BY dayOfWeek ASC`,
      [sportsGroundId],
    );
    return rows.map(mapOpeningHour);
  } catch (e) {
    if (e.code === "ER_BAD_FIELD_ERROR") {
      const [rows] = await connection.execute(
        `SELECT sportsGroundId, dayOfWeek, openFrom, openTo, isClosed
         FROM opening_hours
         WHERE sportsGroundId = ?
         ORDER BY dayOfWeek ASC`,
        [sportsGroundId],
      );
      return rows.map(mapOpeningHour);
    }
    throw e;
  }
}

async function enrich(row, connection = pool) {
  if (!row) return null;
  const openingHours = await loadOpeningHours(row.id, connection);
  let priceList = mapPriceList(row);
  if (!priceList?.hasPeak && openingHours.length > 0) {
    // legacy fallback when peak window lived on opening_hours
  }
  if (priceList && (!priceList.peakDays || priceList.peakDays.length === 0) && row.peakFrom == null) {
    try {
      const [peakRows] = await connection.execute(
        `SELECT dayOfWeek, peakFrom, peakTo
         FROM opening_hours
         WHERE sportsGroundId = ? AND peakFrom IS NOT NULL
         ORDER BY dayOfWeek ASC`,
        [row.id],
      );
      if (peakRows.length > 0) {
        priceList = {
          ...priceList,
          hasPeak: true,
          peakDays: peakRows.map((item) => Number(item.dayOfWeek)),
          peakFrom: formatTime(peakRows[0].peakFrom),
          peakTo: formatTime(peakRows[0].peakTo),
        };
      }
    } catch {
      // opening_hours may not have peak columns
    }
  }
  return mapSportsGround(row, openingHours, priceList);
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
  try {
    const [rows] = await pool.execute(`${selectSql} WHERE sg.id = ?`, [id]);
    return enrich(rows[0]);
  } catch (e) {
    if (e.code === "ER_BAD_FIELD_ERROR") {
      const [rows] = await pool.execute(
        `SELECT sg.*, s.code AS sportCode, s.name AS sportName, pl.regularPrice, pl.peakPrice
         FROM sports_grounds sg
         JOIN sports s ON s.id = sg.sportId
         LEFT JOIN price_lists pl ON pl.sportsGroundId = sg.id
         WHERE sg.id = ?`,
        [id],
      );
      return enrich(rows[0]);
    }
    throw e;
  }
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
  try {
    const [rows] = await pool.execute(sql, params);
    return Promise.all(rows.map((row) => enrich(row)));
  } catch (e) {
    if (e.code === "ER_BAD_FIELD_ERROR") {
      const fallback = `
        SELECT sg.*, s.code AS sportCode, s.name AS sportName, pl.regularPrice, pl.peakPrice
        FROM sports_grounds sg
        JOIN sports s ON s.id = sg.sportId
        LEFT JOIN price_lists pl ON pl.sportsGroundId = sg.id
        ${where.length ? ` WHERE ${where.join(" AND ")}` : ""}
        ORDER BY sg.name ASC`;
      const [rows] = await pool.execute(fallback, params);
      return Promise.all(rows.map((row) => enrich(row)));
    }
    throw e;
  }
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
    try {
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
    } catch (e) {
      if (e.code !== "ER_BAD_FIELD_ERROR") throw e;
      await connection.execute(
        `INSERT INTO price_lists (sportsGroundId, regularPrice, peakPrice)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE regularPrice = VALUES(regularPrice), peakPrice = VALUES(peakPrice)`,
        [id, priceList.regularPrice, priceList.peakPrice],
      );
      if (priceList.hasPeak) {
        for (const dayOfWeek of priceList.peakDays) {
          try {
            await connection.execute(
              `UPDATE opening_hours
               SET peakFrom = ?, peakTo = ?
               WHERE sportsGroundId = ? AND dayOfWeek = ?`,
              [priceList.peakFrom, priceList.peakTo, id, dayOfWeek],
            );
          } catch {
            break;
          }
        }
      }
    }

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
  list,
  update,
  hasOpeningHoursAndPriceList,
  setOpeningHoursAndPriceList,
  deleteById,
};
