// sportsGround/search – vyhledá sportoviště podle sportu, města a data,
// která mají v daný den aspoň jeden volný slot (US-01).
import Ajv from "ajv";
import addFormats from "ajv-formats";
import venueDao from "../../dao/venue-dao.js";
import sportDao from "../../dao/sport-dao.js";
import sportsGroundDao from "../../dao/sports-ground-dao.js";
import ratingDao from "../../dao/rating-dao.js";
import clock from "../../utils/clock.js";
import availability from "../../utils/availability.js";
import { addDays, getPragueNow } from "../../utils/slots.js";
import {
  dateInPast,
  forbidden,
  sportsGroundInvalidDtoIn,
  trimDtoIn,
  unauthenticated,
} from "../../utils/validation.js";

// Když v daný den nic volného není, hledá se nejbližší den s volným slotem
// nejvýš tolik dní dopředu (US-01, alternativní tok A1).
export const NEXT_AVAILABLE_DAYS = 14;

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schema = {
  type: "object",
  properties: {
    sportCode: { type: "string", minLength: 1, maxLength: 30, pattern: "\\S" },
    city: { type: "string", minLength: 1, maxLength: 100, pattern: "\\S" },
    date: { type: "string", format: "date" },
  },
  required: ["sportCode", "city", "date"],
  additionalProperties: true,
};

const validate = ajv.compile(schema);

function summarizeDay(sportsGround, date, occupiedSlots, now) {
  const { slotList } = availability.getDaySlots(sportsGround, date, occupiedSlots, now);
  return availability.summarizeFreeSlots(slotList);
}

async function searchAbl(req, res) {
  try {
    const userId = req.get("X-User-Id");
    if (!userId) return unauthenticated(res);

    const role = req.get("X-User-Role");
    if (role !== "athlete") return forbidden(res, role);

    const dtoIn = trimDtoIn(req.query ?? {});
    if (!validate(dtoIn)) {
      return res.status(400).json(sportsGroundInvalidDtoIn(validate.errors));
    }

    const now = getPragueNow(clock.now());
    if (dtoIn.date < now.date) return dateInPast(res, dtoIn.date, now.date);

    const sport = await sportDao.getByCode(dtoIn.sportCode);
    if (!sport) {
      return res.status(400).json({
        code: "sportsGround/invalidDtoIn",
        message: "Vstupní data nejsou validní.",
        params: { invalidFields: ["sportCode"] },
      });
    }

    const dtoOut = { date: dtoIn.date, itemList: [], nextAvailableDate: null };

    const venues = await venueDao.listByCity(dtoIn.city);
    const sportsGrounds = await sportsGroundDao.listActiveByVenueListAndSport(
      venues.map((venue) => venue.id),
      sport.code,
    );
    if (sportsGrounds.length === 0) return res.json(dtoOut);

    const idList = sportsGrounds.map((item) => item.id);
    const lastDate = addDays(dtoIn.date, NEXT_AVAILABLE_DAYS);
    const occupiedSlots = await availability.loadOccupiedSlots(idList, dtoIn.date, lastDate);

    const found = sportsGrounds
      .map((sportsGround) => ({
        sportsGround,
        summary: summarizeDay(sportsGround, dtoIn.date, occupiedSlots, now),
      }))
      .filter((item) => item.summary.freeSlotCount > 0);

    if (found.length === 0) {
      // US-01 A1: nabídnout nejbližší den, kdy má některé sportoviště volno.
      for (let offset = 1; offset <= NEXT_AVAILABLE_DAYS; offset += 1) {
        const date = addDays(dtoIn.date, offset);
        if (sportsGrounds.some((item) => summarizeDay(item, date, occupiedSlots, now).freeSlotCount > 0)) {
          dtoOut.nextAvailableDate = date;
          break;
        }
      }
      return res.json(dtoOut);
    }

    const ratings = await ratingDao.getSummaryBySportsGroundList(found.map((item) => item.sportsGround.id));

    dtoOut.itemList = found
      .map(({ sportsGround, summary }) => {
        const rating = ratings.get(sportsGround.id);
        return {
          sportsGround: {
            id: sportsGround.id,
            name: sportsGround.name,
            surface: sportsGround.surface,
            coverType: sportsGround.coverType,
            sport: sportsGround.sport,
          },
          venue: {
            id: sportsGround.venue.id,
            name: sportsGround.venue.name,
            street: sportsGround.venue.street,
            city: sportsGround.venue.city,
          },
          freeSlotCount: summary.freeSlotCount,
          priceFrom: summary.priceFrom,
          averageRating: rating?.averageRating ?? null,
          ratingCount: rating?.ratingCount ?? 0,
        };
      })
      .sort(
        (a, b) =>
          a.venue.name.localeCompare(b.venue.name, "cs") ||
          a.sportsGround.name.localeCompare(b.sportsGround.name, "cs"),
      );

    return res.json(dtoOut);
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      code: "sportsGround/search/failed",
      message: "Vyhledání sportovišť se nezdařilo.",
      params: {},
    });
  }
}

export default searchAbl;
