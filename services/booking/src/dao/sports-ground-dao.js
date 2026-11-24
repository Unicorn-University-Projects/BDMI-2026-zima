import pool from "../db.js";

const useMemory = process.env.BOOKING_MEMORY_DB === "1";
const venueUrl = process.env.VENUE_URL;
const gatewaySecret = process.env.GATEWAY_INTERNAL_SECRET;

function formatTime(value) {
  if (value == null) return null;
  const text = String(value);
  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text.slice(0, 5);
  return text;
}

function parsePeakDays(peakDays) {
  if (Array.isArray(peakDays)) {
    return peakDays.map((day) => Number(day)).filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);
  }
  if (typeof peakDays === "string" && peakDays.trim()) {
    try {
      const parsed = JSON.parse(peakDays);
      if (Array.isArray(parsed)) return parsePeakDays(parsed);
    } catch {
      return peakDays
        .split(",")
        .map((day) => Number(day.trim()))
        .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);
    }
  }
  return [];
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

async function getFromDb(id) {
  const [rows] = await pool.execute(
    `SELECT sg.id, sg.venueId, sg.status,
      pl.regularPrice, pl.peakPrice, pl.hasPeak, pl.peakDays, pl.peakFrom, pl.peakTo
     FROM sports_grounds sg
     LEFT JOIN price_lists pl ON pl.sportsGroundId = sg.id
     WHERE sg.id = ?`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;

  const [hours] = await pool.execute(
    `SELECT dayOfWeek, openFrom, openTo, isClosed
     FROM opening_hours
     WHERE sportsGroundId = ?
     ORDER BY dayOfWeek ASC`,
    [id],
  );

  return {
    id: row.id,
    venueId: row.venueId,
    status: row.status,
    priceList: mapPriceList(row),
    openingHours: hours.map(mapOpeningHour),
  };
}

async function getFromVenue(id, { userId, role } = {}) {
  if (!venueUrl) {
    throw new Error("VENUE_URL environment variable is required when BOOKING_MEMORY_DB=1");
  }

  const url = new URL("/sportsGround/get", venueUrl);
  url.searchParams.set("id", id);

  const response = await fetch(url, {
    headers: {
      "X-Gateway-Secret": gatewaySecret,
      ...(userId ? { "X-User-Id": userId } : {}),
      ...(role ? { "X-User-Role": role } : {}),
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Venue sportsGround/get failed (${response.status}): ${body}`);
  }

  const { sportsGround } = await response.json();
  return sportsGround;
}

async function get(id, requestContext = {}) {
  if (useMemory) {
    return getFromVenue(id, requestContext);
  }
  return getFromDb(id);
}

export default { get };
