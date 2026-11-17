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
    id: { type: "string", format: "uuid" },
  },
  required: ["id"],
  additionalProperties: true,
};

const validate = ajv.compile(schema);

async function deleteAbl(req, res) {
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
    if (role !== "operator") {
      return res.status(403).json({
        code: "user/forbidden",
        message: "Akce je dostupná pouze pro provozovatele.",
        params: { role },
      });
    }

    const dtoIn = trimDtoIn({
      ...(req.body ?? {}),
      id: req.body?.id ?? req.query?.id,
    });
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

    const venue = await venueDao.get(sportsGround.venueId);
    if (!venue || venue.operatorId !== userId) {
      return res.status(403).json({
        code: "user/forbidden",
        message: "Sportoviště může smazat jen provozovatel areálu.",
        params: {},
      });
    }

    await sportsGroundDao.deleteById(sportsGround.id);
    return res.json({ sportsGround });
  } catch (e) {
    if (e.errno === 1451 || e.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        code: "sportsGround/cannotDeleteReferenced",
        message: "Sportoviště nelze smazat, protože na něj odkazují další záznamy.",
        params: {},
      });
    }
    console.error(e);
    return res.status(500).json({
      code: "sportsGround/delete/failed",
      message: "Smazání sportoviště se nezdařilo.",
      params: {},
    });
  }
}

export default deleteAbl;
