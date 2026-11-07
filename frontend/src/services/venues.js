
const KEY = 'playspot-venues-v1';

// ==========================================
// 1. DEMO PROVOZOVATEL
// ==========================================

export const DEMO_OPERATOR_ID =
  'c3e7b912-48af-4d0e-a6f1-2b9d5e04c7a1';

// ==========================================
// 2. NAČTENÍ AREÁLŮ
// ==========================================

function readVenues() {

  const saved = localStorage.getItem(KEY);

  // Pokud nejsou uložená žádná data,
  // vytvoří se prázdný seznam
  if (saved === null) {
    localStorage.setItem(KEY, JSON.stringify([]));
    return [];
  }

  try {
    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];

  } catch {
    return [];
  }
}

// ==========================================
// 3. SEZNAM AREÁLŮ PROVOZOVATELE
// ==========================================

export function listVenues() {

  return readVenues().filter(
    venue => venue.operatorId === DEMO_OPERATOR_ID
  );

}

// ==========================================
// 4. DETAIL KONKRÉTNÍHO AREÁLU
// ==========================================

export function getVenue(id) {

  return listVenues().find(
    venue => venue.id === id
  );

}

// ==========================================
// 5. NORMALIZACE TEXTU
// ==========================================

// Slouží pro kontrolu duplicitních areálů

const normalized = value =>
  value.trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('cs');

// ==========================================
// 6. VYTVOŘENÍ NOVÉHO AREÁLU
// ==========================================

export function createVenue(data) {

  const venues = listVenues();

  // Kontrola duplicitního názvu a adresy
  if (venues.some(venue =>
    normalized(venue.name) === normalized(data.name) &&
    normalized(venue.street) === normalized(data.street) &&
    normalized(venue.streetNumber) === normalized(data.streetNumber) &&
    normalized(venue.city) === normalized(data.city)
  )) {

    throw new Error(
      'Areál s tímto názvem a adresou již existuje.'
    );

  }

  // Vytvoření nového areálu
  const venue = {
    ...data,
    id: crypto.randomUUID(),
    operatorId: DEMO_OPERATOR_ID,
    sportsFieldsCount: 0
  };

  // Uložení do localStorage
  localStorage.setItem(
    KEY,
    JSON.stringify([...venues, venue])
  );

  return venue;
}
