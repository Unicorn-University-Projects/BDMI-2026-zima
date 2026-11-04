
const KEY = 'playspot-venues-v1';

// Demo provozovatel
export const DEMO_OPERATOR_ID = 'c3e7b912-48af-4d0e-a6f1-2b9d5e04c7a1';

// Ukázkový areál
const DEMO_VENUE = {
  id: 'a81d4c27-6e09-4f3b-b5d2-91c7e0f4a6b8',
  name: 'Sportovní areál Zelená louka',
  street: 'Sportovní',
  streetNumber: '1423/8',
  city: 'Praha 4',
  emailAddress: 'rezervace@zelena-louka.cz',
  phoneNumber: '+420 603 123 456',
  operatorId: DEMO_OPERATOR_ID,
  operatorNote: 'Rakety a míče lze zapůjčit na recepci. Šatny a sprchy jsou v ceně.',
  sportsFieldsCount: 0,
};

// Načtení areálů z localStorage
function readVenues() {
  const saved = localStorage.getItem(KEY);

  // Při prvním spuštění vytvoří demo areál
  if (saved === null) {
    localStorage.setItem(KEY, JSON.stringify([DEMO_VENUE]));
    return [DEMO_VENUE];
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Seznam areálů provozovatele
export function listVenues() {
  return readVenues().filter(
    venue => venue.operatorId === DEMO_OPERATOR_ID
  );
}

// Detail konkrétního areálu
export function getVenue(id) {
  return listVenues().find(venue => venue.id === id);
}

// Normalizace textu pro kontrolu duplicit
const normalized = value =>
  value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('cs');

// Vytvoření nového areálu
export function createVenue(data) {
  const venues = listVenues();

  // Kontrola duplicitního areálu
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

  // Vytvoření areálu s unikátním ID
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

