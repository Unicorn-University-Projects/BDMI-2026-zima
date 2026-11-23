import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  generateSlots,
  getDayOfWeek,
  getFreeSlots,
  getPragueNow,
  parseHour,
} from "../src/utils/slots.js";
import { mapPriceList, parsePeakDays } from "../src/dao/sports-ground-dao.js";

const week = (openFrom, openTo, closedDays = []) =>
  Array.from({ length: 7 }, (unused, index) => ({
    dayOfWeek: index + 1,
    openFrom: closedDays.includes(index + 1) ? null : openFrom,
    openTo: closedDays.includes(index + 1) ? null : openTo,
    isClosed: closedDays.includes(index + 1),
  }));

const noPeak = { regularPrice: 300, hasPeak: false, peakPrice: null, peakDays: [], peakFrom: null, peakTo: null };
const weekdayPeak = {
  regularPrice: 350,
  hasPeak: true,
  peakPrice: 450,
  peakDays: [1, 2, 3, 4, 5],
  peakFrom: "17:00",
  peakTo: "21:00",
};

const MONDAY = "2026-11-23";
const SATURDAY = "2026-11-28";
const SUNDAY = "2026-11-29";

describe("Datum a čas", () => {
  test("den v týdnu: 1 = pondělí … 7 = neděle", () => {
    assert.equal(getDayOfWeek(MONDAY), 1);
    assert.equal(getDayOfWeek(SATURDAY), 6);
    assert.equal(getDayOfWeek(SUNDAY), 7);
  });

  test("přičtení dnů přes konec měsíce i roku", () => {
    assert.equal(addDays("2026-11-30", 1), "2026-12-01");
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
    assert.equal(addDays(MONDAY, 14), "2026-12-07");
  });

  test("pražský čas v zimě (+1) i v létě (+2), včetně přechodu přes půlnoc", () => {
    assert.deepEqual(getPragueNow(new Date("2026-11-23T09:30:00Z")), { date: "2026-11-23", hour: 10, minute: 30 });
    assert.deepEqual(getPragueNow(new Date("2026-11-23T23:30:00Z")), { date: "2026-11-24", hour: 0, minute: 30 });
    assert.deepEqual(getPragueNow(new Date("2026-07-01T22:15:00Z")), { date: "2026-07-02", hour: 0, minute: 15 });
  });

  test("hodina z textu HH:00 i z typu TIME HH:00:00", () => {
    assert.equal(parseHour("08:00"), 8);
    assert.equal(parseHour("17:00:00"), 17);
    assert.equal(parseHour(null), null);
  });
});

describe("generateSlots – otevírací doba", () => {
  test("8:00–22:00 dá 14 hodinových slotů, první začíná v openFrom, poslední končí v openTo", () => {
    const { isClosed, dayOfWeek, slotList } = generateSlots({ openingHours: week("08:00", "22:00"), priceList: noPeak, date: MONDAY });
    assert.equal(isClosed, false);
    assert.equal(dayOfWeek, 1);
    assert.equal(slotList.length, 14);
    assert.deepEqual(slotList[0], { startTime: "08:00", endTime: "09:00", price: 300, isPeak: false, status: "free" });
    assert.equal(slotList.at(-1).startTime, "21:00");
    assert.equal(slotList.at(-1).endTime, "22:00");
  });

  test("zavřený den nemá sloty", () => {
    const result = generateSlots({ openingHours: week("08:00", "22:00", [7]), priceList: noPeak, date: SUNDAY });
    assert.deepEqual(result, { dayOfWeek: 7, isClosed: true, slotList: [] });
  });

  test("bez ceníku (neaktivní sportoviště) nejsou sloty", () => {
    const result = generateSlots({ openingHours: week("08:00", "22:00"), priceList: null, date: MONDAY });
    assert.equal(result.isClosed, true);
    assert.deepEqual(result.slotList, []);
  });

  test("bez otevírací doby (prázdné pole) je zavřeno", () => {
    assert.equal(generateSlots({ openingHours: [], priceList: noPeak, date: MONDAY }).isClosed, true);
  });

  test("časy ze sloupce TIME (08:00:00) fungují stejně", () => {
    const { slotList } = generateSlots({ openingHours: week("08:00:00", "10:00:00"), priceList: noPeak, date: MONDAY });
    assert.deepEqual(slotList.map((slot) => slot.startTime), ["08:00", "09:00"]);
  });
});

describe("generateSlots – špička", () => {
  test("ve špičce je slot, když peakFrom <= začátek < peakTo", () => {
    const { slotList } = generateSlots({ openingHours: week("07:00", "22:00"), priceList: weekdayPeak, date: MONDAY });
    const peak = slotList.filter((slot) => slot.isPeak).map((slot) => slot.startTime);
    assert.deepEqual(peak, ["17:00", "18:00", "19:00", "20:00"]);
    assert.equal(slotList.find((slot) => slot.startTime === "16:00").price, 350);
    assert.equal(slotList.find((slot) => slot.startTime === "17:00").price, 450);
    assert.equal(slotList.find((slot) => slot.startTime === "21:00").price, 350);
  });

  test("mimo dny špičky platí běžná cena", () => {
    const { slotList } = generateSlots({ openingHours: week("08:00", "20:00"), priceList: weekdayPeak, date: SATURDAY });
    assert.ok(slotList.every((slot) => !slot.isPeak && slot.price === 350));
  });

  test("ceny jsou čísla i když je DB vrátí jako text (DECIMAL)", () => {
    const priceList = { ...weekdayPeak, regularPrice: "350.00", peakPrice: "450.00" };
    const { slotList } = generateSlots({ openingHours: week("16:00", "18:00"), priceList, date: MONDAY });
    assert.deepEqual(slotList.map((slot) => slot.price), [350, 450]);
  });
});

