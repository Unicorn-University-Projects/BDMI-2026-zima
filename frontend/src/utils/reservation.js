import { fromIsoDate } from './searchParams';

// ==========================================
// REZERVACE – POMOCNÉ FUNKCE (BUC-02)
// ==========================================
//
// Cenu a kontrolu otevírací doby počítá i backend (services/booking/src/utils/slot.js).
// Tady je proto schválně stejná logika: souhrn musí ukázat tutéž částku,
// kterou pak rezervace opravdu dostane, jinak by si uživatel přečetl
// jedno číslo a zaplatil druhé.

const DAY_LONG = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];

// Schéma databáze: 1 = pondělí … 7 = neděle, JS getDay(): neděle = 0.
const MONDAY_BASED = jsDay => (jsDay === 0 ? 7 : jsDay);

function timeToMinutes(value) {
  const [hours, minutes] = String(value).split(':').map(Number);
  return hours * 60 + minutes;
}

// "17:00" -> "18:00". Sloty jsou vždy hodinové.
export function addOneHour(startTime) {
  const hours = Math.floor((timeToMinutes(startTime) + 60) / 60);
  return `${String(hours).padStart(2, '0')}:00`;
}

export function dayOfWeekFromIsoDate(isoDate) {
  const date = fromIsoDate(isoDate);
  return date ? MONDAY_BASED(date.getDay()) : null;
}

// Stejný výpočet jako resolveSlotPrice na backendu.
export function resolveSlotPrice(priceList, dayOfWeek, startTime) {
  if (!priceList) {
    return { price: null, isPeak: false };
  }

  const basePrice = Number(priceList.basePrice ?? priceList.regularPrice);
  const inPeak =
    Boolean(priceList.hasPeak) &&
    (priceList.peakDays ?? []).map(Number).includes(dayOfWeek) &&
    timeToMinutes(priceList.peakFrom) <= timeToMinutes(startTime) &&
    timeToMinutes(startTime) < timeToMinutes(priceList.peakTo);

  return {
    price: inPeak ? Number(priceList.peakPrice) : basePrice,
    isPeak: inPeak
  };
}

// Vejde se hodinový slot do otevírací doby daného dne?
export function isWithinOpeningHours(openingHours, dayOfWeek, startTime) {
  const day = (openingHours ?? []).find(item => Number(item.dayOfWeek) === dayOfWeek);

  if (!day || day.isClosed || !day.openFrom || !day.openTo) {
    return false;
  }

  return (
    timeToMinutes(startTime) >= timeToMinutes(day.openFrom) &&
    timeToMinutes(addOneHour(startTime)) <= timeToMinutes(day.openTo)
  );
}

// Začátek slotu jako Date v místním čase.
export function slotStartsAt(isoDate, startTime) {
  const date = fromIsoDate(isoDate);
  if (!date) {
    return null;
  }
  const [hours, minutes] = startTime.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function isSlotInPast(isoDate, startTime, now = new Date()) {
  const startsAt = slotStartsAt(isoDate, startTime);
  return startsAt ? startsAt.getTime() <= now.getTime() : false;
}

// "Úterý 3. 11. 2026"
export function formatSummaryDate(isoDate) {
  const date = fromIsoDate(isoDate);
  if (!date) {
    return '';
  }
  const name = DAY_LONG[date.getDay()];
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
  return `${capitalized} ${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()}`;
}

// "17:00–18:00"
export function formatTimeRange(startTime) {
  return startTime ? `${startTime}–${addOneHour(startTime)}` : '';
}

// Zrušit jde nejpozději 24 hodin před začátkem – věta v informačním bloku
// říká konkrétní termín, ať si to uživatel nemusí počítat.
// Čeština: po předložce „do“ je 2. pád, ten mění jen středu, čtvrtek,
// pátek a sobotu (stejný přístup jako u 4. pádu v searchParams.js).
const DAY_GENITIVE = {
  'pondělí': 'pondělí',
  'úterý': 'úterý',
  'středa': 'středy',
  'čtvrtek': 'čtvrtka',
  'pátek': 'pátku',
  'sobota': 'soboty',
  'neděle': 'neděle'
};

export function formatCancelDeadline(isoDate, startTime) {
  const startsAt = slotStartsAt(isoDate, startTime);
  if (!startsAt) {
    return '';
  }

  const deadline = new Date(startsAt.getTime() - 24 * 60 * 60 * 1000);
  const name = DAY_LONG[deadline.getDay()];
  const time = `${deadline.getHours()}:${String(deadline.getMinutes()).padStart(2, '0')}`;

  return `${DAY_GENITIVE[name] ?? name} ${deadline.getDate()}. ${deadline.getMonth() + 1}. ${time}`;
}

// Adresa areálu na jeden řádek: "Lipová 12, Praha 8"
export function formatVenueAddress(venue) {
  if (!venue) {
    return '';
  }
  return [
    [venue.street, venue.streetNumber].filter(Boolean).join(' '),
    venue.city
  ]
    .filter(Boolean)
    .join(', ');
}
