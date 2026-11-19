// ==========================================
// ČÍSELNÍKY PRO VYHLEDÁVÁNÍ
// ==========================================
//
// Samostatně, aby je mohly použít vizuální komponenty i volání API,
// aniž by komponenta musela sahat do vrstvy calls.
//
// TODO: sporty má v databázi tabulka sports, ale venue služba zatím
// nemá příkaz na jejich vypsání – až vznikne, číst je odtud.

export const SPORT_OPTIONS = [
  { code: 'tennis', name: 'Tenis' },
  { code: 'badminton', name: 'Badminton' },
  { code: 'squash', name: 'Squash' },
  { code: 'volleyball', name: 'Volejbal' },
  { code: 'table_tennis', name: 'Stolní tenis' }
];

export const SORT_OPTIONS = [
  { code: 'price', name: 'Podle ceny' },
  { code: 'rating', name: 'Podle hodnocení' },
  { code: 'name', name: 'Podle názvu' }
];
