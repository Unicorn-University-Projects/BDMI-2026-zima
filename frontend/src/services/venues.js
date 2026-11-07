
const KEY = 'playspot-venues-v1';

// Demo identita přihlášeného provozovatele
export const DEMO_OPERATOR_ID =
  'c3e7b912-48af-4d0e-a6f1-2b9d5e04c7a1';

// ==========================================
// NAČTENÍ DAT
// ==========================================

function readVenues() {
  try {
    const saved = localStorage.getItem(KEY);

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ==========================================
// SEZNAM AREÁLŮ PROVOZOVATELE
// ==========================================

export function listVenues() {
  return readVenues().filter(
    (venue) => venue.operatorId === DEMO_OPERATOR_ID
  );
}

// ==========================================
// DETAIL AREÁLU
// ==========================================

export function getVenue(id) {
  return listVenues().find(
    (venue) => venue.id === id
  );
}

// ==========================================
// NORMALIZACE TEXTU
// ==========================================

function normalize(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('cs');
}

// ==========================================
// VYTVOŘENÍ NOVÉHO AREÁLU
// ==========================================

export function createVenue(data) {
  const allVenues = readVenues();

  const duplicate = allVenues.some((venue) =>
    venue.operatorId === DEMO_OPERATOR_ID &&
    normalize(venue.name) === normalize(data.name) &&
    normalize(venue.street) === normalize(data.street) &&
    normalize(venue.streetNumber) ===
      normalize(data.streetNumber) &&
    normalize(venue.city) === normalize(data.city)
  );

  if (duplicate) {
    throw new Error(
      'Areál s tímto názvem a adresou již existuje.'
    );
  }

  const venue = {
    ...data,
    id: crypto.randomUUID(),
    operatorId: DEMO_OPERATOR_ID,
    sportsFieldsCount: 0
  };

  localStorage.setItem(
    KEY,
    JSON.stringify([...allVenues, venue])
  );

  return venue;
}
