import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

delete process.env.BOOKING_MEMORY_DB;

const { default: pool } = await import("../src/db.js");
const { default: reservationDao, SlotTakenError } = await import("../src/dao/reservation-dao.js");
const { default: sportsGroundDao } = await import("../src/dao/sports-ground-dao.js");
const { default: createAbl } = await import("../src/abl/reservation/create-abl.js");
const { isSlotInPast } = await import("../src/utils/slot.js");

const athleteId = "a0000000-0000-4000-8000-000000000001";
const slot = {
  sportsGroundId: "d0000000-0000-4000-8000-000000000100",
  date: "2099-06-05",
  startTime: "18:00",
};

const activeSportsGround = {
  id: slot.sportsGroundId,
  status: "active",
  priceList: { basePrice: 300, regularPrice: 300, hasPeak: false, peakDays: [] },
  openingHours: [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
    dayOfWeek,
    openFrom: "08:00",
    openTo: "22:00",
    isClosed: false,
  })),
};

const originalExecute = pool.execute;

after(async () => {
  pool.execute = originalExecute;
  await pool.end();
});

function mysqlError(code, errno, sqlMessage) {
  return Object.assign(new Error(sqlMessage), { code, errno, sqlMessage });
}

const activeSlotDuplicate = mysqlError(
  "ER_DUP_ENTRY",
  1062,
  "Duplicate entry 'd0000000-0000-4000-8000-000000000100-2099-06-05-18:00:00-1' for key 'reservations.uq_reservations_active_slot'",
);

function failInsertWith(error) {
  pool.execute = async (sql) => {
    if (sql.trim().startsWith("INSERT INTO reservations")) throw error;
    throw new Error(`Unexpected query: ${sql}`);
  };
}

function newReservation() {
  return { ...slot, id: randomUUID(), athleteId, price: 300, note: null };
}

function mockAvailableSlot(t) {
  t.mock.method(sportsGroundDao, "get", async () => activeSportsGround);
  t.mock.method(reservationDao, "getActiveBySlot", async () => null);
}

async function callCreate(body) {
  const headers = { "x-user-id": athleteId, "x-user-role": "athlete" };
  const req = { body, get: (name) => headers[name.toLowerCase()] };
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  await createAbl(req, res);
  return res;
}

test("create turns a MySQL duplicate on the active slot index into SlotTakenError", async () => {
  failInsertWith(activeSlotDuplicate);

  await assert.rejects(reservationDao.create(newReservation()), (error) => {
    assert.ok(error instanceof SlotTakenError);
    assert.deepEqual(error.slot, slot);
    return true;
  });
});

test("create rethrows other database errors unchanged", async () => {
  const primaryDuplicate = mysqlError(
    "ER_DUP_ENTRY",
    1062,
    "Duplicate entry 'x' for key 'reservations.PRIMARY'",
  );
  failInsertWith(primaryDuplicate);
  await assert.rejects(reservationDao.create(newReservation()), (error) => error === primaryDuplicate);

  const connectionRefused = Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });
  failInsertWith(connectionRefused);
  await assert.rejects(reservationDao.create(newReservation()), (error) => error === connectionRefused);
});

test("reservation/create answers 409 when another request books the slot after the availability check", async (t) => {
  mockAvailableSlot(t);
  failInsertWith(activeSlotDuplicate);

  const res = await callCreate({ ...slot });

  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.body, {
    code: "reservation/create/slotUnavailable",
    message: "Tento termín už není volný.",
    params: slot,
  });
});

test("reservation/create still answers 500 for unrelated database failures", async (t) => {
  mockAvailableSlot(t);
  t.mock.method(console, "error", () => {});
  failInsertWith(Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }));

  const res = await callCreate({ ...slot });

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.code, "reservation/create/failed");
});

test("reservation/create rejects a slot that has already started in Prague", async (t) => {
  mockAvailableSlot(t);
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-24T17:30:00Z") });

  const res = await callCreate({ sportsGroundId: slot.sportsGroundId, date: "2026-11-24", startTime: "18:00" });

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, "reservation/create/slotInPast");
});

test("isSlotInPast compares the slot with the current time in Prague", () => {
  const winterEvening = new Date("2026-11-24T17:30:00Z");
  assert.equal(isSlotInPast("2026-11-24", "18:00", winterEvening), true);
  assert.equal(isSlotInPast("2026-11-24", "19:00", winterEvening), false);

  const winterSlotStart = new Date("2026-11-24T17:00:00Z");
  assert.equal(isSlotInPast("2026-11-24", "18:00", winterSlotStart), true);

  const summerEvening = new Date("2026-07-01T16:30:00Z");
  assert.equal(isSlotInPast("2026-07-01", "18:00", summerEvening), true);
  assert.equal(isSlotInPast("2026-07-01", "19:00", summerEvening), false);

  const afterMidnight = new Date("2026-11-24T23:30:00Z");
  assert.equal(isSlotInPast("2026-11-24", "23:00", afterMidnight), true);
  assert.equal(isSlotInPast("2026-11-25", "00:00", afterMidnight), true);
  assert.equal(isSlotInPast("2026-11-25", "01:00", afterMidnight), false);
});
