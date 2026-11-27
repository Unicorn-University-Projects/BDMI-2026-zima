// Čtení areálů pro vyhledávání (tabulku venues vlastní služba venue).
import pool, { useMemory } from "../db.js";
import memoryStore from "./memory-store.js";

// "Žižkov" -> "zizkov"
function normalize(value) {
  return String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// Areály, jejichž město začíná zadaným textem, bez ohledu na velikost písmen
// a diakritiku (Application Model, Venue.listByCity): "olom" najde "Olomouc",
// "praha" najde "Praha 4".
async function listByCity(city) {
  if (useMemory) {
    const prefix = normalize(city);
    return memoryStore.state.venues
      .filter((venue) => normalize(venue.city).startsWith(prefix))
      .map(({ id, name, street, city: venueCity }) => ({ id, name, street, city: venueCity }))
      .sort((a, b) => a.name.localeCompare(b.name, "cs"));
  }
  // utf8mb4_unicode_ci nerozlišuje velikost písmen ani diakritiku.
  const [rows] = await pool.execute(
    `SELECT id, name, street, city
     FROM venues
     WHERE city COLLATE utf8mb4_unicode_ci LIKE ?
     ORDER BY name ASC`,
    [`${escapeLike(city.trim())}%`],
  );
  return rows;
}

export default {
  listByCity,
};
