import Ajv from "ajv";
import addFormats from "ajv-formats";
import venueDao from "../../dao/venue-dao.js";

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

const allowedRoles = ["athlete", "operator", "admin"];

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

    const dtoIn = req.query ?? {};
    if (!validate(dtoIn)) {
      return res.status(400).json({
        code: "venue/invalidDtoIn",
        message: "DtoIn is not valid.",
        params: { validationErrors: validate.errors },
      });
    }

    const unsupportedKeyList = Object.keys(dtoIn).filter((key) => !(key in schema.properties));
    const venue = await venueDao.get(dtoIn.id);
    if (!venue) {
      return res.status(404).json({
        code: "venue/notFound",
        message: "Areál neexistuje.",
        params: { id: dtoIn.id },
      });
    }

    const dtoOut = { venue };
    if (unsupportedKeyList.length > 0) {
      dtoOut.warnings = [
        {
          code: "venue/get/unsupportedKeys",
          message: "DtoIn contains unsupported keys.",
          params: { unsupportedKeyList },
        },
      ];
    }
    return res.json(dtoOut);
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      code: "venue/get/failed",
      message: "Načtení areálu se nezdařilo.",
      params: {},
    });
  }
}

export default getAbl;
