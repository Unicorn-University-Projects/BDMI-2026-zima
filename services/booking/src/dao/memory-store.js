// Data v paměti pro režim BOOKING_MEMORY_DB=1 (testy a lokální běh bez MySQL).
// Tvar odpovídá řádkům z databáze, které čtou DAO v této složce.
// Výchozí data odpovídají modelové situaci (Sport Park Lípa, Tenis Centrum Hradisko).

function createSeed() {
  const venues = [
    {
      id: "c0000000-0000-4000-8000-000000000001",
      operatorId: "a0000000-0000-4000-8000-000000000001",
      name: "Sport Park Lípa",
      street: "Lipová 12",
      city: "Olomouc",
    },
    {
      id: "c0000000-0000-4000-8000-000000000002",
      operatorId: "a0000000-0000-4000-8000-000000000002",
      name: "Tenis Centrum Hradisko",
      street: "Hradisko 15",
      city: "Olomouc-Hradisko",
    },
    {
      id: "c0000000-0000-4000-8000-000000000003",
      operatorId: "a0000000-0000-4000-8000-000000000002",
      name: "Sportovní hala Žižkov",
      street: "Koněvova 1",
      city: "Praha 3",
    },
  ];

  const sports = [
    { id: "b0000000-0000-4000-8000-000000000001", code: "tennis", name: "Tenis" },
    { id: "b0000000-0000-4000-8000-000000000002", code: "badminton", name: "Badminton" },
    { id: "b0000000-0000-4000-8000-000000000003", code: "squash", name: "Squash" },
    { id: "b0000000-0000-4000-8000-000000000004", code: "volleyball", name: "Volejbal" },
    { id: "b0000000-0000-4000-8000-000000000005", code: "table_tennis", name: "Stolní tenis" },
  ];

  const ground = (id, venueId, sportId, name, surface, coverType, status = "active") => ({
    id: `d0000000-0000-4000-8000-00000000000${id}`,
    venueId,
    sportId,
    name,
    surface,
    coverType,
    status,
  });
  const lipa = venues[0].id;
  const hradisko = venues[1].id;
  const zizkov = venues[2].id;
  const tennis = sports[0].id;
  const badminton = sports[1].id;
  const squash = sports[2].id;

  const sportsGrounds = [
    ground(1, lipa, tennis, "Tenisový kurt č. 1", "antuka", "outdoor"),
    ground(2, lipa, tennis, "Tenisový kurt č. 2", "antuka", "outdoor"),
    ground(3, lipa, tennis, "Tenisový kurt č. 3", "antuka", "outdoor"),
    ground(4, lipa, badminton, "Badmintonová hala", "palubovka", "indoor"),
    ground(5, hradisko, tennis, "Tenisový kurt A", "antuka", "outdoor"),
    ground(6, hradisko, tennis, "Tenisový kurt B (hala)", "umělý povrch", "indoor"),
    ground(7, hradisko, squash, "Squashový kurt", "parkety", "indoor", "inactive"),
    ground(8, zizkov, badminton, "Badmintonový kurt 1", "palubovka", "indoor"),
  ];

  const week = (openFrom, openTo, closedDays = [], weekend = null) =>
    Array.from({ length: 7 }, (unused, index) => {
      const dayOfWeek = index + 1;
      if (closedDays.includes(dayOfWeek)) {
        return { dayOfWeek, openFrom: null, openTo: null, isClosed: true };
      }
      const hours = dayOfWeek >= 6 && weekend ? weekend : { openFrom, openTo };
      return { dayOfWeek, ...hours, isClosed: false };
    });

  const openingHours = new Map([
    [sportsGrounds[0].id, week("08:00", "22:00")],
    [sportsGrounds[1].id, week("08:00", "22:00")],
    [sportsGrounds[2].id, week("08:00", "22:00")],
    [sportsGrounds[3].id, week("14:00", "22:00", [], { openFrom: "09:00", openTo: "20:00" })],
    [sportsGrounds[4].id, week("07:00", "22:00", [7], { openFrom: "08:00", openTo: "20:00" })],
    [sportsGrounds[5].id, week("07:00", "22:00", [], { openFrom: "08:00", openTo: "20:00" })],
    [sportsGrounds[7].id, week("16:00", "21:00")],
  ]);

  const noPeak = (regularPrice) => ({
    regularPrice,
    hasPeak: false,
    peakPrice: null,
    peakDays: [],
    peakFrom: null,
    peakTo: null,
  });
  const weekdayPeak = (regularPrice, peakPrice) => ({
    regularPrice,
    hasPeak: true,
    peakPrice,
    peakDays: [1, 2, 3, 4, 5],
    peakFrom: "17:00",
    peakTo: "21:00",
  });

  const priceLists = new Map([
    [sportsGrounds[0].id, noPeak(300)],
    [sportsGrounds[1].id, noPeak(300)],
    [sportsGrounds[2].id, noPeak(300)],
    [sportsGrounds[3].id, noPeak(250)],
    [sportsGrounds[4].id, weekdayPeak(350, 450)],
    [sportsGrounds[5].id, weekdayPeak(400, 500)],
    [sportsGrounds[7].id, noPeak(200)],
  ]);

  // Rezervace podle id: { id, sportsGroundId, athleteId, date, startTime, price, state, ... }
  const reservations = new Map();

  // Hodnocení: { sportsGroundId, stars }
  const ratings = [
    { sportsGroundId: sportsGrounds[1].id, stars: 4 },
    { sportsGroundId: sportsGrounds[1].id, stars: 5 },
    { sportsGroundId: sportsGrounds[4].id, stars: 3 },
  ];

  return { venues, sports, sportsGrounds, openingHours, priceLists, reservations, ratings };
}

const state = createSeed();

function reset() {
  Object.assign(state, createSeed());
}

export default { state, reset };
