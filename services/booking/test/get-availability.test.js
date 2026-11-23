// sportsGround/getAvailability – volné a obsazené sloty sportoviště pro den.
import { describe, test, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GROUND, OPERATOR, TODAY, startBooking } from "./helpers.js";

const booking = await startBooking();
after(() => booking.close());
beforeEach(() => booking.reset());

const path = (sportsGroundId, date) => `/sportsGround/getAvailability?sportsGroundId=${sportsGroundId}&date=${date}`;

describe("Přístup a vstupy", () => {
  test("bez hlavičky od gateway → 403", async () => {
    const res = await booking.call(path(GROUND.lipaCourt2, TODAY), { gatewaySecret: null });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, "user/forbidden");
  });

  test("bez přihlášeného uživatele → 401", async () => {
    const res = await booking.call(path(GROUND.lipaCourt2, TODAY), { headers: {} });
    assert.equal(res.status, 401);
    assert.equal(res.body.code, "user/unauthenticated");
  });

  test("neznámá role → 403", async () => {
    const res = await booking.call(path(GROUND.lipaCourt2, TODAY), {
      headers: { "X-User-Id": "u1", "X-User-Role": "admin" },
    });
    assert.equal(res.status, 403);
  });

  const invalid = [
    ["chybí sportoviště", `/sportsGround/getAvailability?date=${TODAY}`, ["sportsGroundId"]],
    ["chybí datum", `/sportsGround/getAvailability?sportsGroundId=${GROUND.lipaCourt2}`, ["date"]],
    ["sportoviště není UUID", path("kurt-2", TODAY), ["sportsGroundId"]],
    ["datum v jiném formátu", path(GROUND.lipaCourt2, "23.11.2026"), ["date"]],
    ["neexistující den", path(GROUND.lipaCourt2, "2026-02-30"), ["date"]],
  ];
  for (const [name, url, fields] of invalid) {
    test(`${name} → 400`, async () => {
      const res = await booking.call(url);
      assert.equal(res.status, 400);
      assert.equal(res.body.code, "sportsGround/invalidDtoIn");
      assert.deepEqual(res.body.params.invalidFields, fields);
    });
  }

  test("datum v minulosti → 400", async () => {
    const res = await booking.call(path(GROUND.lipaCourt2, "2026-11-22"));
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "sportsGround/dateInPast");
    assert.equal(res.body.params.today, TODAY);
  });

  test("neexistující sportoviště → 404", async () => {
    const res = await booking.call(path("d0000000-0000-4000-8000-000000000099", TODAY));
    assert.equal(res.status, 404);
    assert.equal(res.body.code, "sportsGround/notFound");
  });

  test("neaktivní sportoviště sportovec nevidí → 404", async () => {
    const res = await booking.call(path(GROUND.hradiskoSquashInactive, TODAY));
    assert.equal(res.status, 404);
  });

  test("neaktivní sportoviště provozovatel vidí, ale bez slotů", async () => {
    const res = await booking.call(path(GROUND.hradiskoSquashInactive, TODAY), { headers: OPERATOR });
    assert.equal(res.status, 200);
    assert.equal(res.body.sportsGround.status, "inactive");
    assert.equal(res.body.isClosed, true);
    assert.deepEqual(res.body.slotList, []);
  });
});

describe("Sloty", () => {
  test("dnes v 10:30: sloty 8–10 jsou v minulosti, od 11:00 volné", async () => {
    const res = await booking.call(path(GROUND.lipaCourt2, TODAY));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.sportsGround, {
      id: GROUND.lipaCourt2,
      name: "Tenisový kurt č. 2",
      venueId: "c0000000-0000-4000-8000-000000000001",
      status: "active",
    });
    assert.equal(res.body.date, TODAY);
    assert.equal(res.body.dayOfWeek, 1);
    assert.equal(res.body.isClosed, false);
    assert.equal(res.body.slotList.length, 14);
    assert.deepEqual(
      res.body.slotList.slice(0, 4).map((slot) => [slot.startTime, slot.status]),
      [["08:00", "past"], ["09:00", "past"], ["10:00", "past"], ["11:00", "free"]],
    );
    assert.deepEqual(res.body.slotList[3], { startTime: "11:00", endTime: "12:00", price: 300, isPeak: false, status: "free" });
  });

  test("vytvořená i potvrzená rezervace slot obsadí, zrušená a proběhlá ne", async () => {
    booking.reserve(GROUND.lipaCourt2, "2026-11-25", ["17:00"], "created");
    booking.reserve(GROUND.lipaCourt2, "2026-11-25", ["18:00"], "confirmed");
    booking.reserve(GROUND.lipaCourt2, "2026-11-25", ["19:00"], "cancelled");
    booking.reserve(GROUND.lipaCourt1, "2026-11-25", ["20:00"], "created"); // jiné sportoviště
    booking.reserve(GROUND.lipaCourt2, "2026-11-26", ["20:00"], "created"); // jiný den

    const res = await booking.call(path(GROUND.lipaCourt2, "2026-11-25"));
    const status = Object.fromEntries(res.body.slotList.map((slot) => [slot.startTime, slot.status]));
    assert.equal(status["17:00"], "occupied");
    assert.equal(status["18:00"], "occupied");
    assert.equal(status["19:00"], "free");
    assert.equal(status["20:00"], "free");
    assert.equal(res.body.slotList.filter((slot) => slot.status === "occupied").length, 2);
  });

  test("cena ve špičce po–pá 17–21 (Hradisko kurt A, pondělí 30. 11.)", async () => {
    const res = await booking.call(path(GROUND.hradiskoA, "2026-11-30"));
    const peak = res.body.slotList.filter((slot) => slot.isPeak);
    assert.deepEqual(peak.map((slot) => slot.startTime), ["17:00", "18:00", "19:00", "20:00"]);
    assert.ok(peak.every((slot) => slot.price === 450));
    assert.equal(res.body.slotList.find((slot) => slot.startTime === "07:00").price, 350);
  });

  test("o víkendu jiná otevírací doba a bez špičky (hala, sobota 28. 11.)", async () => {
    const res = await booking.call(path(GROUND.lipaHall, "2026-11-28"));
    assert.equal(res.body.slotList[0].startTime, "09:00");
    assert.equal(res.body.slotList.at(-1).endTime, "20:00");
    assert.ok(res.body.slotList.every((slot) => !slot.isPeak));
  });

  test("zavřeno v neděli (Hradisko kurt A, 29. 11.)", async () => {
    const res = await booking.call(path(GROUND.hradiskoA, "2026-11-29"));
    assert.equal(res.status, 200);
    assert.equal(res.body.dayOfWeek, 7);
    assert.equal(res.body.isClosed, true);
    assert.deepEqual(res.body.slotList, []);
  });

  test("provozovatel vidí stejné sloty jako sportovec", async () => {
    booking.reserve(GROUND.lipaCourt2, "2026-11-25", ["17:00"]);
    const athlete = await booking.call(path(GROUND.lipaCourt2, "2026-11-25"));
    const operator = await booking.call(path(GROUND.lipaCourt2, "2026-11-25"), { headers: OPERATOR });
    assert.deepEqual(operator.body.slotList, athlete.body.slotList);
  });
});