describe("generateSlots – obsazenost a minulost", () => {
  test("slot s aktivní rezervací je obsazený (začátek i ve formátu TIME)", () => {
    const { slotList } = generateSlots({
      openingHours: week("08:00", "12:00"),
      priceList: noPeak,
      date: MONDAY,
      occupiedStartTimes: ["09:00", "11:00:00"],
    });
    assert.deepEqual(slotList.map((slot) => slot.status), ["free", "occupied", "free", "occupied"]);
  });

  test("dnes jsou sloty, které už začaly, v minulosti", () => {
    const now = { date: MONDAY, hour: 10, minute: 30 };
    const { slotList } = generateSlots({ openingHours: week("08:00", "13:00"), priceList: noPeak, date: MONDAY, now });
    assert.deepEqual(slotList.map((slot) => slot.status), ["past", "past", "past", "free", "free"]);
  });

  test("slot začínající přesně teď už rezervovat nejde", () => {
    const now = { date: MONDAY, hour: 9, minute: 0 };
    const { slotList } = generateSlots({ openingHours: week("08:00", "11:00"), priceList: noPeak, date: MONDAY, now });
    assert.deepEqual(slotList.map((slot) => slot.status), ["past", "past", "free"]);
  });

  test("budoucí den nemá žádný slot v minulosti", () => {
    const now = { date: MONDAY, hour: 23, minute: 0 };
    const { slotList } = generateSlots({ openingHours: week("08:00", "10:00"), priceList: noPeak, date: addDays(MONDAY, 1), now });
    assert.ok(slotList.every((slot) => slot.status === "free"));
  });

  test("obsazený slot zůstane obsazený i když už začal", () => {
    const now = { date: MONDAY, hour: 12, minute: 0 };
    const { slotList } = generateSlots({
      openingHours: week("08:00", "10:00"),
      priceList: noPeak,
      date: MONDAY,
      occupiedStartTimes: ["08:00"],
      now,
    });
    assert.deepEqual(slotList.map((slot) => slot.status), ["occupied", "past"]);
  });

  test("getFreeSlots vrátí jen volné sloty", () => {
    const now = { date: MONDAY, hour: 8, minute: 10 };
    const { slotList } = generateSlots({
      openingHours: week("08:00", "12:00"),
      priceList: noPeak,
      date: MONDAY,
      occupiedStartTimes: ["10:00"],
      now,
    });
    assert.deepEqual(getFreeSlots(slotList).map((slot) => slot.startTime), ["09:00", "11:00"]);
  });
});

describe("Ceník z databáze (nové i starší schéma)", () => {
  test("nové schéma: špička v price_lists, peakDays jako JSON text", () => {
    const priceList = mapPriceList({
      regularPrice: "350.00",
      peakPrice: "450.00",
      hasPeak: 1,
      peakDays: "[1,2,3,4,5]",
      peakFrom: "17:00",
      peakTo: "21:00",
    });
    assert.deepEqual(priceList, weekdayPeak);
  });

  test("starší schéma: čas špičky u otevírací doby (opening_hours.peakFrom/peakTo)", () => {
    const hours = [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
      dayOfWeek,
      peakFrom: dayOfWeek <= 5 ? "17:00:00" : null,
      peakTo: dayOfWeek <= 5 ? "21:00:00" : null,
    }));
    const priceList = mapPriceList({ regularPrice: "350.00", peakPrice: "450.00" }, hours);
    assert.equal(priceList.hasPeak, true);
    assert.deepEqual(priceList.peakDays, [1, 2, 3, 4, 5]);
    const { slotList } = generateSlots({ openingHours: week("16:00", "18:00"), priceList, date: MONDAY });
    assert.deepEqual(slotList.map((slot) => slot.price), [350, 450]);
  });

  test("bez ceny ve špičce špička neplatí", () => {
    const priceList = mapPriceList({ regularPrice: "300.00", peakPrice: null, hasPeak: 0, peakDays: "[]" });
    assert.deepEqual(priceList, noPeak);
  });

  test("bez řádku ceníku vrací null", () => {
    assert.equal(mapPriceList(null), null);
  });

  test("peakDays z JSON, z textu s čárkami i z pole", () => {
    assert.deepEqual(parsePeakDays("[1,2]"), [1, 2]);
    assert.deepEqual(parsePeakDays("3, 4"), [3, 4]);
    assert.deepEqual(parsePeakDays([5, 9]), [5]);
    assert.deepEqual(parsePeakDays(null), []);
  });
});
