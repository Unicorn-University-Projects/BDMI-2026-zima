// sportsGround/search – sportoviště podle sportu, města a data s aspoň jedním volným slotem.
import { describe, test, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GROUND, OPERATOR, TODAY, hours, startBooking } from "./helpers.js";

const booking = await startBooking();
after(() => booking.close());
beforeEach(() => booking.reset());

const search = (query, options) => booking.call(`/sportsGround/search?${new URLSearchParams(query)}`, options);
const TUESDAY = "2026-11-24";
const SUNDAY = "2026-11-29";

describe("Přístup a vstupy", () => {
  test("bez hlavičky od gateway → 403", async () => {
    const res = await search({ sportCode: "tennis", city: "Olomouc", date: TUESDAY }, { gatewaySecret: null });
    assert.equal(res.status, 403);
  });

  test("bez přihlášeného uživatele → 401", async () => {
    const res = await search({ sportCode: "tennis", city: "Olomouc", date: TUESDAY }, { headers: {} });
    assert.equal(res.status, 401);
  });

  test("provozovatel vyhledávat nemůže → 403", async () => {
    const res = await search({ sportCode: "tennis", city: "Olomouc", date: TUESDAY }, { headers: OPERATOR });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, "user/forbidden");
  });

  const invalid = [
    ["chybí sport", { city: "Olomouc", date: TUESDAY }, ["sportCode"]],
    ["chybí město", { sportCode: "tennis", date: TUESDAY }, ["city"]],
    ["město jen z mezer", { sportCode: "tennis", city: "   ", date: TUESDAY }, ["city"]],
    ["chybí datum", { sportCode: "tennis", city: "Olomouc" }, ["date"]],
    ["neplatné datum", { sportCode: "tennis", city: "Olomouc", date: "2026-13-01" }, ["date"]],
    ["neznámý sport", { sportCode: "golf", city: "Olomouc", date: TUESDAY }, ["sportCode"]],
  ];
  for (const [name, query, fields] of invalid) {
    test(`${name} → 400`, async () => {
      const res = await search(query);
      assert.equal(res.status, 400);
      assert.equal(res.body.code, "sportsGround/invalidDtoIn");
      assert.deepEqual(res.body.params.invalidFields, fields);
    });
  }

  test("datum v minulosti → 400", async () => {
    const res = await search({ sportCode: "tennis", city: "Olomouc", date: "2026-11-01" });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "sportsGround/dateInPast");
  });
});

