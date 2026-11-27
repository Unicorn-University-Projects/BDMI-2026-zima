// Čtení sportovišť pro booking. Tabulky sports_grounds, sports, venues, opening_hours
// a price_lists vlastní služba venue; booking je ve společné databázi jen čte.
import pool, { useMemory } from "../db.js";
import memoryStore from "./memory-store.js";

const venueUrl = process.env.VENUE_URL;
const gatewaySecret = process.env.GATEWAY_INTERNAL_SECRET;

const SELECT_SPORTS_GROUND = `
  SELECT sg.id, sg.venueId, sg.name, sg.surface, sg.coverType, sg.status,
         s.code AS sportCode, s.name AS sportName,
         v.name AS venueName, v.street AS venueStreet, v.city AS venueCity, v.operatorId
  FROM sports_grounds sg
  JOIN sports s ON s.id = sg.sportId
  JOIN venues v ON v.id = sg.venueId`;

function placeholders(list) {
  return list.map(() => "?").join(", ");
}

// "08:00:00" (sloupec TIME) -> "08:00"; "24:00" a "08:00" zůstávají
function formatTime(value) {
  if (value == null) return null;
  const text = String(value);
  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text.slice(0, 5);
  return text;
}

function parsePeakDays(value) {
  if (Array.isArray(value)) return value.map(Number).filter((day) => day >= 1 && day <= 7);
  if (typeof value === "string" && value.trim()) {
    try {
      return parsePeakDays(JSON.parse(value));
    } catch {
      return parsePeakDays(value.split(","));
    }
  }
  return [];
}

function mapOpeningHour(row) {
  const isClosed = Boolean(Number(row.isClosed));
  return {
    dayOfWeek: Number(row.dayOfWeek),
    openFrom: isClosed ? null : formatTime(row.openFrom),
    openTo: isClosed ? null : formatTime(row.openTo),
    isClosed,
  };
}

// Ceník ve tvaru Application Modelu. Starší data mají čas špičky u otevírací doby
// (opening_hours.peakFrom/peakTo) – stejně jako to čte služba venue.
function mapPriceList(row, openingHourRows = []) {
  if (!row || row.regularPrice == null) return null;
  const peakPrice = row.peakPrice == null ? null : Number(row.peakPrice);
  let hasPeak = Boolean(Number(row.hasPeak ?? 0)) || peakPrice != null;
  let peakDays = parsePeakDays(row.peakDays);
  let peakFrom = row.peakFrom ?? null;
  let peakTo = row.peakTo ?? null;

  if (hasPeak && peakDays.length === 0) {
    const legacyPeakRows = openingHourRows.filter((item) => item.peakFrom != null && item.peakTo != null);
    if (legacyPeakRows.length > 0) {
      peakDays = legacyPeakRows.map((item) => Number(item.dayOfWeek));
      peakFrom = legacyPeakRows[0].peakFrom;
      peakTo = legacyPeakRows[0].peakTo;
    }
  }
  if (peakPrice == null || peakDays.length === 0 || peakFrom == null || peakTo == null) {
    hasPeak = false;
  }

  return {
    basePrice: Number(row.regularPrice),
    regularPrice: Number(row.regularPrice),
    hasPeak,
    peakPrice: hasPeak ? peakPrice : null,
    peakDays: hasPeak ? peakDays : [],
    peakFrom: hasPeak ? formatTime(peakFrom) : null,
    peakTo: hasPeak ? formatTime(peakTo) : null,
  };
}

function mapSportsGround(row, openingHourRows, priceListRow) {
  return {
    id: row.id,
    venueId: row.venueId,
    name: row.name,
    surface: row.surface,
    coverType: row.coverType,
    status: row.status,
    sport: { code: row.sportCode, name: row.sportName },
    venue: {
      id: row.venueId,
      name: row.venueName,
      street: row.venueStreet,
      city: row.venueCity,
      operatorId: row.operatorId,
    },
    openingHours: openingHourRows.map(mapOpeningHour).sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    priceList: mapPriceList(priceListRow, openingHourRows),
  };
}

