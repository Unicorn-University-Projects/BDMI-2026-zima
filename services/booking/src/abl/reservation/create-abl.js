import crypto from "node:crypto";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import reservationDao, { SlotTakenError } from "../../dao/reservation-dao.js";
import sportsGroundDao from "../../dao/sports-ground-dao.js";
import {
  addOneHour,
  dayOfWeekFromDate,
  isSlotInPast,
  isWithinOpeningHours,
  resolveSlotPrice,
} from "../../utils/slot.js";
import { invalidDtoIn, normalizeText, trimDtoIn } from "../../utils/validation.js";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schema = {
  type: "object",
  properties: {
    sportsGroundId: { type: "string", format: "uuid" },
    date: { type: "string", format: "date" },
    startTime: { type: "string", pattern: "^([01]\\d|2[0-3]):00$" },
    note: { type: "string", maxLength: 200 },
  },
  required: ["sportsGroundId", "date", "startTime"],
  additionalProperties: true,
};

const validate = ajv.compile(schema);

function slotUnavailableError({ sportsGroundId, date, startTime }) {
  return {
    code: "reservation/create/slotUnavailable",
    message: "Tento termín už není volný.",
    params: { sportsGroundId, date, startTime },
  };
}

async function createAbl(req, res) {
  try {
    const athleteId = req.get("X-User-Id");
    if (!athleteId) {
      return res.status(401).json({
        code: "user/unauthenticated",
        message: "Uživatel není přihlášený.",
        params: {},
      });
    }

    const role = req.get("X-User-Role");
    if (role !== "athlete") {
      return res.status(403).json({
        code: "user/forbidden",
        message: "Akce je dostupná pouze pro sportovce.",
        params: { role },
      });
    }

    const dtoIn = trimDtoIn(req.body ?? {});
    if (!validate(dtoIn)) {
      return res.status(400).json(invalidDtoIn(validate.errors));
    }

    const unsupportedKeyList = Object.keys(dtoIn).filter((key) => !(key in schema.properties));
    const note =
      dtoIn.note == null || dtoIn.note === "" ? null : normalizeText(dtoIn.note);
    if (note != null && note.length > 200) {
      return res.status(400).json({
        code: "reservation/invalidDtoIn",
        message: "Vstupní data nejsou validní.",
        params: { invalidFields: ["note"] },
      });
    }

    const sportsGround = await sportsGroundDao.get(dtoIn.sportsGroundId, {
      userId: athleteId,
      role,
    });
    if (
      !sportsGround ||
      sportsGround.status !== "active" ||
      !sportsGround.priceList ||
      !Array.isArray(sportsGround.openingHours) ||
      sportsGround.openingHours.length === 0
    ) {
      return res.status(404).json({
        code: "reservation/create/sportsGroundNotAvailable",
        message: "Sportoviště neexistuje nebo není aktivní.",
        params: { sportsGroundId: dtoIn.sportsGroundId },
      });
    }

    if (isSlotInPast(dtoIn.date, dtoIn.startTime)) {
      return res.status(400).json({
        code: "reservation/create/slotInPast",
        message: "Nelze rezervovat termín v minulosti.",
        params: { date: dtoIn.date, startTime: dtoIn.startTime },
      });
    }

    const dayOfWeek = dayOfWeekFromDate(dtoIn.date);
    const dayHours = sportsGround.openingHours.find(
      (day) => Number(day.dayOfWeek) === dayOfWeek,
    );
    if (!isWithinOpeningHours(dayHours, dtoIn.startTime)) {
      return res.status(400).json({
        code: "reservation/create/outsideOpeningHours",
        message: "Zvolený termín je mimo otevírací dobu sportoviště.",
        params: { date: dtoIn.date, startTime: dtoIn.startTime, dayOfWeek },
      });
    }

    const existing = await reservationDao.getActiveBySlot(
      dtoIn.sportsGroundId,
      dtoIn.date,
      dtoIn.startTime,
    );
    if (existing) {
      return res.status(409).json(slotUnavailableError(dtoIn));
    }

    const { price, isPeak } = resolveSlotPrice(
      sportsGround.priceList,
      dayOfWeek,
      dtoIn.startTime,
    );

    const reservation = await reservationDao.create({
      id: crypto.randomUUID(),
      sportsGroundId: dtoIn.sportsGroundId,
      athleteId,
      date: dtoIn.date,
      startTime: dtoIn.startTime,
      price,
      note,
    });

    const dtoOut = {
      reservation: {
        ...reservation,
        endTime: addOneHour(reservation.startTime),
        isPeak,
      },
    };
    if (unsupportedKeyList.length > 0) {
      dtoOut.warnings = [
        {
          code: "reservation/create/unsupportedKeys",
          message: "Vstup obsahuje nepodporované klíče.",
          params: { unsupportedKeyList },
        },
      ];
    }
    return res.status(201).json(dtoOut);
  } catch (e) {
    if (e instanceof SlotTakenError) {
      return res.status(409).json(slotUnavailableError(e.slot));
    }
    console.error(e);
    return res.status(500).json({
      code: "reservation/create/failed",
      message: "Vytvoření rezervace se nezdařilo.",
      params: {},
    });
  }
}

export default createAbl;
