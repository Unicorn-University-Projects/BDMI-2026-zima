// Pomocné funkce pro práci s daty v kalendáři slotů.
// Datum je vždy text "RRRR-MM-DD". Dnešek se počítá v pražském čase, stejně jako na backendu
// (booking služba odmítne datum v minulosti), takže se frontend a backend nikdy neshodnou na tom, co je "dnes".

const DNY_KRATKE = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
const DNY_DLOUHE = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];

export function pragueToday() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Prague',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function parse(date) {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

export function addDays(date, days) {
  const { year, month, day } = parse(date);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

// 0 = pondělí ... 6 = neděle
function weekdayIndex(date) {
  const { year, month, day } = parse(date);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 6 : weekday - 1;
}

export function shortDayName(date) {
  return DNY_KRATKE[weekdayIndex(date)];
}

export function dayOfMonth(date) {
  return parse(date).day;
}

// "Úterý 3. 11. 2026"
export function longDateLabel(date) {
  const { year, month, day } = parse(date);
  return `${DNY_DLOUHE[weekdayIndex(date)]} ${day}. ${month}. ${year}`;
}

// "Út 3. 11."
export function shortDateLabel(date) {
  const { month, day } = parse(date);
  return `${shortDayName(date)} ${day}. ${month}.`;
}

// "08:00" -> "8:00"
export function timeLabel(time) {
  return String(time).replace(/^0/, '');
}

export function formatPrice(price) {
  return `${Number(price).toLocaleString('cs-CZ')} Kč`;
}