describe("Výsledky", () => {
  test("tenis v Olomouci: aktivní kurty obou areálů, seřazené podle areálu a názvu", async () => {
    const res = await search({ sportCode: "tennis", city: "Olomouc", date: TUESDAY });
    assert.equal(res.status, 200);
    assert.equal(res.body.date, TUESDAY);
    assert.equal(res.body.nextAvailableDate, null);
    assert.deepEqual(
      res.body.itemList.map((item) => `${item.venue.name} / ${item.sportsGround.name}`),
      [
        "Sport Park Lípa / Tenisový kurt č. 1",
        "Sport Park Lípa / Tenisový kurt č. 2",
        "Sport Park Lípa / Tenisový kurt č. 3",
        "Tenis Centrum Hradisko / Tenisový kurt A",
        "Tenis Centrum Hradisko / Tenisový kurt B (hala)",
      ],
    );
  });

  test("položka obsahuje areál, adresu, cenu od, počet volných slotů a hodnocení", async () => {
    const res = await search({ sportCode: "tennis", city: "Olomouc", date: TUESDAY });
    const court2 = res.body.itemList.find((item) => item.sportsGround.id === GROUND.lipaCourt2);
    assert.deepEqual(court2, {
      sportsGround: {
        id: GROUND.lipaCourt2,
        name: "Tenisový kurt č. 2",
        surface: "antuka",
        coverType: "outdoor",
        sport: { code: "tennis", name: "Tenis" },
      },
      venue: {
        id: "c0000000-0000-4000-8000-000000000001",
        name: "Sport Park Lípa",
        street: "Lipová 12",
        city: "Olomouc",
      },
      freeSlotCount: 14,
      priceFrom: 300,
      averageRating: 4.5,
      ratingCount: 2,
    });
    const court1 = res.body.itemList.find((item) => item.sportsGround.id === GROUND.lipaCourt1);
    assert.equal(court1.averageRating, null);
    assert.equal(court1.ratingCount, 0);
  });

  test("cena od = nejnižší cena z volných slotů (ve špičce obsazené mimo špičku)", async () => {
    // Hradisko A v úterý 7–22: běžná cena 350, špička 17–21 za 450. Obsadíme vše mimo špičku.
    booking.reserve(GROUND.hradiskoA, TUESDAY, [...hours(7, 17), "21:00"]);
    const res = await search({ sportCode: "tennis", city: "Olomouc", date: TUESDAY });
    const courtA = res.body.itemList.find((item) => item.sportsGround.id === GROUND.hradiskoA);
    assert.equal(courtA.freeSlotCount, 4);
    assert.equal(courtA.priceFrom, 450);
  });

  test("město: začátek názvu, bez ohledu na velikost písmen a diakritiku", async () => {
    for (const city of ["olomouc", "OLOM", "Olomóuc", "olomouc-hradisko"]) {
      const res = await search({ sportCode: "tennis", city, date: TUESDAY });
      assert.ok(res.body.itemList.length > 0, city);
    }
    const hradiskoOnly = await search({ sportCode: "tennis", city: "olomouc-h", date: TUESDAY });
    assert.ok(hradiskoOnly.body.itemList.every((item) => item.venue.name === "Tenis Centrum Hradisko"));
    const praha = await search({ sportCode: "badminton", city: "praha", date: TUESDAY });
    assert.deepEqual(praha.body.itemList.map((item) => item.venue.city), ["Praha 3"]);
  });

  test("město musí odpovídat od začátku – část uprostřed nestačí", async () => {
    const res = await search({ sportCode: "tennis", city: "mouc", date: TUESDAY });
    assert.deepEqual(res.body.itemList, []);
  });

  test("jen zvolený sport – badminton v Olomouci je jen hala v Lípě", async () => {
    const res = await search({ sportCode: "badminton", city: "Olomouc", date: TUESDAY });
    assert.deepEqual(res.body.itemList.map((item) => item.sportsGround.id), [GROUND.lipaHall]);
  });

  test("neaktivní sportoviště se nevyhledá (squash v Hradisku)", async () => {
    const res = await search({ sportCode: "squash", city: "Olomouc", date: TUESDAY });
    assert.deepEqual(res.body.itemList, []);
    assert.equal(res.body.nextAvailableDate, null);
  });

  test("plně obsazené sportoviště se nezobrazí", async () => {
    booking.reserve(GROUND.lipaCourt1, TUESDAY, hours(8, 22), "confirmed");
    const res = await search({ sportCode: "tennis", city: "Olomouc", date: TUESDAY });
    assert.equal(res.body.itemList.length, 4);
    assert.ok(!res.body.itemList.some((item) => item.sportsGround.id === GROUND.lipaCourt1));
  });

  test("dnes se počítají jen sloty, které ještě nezačaly (10:30 → od 11:00)", async () => {
    const res = await search({ sportCode: "tennis", city: "Olomouc", date: TODAY });
    const court1 = res.body.itemList.find((item) => item.sportsGround.id === GROUND.lipaCourt1);
    assert.equal(court1.freeSlotCount, 11);
  });
});

describe("Nejbližší volný den (US-01, A1)", () => {
  test("když je vše obsazené, nabídne nejbližší den s volným slotem", async () => {
    // Neděle 29. 11.: Hradisko A má zavřeno, ostatní kurty obsadíme celé.
    booking.reserve(GROUND.lipaCourt1, SUNDAY, hours(8, 22));
    booking.reserve(GROUND.lipaCourt2, SUNDAY, hours(8, 22));
    booking.reserve(GROUND.lipaCourt3, SUNDAY, hours(8, 22));
    booking.reserve(GROUND.hradiskoB, SUNDAY, hours(8, 20));
    const res = await search({ sportCode: "tennis", city: "Olomouc", date: SUNDAY });
    assert.deepEqual(res.body.itemList, []);
    assert.equal(res.body.nextAvailableDate, "2026-11-30");
  });

  test("pozdě večer už dnes nic není – nabídne zítřek", async () => {
    booking.clock.setNow("2026-11-23T21:30:00+01:00");
    const res = await search({ sportCode: "tennis", city: "Olomouc", date: TODAY });
    assert.deepEqual(res.body.itemList, []);
    assert.equal(res.body.nextAvailableDate, "2026-11-24");
  });

  test("když v okolí není žádné vhodné sportoviště, další den se nehledá", async () => {
    const res = await search({ sportCode: "tennis", city: "Brno", date: TUESDAY });
    assert.deepEqual(res.body, { date: TUESDAY, itemList: [], nextAvailableDate: null });
  });

  test("hledá se nejvýš 14 dní dopředu", async () => {
    // Hala v Praze obsazená celý týden 24. 11. – 8. 12. (15 dní) → bez návrhu.
    for (let day = 24; day <= 38; day += 1) {
      const date = new Date(Date.UTC(2026, 10, day)).toISOString().slice(0, 10);
      booking.reserve(GROUND.zizkovBadminton, date, hours(16, 21));
    }
    const res = await search({ sportCode: "badminton", city: "Praha", date: TUESDAY });
    assert.deepEqual(res.body.itemList, []);
    assert.equal(res.body.nextAvailableDate, null);
  });
});
