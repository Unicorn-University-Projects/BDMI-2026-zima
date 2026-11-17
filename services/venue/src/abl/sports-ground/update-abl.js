import Ajv from "ajv";
import addFormats from "ajv-formats";
import sportsDao from "../../dao/sports-dao.js";
import sportsGroundDao from "../../dao/sports-ground-dao.js";
import venueDao from "../../dao/venue-dao.js";
import { normalizeText, sportsGroundInvalidDtoIn, trimDtoIn } from "../../utils/validation.js";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    sportId: { type: "string", format: "uuid" },
    sportCode: { type: "string", minLength: 1, maxLength: 30, pattern: "\\S" },
    name: { type: "string", minLength: 1, maxLength: 150, pattern: "\\S" },
    surface: { type: "string", minLength: 1, maxLength: 50, pattern: "\\S" },
    coverType: { type: "string", enum: ["indoor", "outdoor"] },
    status: { type: "string", enum: ["inactive", "active"] },
  },
  required: ["id", "name", "surface", "coverType"],
  additionalProperties: true,
  anyOf: [{ required: ["sportId"] }, { required: ["sportCode"] }],
};

const validate = ajv.compile(schema);

async function updateAbl(req, res) {
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

    const dtoIn = trimDtoIn(req.body ?? {});
    if (!validate(dtoIn)) {
      return res.status(400).json(sportsGroundInvalidDtoIn(validate.errors));
    }

    const unsupportedKeyList = Object.keys(dtoIn).filter((key) => !(key in schema.properties));
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
        message: "Sportoviště může upravit jen provozovatel areálu.",
        params: {},
      });
    }

    const sport = dtoIn.sportId
      ? await sportsDao.get(dtoIn.sportId)
      : await sportsDao.getByCode(dtoIn.sportCode);
    if (!sport) {
      return res.status(400).json({
        code: "sportsGround/invalidDtoIn",
        message: "Vstupní data nejsou validní.",
        params: { invalidFields: [dtoIn.sportId ? "sportId" : "sportCode"] },
      });
    }

    let status = dtoIn.status ?? sportsGround.status;
    if (status === "active" && !(await sportsGroundDao.hasOpeningHoursAndPriceList(sportsGround.id))) {
      return res.status(400).json({
        code: "sportsGround/invalidDtoIn",
        message: "Sportoviště nelze aktivovat bez otevírací doby a ceníku.",
        params: { invalidFields: ["status"] },
      });
    }

    const updated = await sportsGroundDao.update(sportsGround.id, {
      sportId: sport.id,
      name: normalizeText(dtoIn.name),
      surface: normalizeText(dtoIn.surface),
      coverType: dtoIn.coverType,
      status,
    });

    const dtoOut = { sportsGround: updated };
    if (unsupportedKeyList.length > 0) {
      dtoOut.warnings = [
        {
          code: "sportsGround/update/unsupportedKeys",
          message: "Vstup obsahuje nepodporované klíče.",
          params: { unsupportedKeyList },
        },
      ];
    }
    return res.json(dtoOut);
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      code: "sportsGround/update/failed",
      message: "Úprava sportoviště se nezdařila.",
      params: {},
    });
  }
}

export default updateAbl;
