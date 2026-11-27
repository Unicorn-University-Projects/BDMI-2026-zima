import { SPORTS_GROUNDS, freeSlotsFor } from './searchFixtures';
import { addDays, fromIsoDate, toIsoDate, today } from '../utils/searchParams';

// ==========================================
// VYHLEDÁVÁNÍ SPORTOVIŠŤ (BUC-01)
// ==========================================
//
// Jediné místo, které komponenty volají. Teď čte pevná data ze
// searchFixtures.js; až vznikne booking služba, přepíše se tělo
// searchSportsGrounds na apiFetch('/booking/sportsGround/search?...')
// a komponenty se nezmění.

// Kolik dní dopředu se hledá nejbližší volný termín.
const NEXT_FREE_HORIZON = 14;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function dayOffsetOf(isoDate) {
  const date = fromIsoDate(isoDate);
  if (!date) {
    return 0;
  }
  const diff = date.getTime() - today().getTime();
  return Math.round(diff / 86400000);
}

function matchesCriteria(item, { sport, lokalita }) {
  if (sport && item.sportCode !== sport) {
    return false;
  }
  if (lokalita) {
    const needle = lokalita.trim().toLowerCase();
    const haystack = `${item.venue.city} ${item.venue.cityPart}`.toLowerCase();
    if (!haystack.includes(needle)) {
      return false;
    }
  }
  return true;
}

function sortItems(itemList, sort) {
  const sorted = [...itemList];
  if (sort === 'rating') {
    return sorted.sort((a, b) => (b.rating?.average ?? 0) - (a.rating?.average ?? 0));
  }
  if (sort === 'name') {
    return sorted.sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  }
  return sorted.sort((a, b) => a.regularPrice - b.regularPrice);
}

// Z pevných dat udělá položku výsledku. Stejnou funkci použije i reálné
// API – jen jí přijde dtoOut z backendu.
export function mapSearchResult(item, dayOffset) {
  const date = toIsoDate(addDays(today(), dayOffset));
  const slots = freeSlotsFor(item.id, dayOffset);

  return {
    id: item.id,
    venueId: item.venueId,
    sportCode: item.sportCode,
    sportName: item.sportName,
    name: item.name,
    surface: item.surface,
    coverType: item.coverType,
    status: item.status,
    regularPrice: item.regularPrice,
    peakPrice: item.peakPrice,
    priceList: item.priceList,
    openingHours: item.openingHours,
    venue: item.venue,
    photoUrl: item.photoUrl,
    rating: item.rating,
    availability: { date, ...slots }
  };
}

// Nejbližší další den, kdy je na zadaná kritéria aspoň jedno volné
// sportoviště. Vrací ISO datum nebo null.
function findNextFreeDate(criteria, fromOffset) {
  for (let offset = fromOffset + 1; offset <= fromOffset + NEXT_FREE_HORIZON; offset += 1) {
    const found = SPORTS_GROUNDS.some(
      item => matchesCriteria(item, criteria) && item.freeDayOffsets.includes(offset)
    );
    if (found) {
      return toIsoDate(addDays(today(), offset));
    }
  }
  return null;
}

export async function searchSportsGrounds({ sport, lokalita, datum, sort } = {}) {
  // Krátká prodleva, ať se dá vyzkoušet stav načítání.
  await delay(200);

  const criteria = { sport, lokalita };
  const dayOffset = dayOffsetOf(datum);

  const matching = SPORTS_GROUNDS.filter(item => matchesCriteria(item, criteria));
  const free = matching.filter(item => item.freeDayOffsets.includes(dayOffset));
  const itemList = sortItems(free.map(item => mapSearchResult(item, dayOffset)), sort);

  return {
    itemList,
    total: itemList.length,
    criteria: { sport, lokalita, datum, sort },
    // Pro prázdný stav: kdy je nejbližší volno a kam rozšířit hledání.
    nextFreeDate: itemList.length === 0 ? findNextFreeDate(criteria, dayOffset) : null,
    widerAreaCity: lokalita ? `${lokalita.trim()} a okolí` : null
  };
}