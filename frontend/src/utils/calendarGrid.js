import { toIsoDate } from './searchParams';

// ==========================================
// MŘÍŽKA KALENDÁŘE
// ==========================================
//
// Čistý výpočet bez Reactu, ať se dá ověřit zvlášť. Týden začíná pondělím
// (česky), mřížka má vždy 6 řádků po 7 dnech, aby při přepínání měsíců
// neposkakovala výška.

export const WEEKDAY_SHORT = ['po', 'út', 'st', 'čt', 'pá', 'so', 'ne'];

export const MONTH_NAMES = [
  'leden', 'únor', 'březen', 'duben', 'květen', 'červen',
  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'
];

// 2. pád pro nadpis „Listopad 2026“ není potřeba – používáme 1. pád
// s velkým písmenem.
export function monthTitle(year, month) {
  const name = MONTH_NAMES[month];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

// Pondělí = 0, neděle = 6
export function mondayIndex(date) {
  return (date.getDay() + 6) % 7;
}

export function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - mondayIndex(first));

  const weeks = [];
  for (let week = 0; week < 6; week += 1) {
    const days = [];
    for (let day = 0; day < 7; day += 1) {
      const date = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + week * 7 + day
      );
      days.push({
        date,
        iso: toIsoDate(date),
        dayOfMonth: date.getDate(),
        inMonth: date.getMonth() === month
      });
    }
    weeks.push(days);
  }
  return weeks;
}

export function addMonths(year, month, step) {
  const date = new Date(year, month + step, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}