// Doplní otevírací dobu a ceník – dva dotazy pro celý seznam sportovišť.
// SELECT * záměrně: sloupce špičky se mezi starší a novou verzí schématu liší.
async function attachSchedules(rows) {
  if (rows.length === 0) return [];
  const idList = rows.map((row) => row.id);
  const [hourRows] = await pool.execute(
    `SELECT * FROM opening_hours WHERE sportsGroundId IN (${placeholders(idList)})`,
    idList,
  );
  const [priceRows] = await pool.execute(
    `SELECT * FROM price_lists WHERE sportsGroundId IN (${placeholders(idList)})`,
    idList,
  );
  return rows.map((row) =>
    mapSportsGround(
      row,
      hourRows.filter((item) => item.sportsGroundId === row.id),
      priceRows.find((item) => item.sportsGroundId === row.id) ?? null,
    ),
  );
}

// ---------- paměťový režim ----------

function memoryRows(filter) {
  const { venues, sports, sportsGrounds } = memoryStore.state;
  return sportsGrounds.filter(filter).map((sportsGround) => {
    const sport = sports.find((item) => item.id === sportsGround.sportId);
    const venue = venues.find((item) => item.id === sportsGround.venueId);
    return {
      ...sportsGround,
      sportCode: sport?.code ?? null,
      sportName: sport?.name ?? null,
      venueName: venue?.name ?? null,
      venueStreet: venue?.street ?? null,
      venueCity: venue?.city ?? null,
      operatorId: venue?.operatorId ?? null,
    };
  });
}

function memoryAttach(rows) {
  const { openingHours, priceLists } = memoryStore.state;
  return rows.map((row) => {
    const hours = (openingHours.get(row.id) ?? []).map((day) => ({ ...day, sportsGroundId: row.id }));
    const price = priceLists.get(row.id);
    return mapSportsGround(row, hours, price ? { ...price, sportsGroundId: row.id } : null);
  });
}

// Sportoviště, které není v ukázkových datech (např. ho test právě založil ve službě
// venue), se v paměťovém režimu načte ze služby venue přes sportsGround/get.
async function getFromVenue(id, { userId, role } = {}) {
  if (!venueUrl) return null;

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

// ---------- DAO metody (názvy podle Application Modelu) ----------

// requestContext ({ userId, role }) se použije jen při načtení ze služby venue.
async function get(id, requestContext = {}) {
  if (useMemory) {
    const seeded = memoryAttach(memoryRows((item) => item.id === id))[0];
    return seeded ?? getFromVenue(id, requestContext);
  }
  const [rows] = await pool.execute(`${SELECT_SPORTS_GROUND} WHERE sg.id = ?`, [id]);
  return (await attachSchedules(rows))[0] ?? null;
}

// Aktivní sportoviště zadaných areálů pro jeden sport (kód sportu, např. "tennis").
async function listActiveByVenueListAndSport(venueIdList, sportCode) {
  if (venueIdList.length === 0) return [];
  if (useMemory) {
    const sport = memoryStore.state.sports.find((item) => item.code === sportCode);
    return memoryAttach(
      memoryRows(
        (item) => venueIdList.includes(item.venueId) && item.sportId === sport?.id && item.status === "active",
      ),
    );
  }
  const [rows] = await pool.execute(
    `${SELECT_SPORTS_GROUND}
     WHERE sg.venueId IN (${placeholders(venueIdList)}) AND s.code = ? AND sg.status = 'active'
     ORDER BY v.name ASC, sg.name ASC`,
    [...venueIdList, sportCode],
  );
  return attachSchedules(rows);
}

export { formatTime, mapPriceList, parsePeakDays };

export default {
  get,
  listActiveByVenueListAndSport,
};
