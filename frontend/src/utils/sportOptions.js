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

// Povrchy nabízí návrh jako výběr, ne jako volný text. Venue služba ukládá
// surface jako řetězec, takže hodnotou je rovnou český název – seznam i
// detail sportoviště ho pak zobrazí přesně tak, jak ho provozovatel vybral.
export const SURFACE_OPTIONS = [
  'Antuka',
  'Tráva',
  'Umělá tráva',
  'Beton',
  'Tartan',
  'Palubovka',
  'Koberec',
  'Písek'
];

// Krytí je v návrhu přepínač se dvěma možnostmi, backend čeká indoor/outdoor.
export const COVER_TYPE_OPTIONS = [
  { code: 'indoor', name: 'Kryté' },
  { code: 'outdoor', name: 'Venkovní' }
];

export const SORT_OPTIONS = [
  { code: 'price', name: 'Podle ceny' },
  { code: 'rating', name: 'Podle hodnocení' },
  { code: 'name', name: 'Podle názvu' }
];
