// ==========================================
// PEVNÁ DATA PRO VYHLEDÁVÁNÍ (BUC-01)
// ==========================================
//
// POZOR: nejde o data z databáze. Booking služba, která má vyhledávání
// a dostupnost obsluhovat, je zatím prázdná kostra s /health, stejně tak
// review služba s hodnoceními a fotky sportovišť nejsou nikde.
// Dokud to nevznikne, běží obrazovka na těchto datech.
//
// Tvar položky odpovídá mapSportsGround z services/venues.js, aby se dal
// později vyměnit zdroj bez zásahu do komponent.

// Dny, kdy je sportoviště volné, se počítají od dneška, ať data nezestárnou.
// Díky tomu existuje vždy jak scénář s výsledky, tak prázdný stav:
//   dnes (0)   -> tři tenisové kurty v Praze
//   za 3 dny   -> v Praze není volný tenis -> prázdný stav
//   za 4 dny   -> zase volno -> nabídka „Nejbližší volno“

export const SPORT_OPTIONS = [
  { code: 'tennis', name: 'Tenis' },
  { code: 'badminton', name: 'Badminton' },
  { code: 'squash', name: 'Squash' },
  { code: 'volleyball', name: 'Volejbal' },
  { code: 'table_tennis', name: 'Stolní tenis' }
];

export const CITY_OPTIONS = ['Praha', 'Brno'];

// Standardní otevírací doba, po–so 8–22, neděle zavřeno.
function standardOpeningHours() {
  return [1, 2, 3, 4, 5, 6]
    .map(dayOfWeek => ({ dayOfWeek, openFrom: '08:00', openTo: '22:00', isClosed: false }))
    .concat([{ dayOfWeek: 7, openFrom: null, openTo: null, isClosed: true }]);
}

function priceList(regularPrice, peakPrice) {
  return {
    basePrice: regularPrice,
    regularPrice,
    hasPeak: peakPrice != null,
    peakPrice: peakPrice ?? null,
    peakDays: peakPrice != null ? [1, 2, 3, 4, 5] : [],
    peakFrom: peakPrice != null ? '17:00' : null,
    peakTo: peakPrice != null ? '21:00' : null
  };
}

const VENUE_LIPA = {
  id: 'v-lipa',
  name: 'Sport Park Lípa',
  street: 'Lipová',
  streetNumber: '12',
  city: 'Praha',
  cityPart: 'Praha 8'
};

const VENUE_VINOHRADY = {
  id: 'v-vinohrady',
  name: 'Sportcentrum Vinohrady',
  street: 'Korunní',
  streetNumber: '88',
  city: 'Praha',
  cityPart: 'Praha 2'
};

const VENUE_LUZANKY = {
  id: 'v-luzanky',
  name: 'TK Lužánky',
  street: 'Sportovní',
  streetNumber: '4',
  city: 'Brno',
  cityPart: 'Brno-střed'
};

function sportsGround({
  id,
  name,
  sportCode,
  sportName,
  surface,
  coverType,
  venue,
  regularPrice,
  peakPrice,
  rating,
  freeDayOffsets
}) {
  return {
    // --- shodné s mapSportsGround (services/venues.js) ---
    id,
    venueId: venue.id,
    sportId: `sport-${sportCode}`,
    sportCode,
    sportName,
    name,
    surface,
    coverType,
    status: 'active',
    regularPrice,
    peakPrice: peakPrice ?? null,
    priceList: priceList(regularPrice, peakPrice),
    openingHours: standardOpeningHours(),

    // --- co backend zatím neumí ---
    venue, // TODO venue/venue/get – doplnit skutečný areál
    photoUrl: null, // TODO fotky sportovišť nejsou implementované
    rating, // TODO review/rating/list
    freeDayOffsets // TODO booking/sportsGround/search – dostupnost
  };
}

export const SPORTS_GROUNDS = [
  sportsGround({
    id: 'sg-lipa-1',
    name: 'Tenisový kurt č. 1',
    sportCode: 'tennis',
    sportName: 'Tenis',
    surface: 'antuka',
    coverType: 'outdoor',
    venue: VENUE_LIPA,
    regularPrice: 300,
    peakPrice: 450,
    rating: { average: 4.2, count: 12 },
    freeDayOffsets: [0, 1, 2, 4, 5, 6]
  }),
  sportsGround({
    id: 'sg-lipa-2',
    name: 'Tenisový kurt č. 2',
    sportCode: 'tennis',
    sportName: 'Tenis',
    surface: 'antuka',
    coverType: 'outdoor',
    venue: VENUE_LIPA,
    regularPrice: 300,
    peakPrice: 450,
    rating: { average: 4.0, count: 9 },
    freeDayOffsets: [0, 1, 4, 6]
  }),
  sportsGround({
    id: 'sg-lipa-3',
    name: 'Tenisový kurt č. 3',
    sportCode: 'tennis',
    sportName: 'Tenis',
    surface: 'tvrdý povrch',
    coverType: 'outdoor',
    venue: VENUE_LIPA,
    regularPrice: 300,
    peakPrice: null,
    rating: { average: 3.6, count: 5 },
    freeDayOffsets: [0, 2, 5]
  }),
  sportsGround({
    id: 'sg-vinohrady-badminton',
    name: 'Badmintonová hala A',
    sportCode: 'badminton',
    sportName: 'Badminton',
    surface: 'taraflex',
    coverType: 'indoor',
    venue: VENUE_VINOHRADY,
    regularPrice: 250,
    peakPrice: 390,
    // Nejlevnější, ale hůř hodnocená – ať je na výsledcích vidět, že
    // řazení podle ceny a podle hodnocení dává jiné pořadí.
    rating: { average: 3.9, count: 31 },
    freeDayOffsets: [0, 1, 2, 3, 4, 5]
  }),
  sportsGround({
    id: 'sg-vinohrady-squash',
    name: 'Squashový kurt 1',
    sportCode: 'squash',
    sportName: 'Squash',
    surface: 'parkety',
    coverType: 'indoor',
    venue: VENUE_VINOHRADY,
    regularPrice: 180,
    peakPrice: null,
    rating: { average: 4.1, count: 7 },
    freeDayOffsets: [1, 2, 3, 4]
  }),
  sportsGround({
    id: 'sg-luzanky-tenis',
    name: 'Krytý kurt Lužánky',
    sportCode: 'tennis',
    sportName: 'Tenis',
    surface: 'koberec',
    coverType: 'indoor',
    venue: VENUE_LUZANKY,
    regularPrice: 420,
    peakPrice: 560,
    rating: { average: 4.4, count: 18 },
    freeDayOffsets: [0, 2, 3, 5]
  })
];

// Počet volných hodin a první volný čas – odvozené, ať nemusí být v datech
// vypsané pro každý den zvlášť. Stejný vstup dá vždy stejný výstup.
export function freeSlotsFor(sportsGroundId, dayOffset) {
  const index = SPORTS_GROUNDS.findIndex(item => item.id === sportsGroundId);
  const seed = index + dayOffset;
  return {
    freeSlotCount: (seed % 5) + 2,
    firstFreeFrom: `${8 + (seed % 6)}:00`
  };
}