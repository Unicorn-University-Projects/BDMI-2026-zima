import Ajv from "ajv";
import addFormats from "ajv-formats";
import sportsGroundDao from "../../dao/sports-ground-dao.js";
import venueDao from "../../dao/venue-dao.js";
import { sportsGroundInvalidDtoIn, trimDtoIn } from "../../utils/validation.js";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schema = {
  type: "object",
  properties: {
    venueId: { type: "string", format: "uuid" },
  },
  required: ["venueId"],
  additionalProperties: true,
};

const validate = ajv.compile(schema);
const allowedRoles = ["athlete", "operator"];

async function listAbl(req, res) {
  try {
    const userId = req.get("X-User-Id");
    if (!userId) {
      return res.status(401).json({
        code: "user/unauthenticated",
        message: "Uživatel není přihlášený.",
        params: {},
      });
    }

    const role = req.get("X-User-Role");
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        code: "user/forbidden",
        message: "K této akci nemáte oprávnění.",
        params: { role },
      });
    }

    const dtoIn = trimDtoIn(req.query ?? {});
    if (!validate(dtoIn)) {
      return res.status(400).json(sportsGroundInvalidDtoIn(validate.errors));
    }

    const venue = await venueDao.get(dtoIn.venueId);
    if (!venue) {
      return res.status(404).json({
        code: "venue/notFound",
        message: "Areál neexistuje.",
        params: { id: dtoIn.venueId },
      });
    }

    const isOwner = role === "operator" && venue.operatorId === userId;
    const itemList = await sportsGroundDao.list({
      venueId: dtoIn.venueId,
      status: isOwner ? undefined : "active",
    });
    return res.json({ itemList });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      code: "sportsGround/list/failed",
      message: "Načtení sportovišť se nezdařilo.",
      params: {},
    });
  }
}

export default listAbl;
