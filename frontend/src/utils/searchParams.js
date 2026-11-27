// ==========================================
// PARAMETRY VYHLEDÁVÁNÍ (BUC-01)
// ==========================================
//
// Kritéria hledání žijí v URL, ne ve stavu komponenty: přežijí obnovení
// stránky i tlačítko zpět, dají se poslat odkazem a jsou rovnou vstupem
// pro budoucí volání API.
//
// Tvar: /hledat/vysledky?sport=tennis&lokalita=Praha&datum=2026-11-18&sort=price

export const SEARCH_PATH = '/hledat/vysledky';
export const DEFAULT_SORT = 'price';

const DAY_SHORT = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];
const DAY_LONG = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];

// Datum jako YYYY-MM-DD v místním čase. toISOString() se nehodí, ten
// převádí do UTC a u půlnoci by uťal den zpátky.
export function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromIsoDate(value) {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function today() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// "st 18. 11."
export function formatShortDate(value) {
  const date = typeof value === 'string' ? fromIsoDate(value) : value;
  if (!date) {
    return '';
  }
  return `${DAY_SHORT[date.getDay()]} ${date.getDate()}. ${date.getMonth() + 1}.`;
}

// "středu 18. 11." – do věty „Na středu 18. 11. je v Praze vše obsazeno“
export function formatLongDateAccusative(value) {
  const date = typeof value === 'string' ? fromIsoDate(value) : value;
  if (!date) {
    return '';
  }
  // Čeština: 4. pád u dnů v týdnu mění jen pondělí, úterý, středa a sobota.
  const accusative = {
    'pondělí': 'pondělí',
    'úterý': 'úterý',
    'středa': 'středu',
    'čtvrtek': 'čtvrtek',
    'pátek': 'pátek',
    'sobota': 'sobotu',
    'neděle': 'neděli'
  };
  const name = DAY_LONG[date.getDay()];
  return `${accusative[name] ?? name} ${date.getDate()}. ${date.getMonth() + 1}.`;
}

// 6. pád názvu města do věty „… je v Praze vše obsazeno“.
// Čeština se nedá odvodit spolehlivě, proto jen nejčastější města a jinak
// null – volající pak větu složí bez názvu, ať nevznikne „v Praha“.
const CITY_LOCATIVE = {
  'praha': 'Praze',
  'brno': 'Brně',
  'ostrava': 'Ostravě',
  'plzeň': 'Plzni',
  'liberec': 'Liberci',
  'olomouc': 'Olomouci',
  'české budějovice': 'Českých Budějovicích',
  'hradec králové': 'Hradci Králové',
  'pardubice': 'Pardubicích',
  'zlín': 'Zlíně',
  'jihlava': 'Jihlavě',
  'karlovy vary': 'Karlových Varech',
  'ústí nad labem': 'Ústí nad Labem'
};

export function cityLocative(city) {
  if (!city) {
    return null;
  }
  return CITY_LOCATIVE[city.trim().toLowerCase()] ?? null;
}

// Popisek vybraného data v poli: „Dnes, pá 20. 11.“
export function formatPickerLabel(value) {
  const iso = typeof value === 'string' ? value : toIsoDate(value);
  if (!iso) {
    return '';
  }
  if (iso === toIsoDate(today())) {
    return `Dnes, ${formatShortDate(iso)}`;
  }
  if (iso === toIsoDate(addDays(today(), 1))) {
    return `Zítra, ${formatShortDate(iso)}`;
  }
  return formatShortDate(iso);
}

// Nabídka dnů pro select s datem: dnes, zítra a dál.
export function dateOptions(count = 14, from = today()) {
  return Array.from({ length: count }, (unused, index) => {
    const date = addDays(from, index);
    const label =
      index === 0
        ? `Dnes, ${formatShortDate(date)}`
        : index === 1
          ? `Zítra, ${formatShortDate(date)}`
          : formatShortDate(date);
    return { value: toIsoDate(date), label };
  });
}

// „Nalezeno 1 sportoviště“ / „Nalezena 3 sportoviště“ / „Nalezeno 7 sportovišť“
export function formatFoundCount(count) {
  if (count === 1) {
    return 'Nalezeno 1 sportoviště';
  }
  if (count >= 2 && count <= 4) {
    return `Nalezena ${count} sportoviště`;
  }
  return `Nalezeno ${count} sportovišť`;
}

export function buildSearchUrl({ sport, lokalita, datum, sort } = {}) {
  const params = new URLSearchParams();
  if (sport) {
    params.set('sport', sport);
  }
  if (lokalita) {
    params.set('lokalita', lokalita);
  }
  params.set('datum', datum || toIsoDate(today()));
  if (sort && sort !== DEFAULT_SORT) {
    params.set('sort', sort);
  }
  return `${SEARCH_PATH}?${params.toString()}`;
}

export function parseSearchParams(searchParams) {
  return {
    sport: searchParams.get('sport') ?? '',
    lokalita: searchParams.get('lokalita') ?? '',
    datum: searchParams.get('datum') || toIsoDate(today()),
    sort: searchParams.get('sort') || DEFAULT_SORT
  };
}
