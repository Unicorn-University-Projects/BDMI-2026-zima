// sportsGround/getAvailability – volné a obsazené hodinové sloty sportoviště pro zvolený den.
import Ajv from "ajv";
import addFormats from "ajv-formats";
import sportsGroundDao from "../../dao/sports-ground-dao.js";
import clock from "../../utils/clock.js";
import availability from "../../utils/availability.js";
import { getPragueNow } from "../../utils/slots.js";
import {
  dateInPast,
  forbidden,
  sportsGroundInvalidDtoIn,
  trimDtoIn,
  unauthenticated,
} from "../../utils/validation.js";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schema = {
  type: "object",
  properties: {
    sportsGroundId: { type: "string", format: "uuid" },
    date: { type: "string", format: "date" },
  },
  required: ["sportsGroundId", "date"],
  additionalProperties: true,
};

const validate = ajv.compile(schema);
const allowedRoles = ["athlete", "operator"];

async function getAvailabilityAbl(req, res) {
  try {
    const userId = req.get("X-User-Id");
    if (!userId) return unauthenticated(res);

    const role = req.get("X-User-Role");
    if (!allowedRoles.includes(role)) return forbidden(res, role);

    const dtoIn = trimDtoIn(req.query ?? {});
    if (!validate(dtoIn)) {
      return res.status(400).json(sportsGroundInvalidDtoIn(validate.errors));
    }

    const now = getPragueNow(clock.now());
    if (dtoIn.date < now.date) return dateInPast(res, dtoIn.date, now.date);

    // Neaktivní sportoviště se sportovcům nenabízí – tváří se jako neexistující
    // (stejné pravidlo jako venue sportsGround/get).
    const sportsGround = await sportsGroundDao.get(dtoIn.sportsGroundId);
    if (!sportsGround || (role === "athlete" && sportsGround.status !== "active")) {
      return res.status(404).json({
        code: "sportsGround/notFound",
        message: "Sportoviště neexistuje.",
        params: { id: dtoIn.sportsGroundId },
      });
    }

    const occupiedSlots = await availability.loadOccupiedSlots([sportsGround.id], dtoIn.date, dtoIn.date);
    const { dayOfWeek, isClosed, slotList } = availability.getDaySlots(sportsGround, dtoIn.date, occupiedSlots, now);

    return res.json({
      sportsGround: {
        id: sportsGround.id,
        name: sportsGround.name,
        venueId: sportsGround.venueId,
        status: sportsGround.status,
      },
      date: dtoIn.date,
      dayOfWeek,
      isClosed,
      slotList,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      code: "sportsGround/getAvailability/failed",
      message: "Načtení volných termínů se nezdařilo.",
      params: {},
    });
  }
}

export default getAvailabilityAbl;
