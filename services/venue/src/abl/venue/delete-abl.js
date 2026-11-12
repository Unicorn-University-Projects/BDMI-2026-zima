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

function canManage(role, userId, venue) {
  return role === "admin" || venue.operatorId === userId;
}

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
    const dtoIn = {
      ...(req.body ?? {}),
      id: req.body?.id ?? req.query?.id,
    };
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

    if (!canManage(role, userId, venue)) {
      return res.status(403).json({
        code: "user/forbidden",
        message: "Areál může smazat jen jeho provozovatel.",
        params: { role },
      });
    }

    await venueDao.deleteById(venue.id);

    const dtoOut = { venue };
    if (unsupportedKeyList.length > 0) {
      dtoOut.warnings = [
        {
          code: "venue/delete/unsupportedKeys",
          message: "DtoIn contains unsupported keys.",
          params: { unsupportedKeyList },
        },
      ];
    }
    return res.json(dtoOut);
  } catch (e) {
    if (e.errno === 1451 || e.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        code: "venue/cannotDeleteReferenced",
        message: "Areál nelze smazat, protože na něj odkazují další záznamy.",
        params: {},
      });
    }
    console.error(e);
    return res.status(500).json({
      code: "venue/delete/failed",
      message: "Smazání areálu se nezdařilo.",
      params: {},
    });
  }
}

export default deleteAbl;
