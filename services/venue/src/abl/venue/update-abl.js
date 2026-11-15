import Ajv from "ajv";
import addFormats from "ajv-formats";
import venueDao from "../../dao/venue-dao.js";
import { invalidDtoIn, normalizeText, trimDtoIn } from "../../utils/validation.js";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string", minLength: 1, maxLength: 150, pattern: "\\S" },
    street: { type: "string", minLength: 1, maxLength: 150, pattern: "\\S" },
    streetNumber: { type: "string", minLength: 1, maxLength: 50, pattern: "\\S" },
    city: { type: "string", minLength: 1, maxLength: 100, pattern: "\\S" },
    emailAddress: { type: "string", format: "email", maxLength: 255, pattern: "\\S" },
    phoneNumber: { type: "string", minLength: 1, maxLength: 30, pattern: "\\S" },
    operatorNote: { type: "string", maxLength: 1000 },
  },
  required: ["id", "name", "street", "streetNumber", "city", "emailAddress", "phoneNumber"],
  additionalProperties: true,
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

    const dtoIn = trimDtoIn(req.body ?? {});
    if (!validate(dtoIn)) {
      return res.status(400).json(invalidDtoIn(validate.errors));
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

    if (venue.operatorId !== userId) {
      return res.status(403).json({
        code: "user/forbidden",
        message: "Areál může upravit jen jeho provozovatel.",
        params: {},
      });
    }

    const name = normalizeText(dtoIn.name);
    const street = normalizeText(`${dtoIn.street} ${dtoIn.streetNumber}`);
    const city = normalizeText(dtoIn.city);
    const email = normalizeText(dtoIn.emailAddress).toLowerCase();
    const phone = normalizeText(dtoIn.phoneNumber);
    const noteForAthletes = dtoIn.operatorNote ? normalizeText(dtoIn.operatorNote) : null;

    const duplicate = await venueDao.getByNameAndAddress(venue.operatorId, name, street, city);
    if (duplicate && duplicate.id !== venue.id) {
      return res.status(409).json({
        code: "venue/update/venueAlreadyExists",
        message: "Areál s tímto názvem a adresou již existuje.",
        params: { name, street, city },
      });
    }

    const updatedVenue = await venueDao.update(venue.id, {
      name,
      street,
      city,
      noteForAthletes,
      email,
      phone,
    });

    const dtoOut = { venue: updatedVenue };
    if (unsupportedKeyList.length > 0) {
      dtoOut.warnings = [
        {
          code: "venue/update/unsupportedKeys",
          message: "Vstup obsahuje nepodporované klíče.",
          params: { unsupportedKeyList },
        },
      ];
    }
    return res.json(dtoOut);
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      code: "venue/update/failed",
      message: "Úprava areálu se nezdařila.",
      params: {},
    });
  }
}

export default updateAbl;
