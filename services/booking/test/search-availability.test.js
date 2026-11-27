import { describe, test, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GROUND, TODAY, hours, startBooking } from "./helpers.js";

const booking = await startBooking();
after(() => booking.close());
beforeEach(() => booking.reset());

const TUESDAY = "2026-11-24";
const SUNDAY = "2026-11-29";
const PEAK_MONDAY = "2026-11-30";
const TENNIS_OLOMOUC = [GROUND.lipaCourt1, GROUND.lipaCourt2, GROUND.lipaCourt3, GROUND.hradiskoA, GROUND.hradiskoB];

const search = (date) =>
  booking.call(`/sportsGround/search?${new URLSearchParams({ sportCode: "tennis", city: "Olomouc", date })}`);

const getAvailability = (sportsGroundId, date) =>
  booking.call(`/sportsGround/getAvailability?${new URLSearchParams({ sportsGroundId, date })}`);

async function freeSlotsOf(sportsGroundId, date) {
  const res = await getAvailability(sportsGroundId, date);
  assert.equal(res.status, 200);
  return res.body.slotList.filter((slot) => slot.status === "free");
}

async function assertSearchMatchesAvailability(date) {
  const res = await search(date);
  assert.equal(res.status, 200);
  const found = new Map(res.body.itemList.map((item) => [item.sportsGround.id, item]));

  for (const sportsGroundId of TENNIS_OLOMOUC) {
    const freeSlots = await freeSlotsOf(sportsGroundId, date);
    const item = found.get(sportsGroundId);
    if (freeSlots.length === 0) {
      assert.equal(item, undefined, `${sportsGroundId} nemá volný slot, ale ve vyhledávání je`);
      continue;
    }
    assert.ok(item, `${sportsGroundId} má volné sloty, ale ve vyhledávání chybí`);
    assert.equal(item.freeSlotCount, freeSlots.length);
    assert.equal(item.priceFrom, Math.min(...freeSlots.map((slot) => slot.price)));
  }
  return res.body;
}

describe("Vyhledávání odpovídá dostupnosti slotů", () => {
  test("bez rezervací", async () => {
    await assertSearchMatchesAvailability(TUESDAY);
  });

  test("dnes po začátku některých slotů", async () => {
    await assertSearchMatchesAvailability(TODAY);
  });

  test("s rezervacemi ve všech stavech", async () => {
    booking.reserve(GROUND.lipaCourt1, TUESDAY, hours(8, 12), "created");
    booking.reserve(GROUND.lipaCourt1, TUESDAY, hours(12, 14), "confirmed");
    booking.reserve(GROUND.lipaCourt2, TUESDAY, hours(8, 22), "cancelled");
    booking.reserve(GROUND.hradiskoA, TUESDAY, hours(17, 21), "confirmed");
    booking.reserve(GROUND.hradiskoB, TUESDAY, hours(7, 22), "created");
    await assertSearchMatchesAvailability(TUESDAY);
  });

  test("ve špičce, když jsou levné sloty obsazené", async () => {
    booking.reserve(GROUND.hradiskoA, PEAK_MONDAY, [...hours(7, 17), "21:00"], "confirmed");
    const body = await assertSearchMatchesAvailability(PEAK_MONDAY);
    const hradiskoA = body.itemList.find((item) => item.sportsGround.id === GROUND.hradiskoA);
    assert.equal(hradiskoA.freeSlotCount, 4);
    assert.equal(hradiskoA.priceFrom, 450);
  });
});

describe("Změna rezervací se projeví v obou hned", () => {
  test("nová rezervace ubere slot ve vyhledávání i v kalendáři", async () => {
    const before = await search(TUESDAY);
    const countBefore = before.body.itemList.find((item) => item.sportsGround.id === GROUND.lipaCourt2).freeSlotCount;

    booking.reserve(GROUND.lipaCourt2, TUESDAY, ["18:00"]);

    const after = await search(TUESDAY);
    const court2 = after.body.itemList.find((item) => item.sportsGround.id === GROUND.lipaCourt2);
    assert.equal(court2.freeSlotCount, countBefore - 1);

    const slot = (await getAvailability(GROUND.lipaCourt2, TUESDAY)).body.slotList.find(
      (item) => item.startTime === "18:00",
    );
    assert.equal(slot.status, "occupied");
    await assertSearchMatchesAvailability(TUESDAY);
  });

  test("obsazením posledního volného slotu sportoviště z vyhledávání zmizí", async () => {
    booking.reserve(GROUND.lipaCourt3, TUESDAY, hours(8, 21));
    let res = await search(TUESDAY);
    let court3 = res.body.itemList.find((item) => item.sportsGround.id === GROUND.lipaCourt3);
    assert.equal(court3.freeSlotCount, 1);
    assert.equal(court3.priceFrom, 300);

    booking.reserve(GROUND.lipaCourt3, TUESDAY, ["21:00"]);
    res = await search(TUESDAY);
    court3 = res.body.itemList.find((item) => item.sportsGround.id === GROUND.lipaCourt3);
    assert.equal(court3, undefined);
    assert.deepEqual(await freeSlotsOf(GROUND.lipaCourt3, TUESDAY), []);
  });

  test("zrušení rezervace vrátí slot do vyhledávání i do kalendáře", async () => {
    booking.reserve(GROUND.lipaCourt3, TUESDAY, hours(8, 22));
    assert.equal((await search(TUESDAY)).body.itemList.some((item) => item.sportsGround.id === GROUND.lipaCourt3), false);

    const reservation = [...booking.memoryStore.state.reservations.values()].find(
      (item) => item.sportsGroundId === GROUND.lipaCourt3 && item.startTime === "19:00",
    );
    reservation.state = "cancelled";

    const court3 = (await search(TUESDAY)).body.itemList.find((item) => item.sportsGround.id === GROUND.lipaCourt3);
    assert.equal(court3.freeSlotCount, 1);
    assert.deepEqual(
      (await freeSlotsOf(GROUND.lipaCourt3, TUESDAY)).map((slot) => slot.startTime),
      ["19:00"],
    );
  });
});

describe("Nabídnutý náhradní den", () => {
  test("nejbližší volný den z vyhledávání má v kalendáři volný slot", async () => {
    booking.reserve(GROUND.lipaCourt1, SUNDAY, hours(8, 22));
    booking.reserve(GROUND.lipaCourt2, SUNDAY, hours(8, 22));
    booking.reserve(GROUND.lipaCourt3, SUNDAY, hours(8, 22));
    booking.reserve(GROUND.hradiskoB, SUNDAY, hours(8, 20));

    const res = await search(SUNDAY);
    assert.deepEqual(res.body.itemList, []);
    const nextDate = res.body.nextAvailableDate;
    assert.equal(nextDate, "2026-11-30");

    for (const sportsGroundId of TENNIS_OLOMOUC) {
      assert.deepEqual(await freeSlotsOf(sportsGroundId, SUNDAY), []);
    }
    const nextDay = await assertSearchMatchesAvailability(nextDate);
    assert.ok(nextDay.itemList.length > 0);
  });
});
