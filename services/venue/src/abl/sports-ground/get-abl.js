import Ajv from "ajv";
import addFormats from "ajv-formats";
import sportsGroundDao from "../../dao/sports-ground-dao.js";
import { sportsGroundInvalidDtoIn, trimDtoIn } from "../../utils/validation.js";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
  },
  required: ["id"],
  additionalProperties: true,
};

const validate = ajv.compile(schema);
const allowedRoles = ["athlete", "operator"];

async function getAbl(req, res) {
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

    const sportsGround = await sportsGroundDao.get(dtoIn.id);
    if (!sportsGround) {
      return res.status(404).json({
        code: "sportsGround/notFound",
        message: "Sportoviště neexistuje.",
        params: { id: dtoIn.id },
      });
    }

    return res.json({ sportsGround });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      code: "sportsGround/get/failed",
      message: "Načtení sportoviště se nezdařilo.",
      params: {},
    });
  }
}

export default getAbl;
