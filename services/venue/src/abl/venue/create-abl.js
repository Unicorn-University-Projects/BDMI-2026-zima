import crypto from "node:crypto";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import venueDao from "../../dao/venue-dao.js";
import { invalidDtoIn, normalizeText, trimDtoIn } from "../../utils/validation.js";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1, maxLength: 100, pattern: "\\S" },
    street: { type: "string", minLength: 1, maxLength: 100, pattern: "\\S" },
    streetNumber: { type: "string", minLength: 1, maxLength: 20, pattern: "\\S" },
    city: { type: "string", minLength: 1, maxLength: 100, pattern: "\\S" },
    emailAddress: { type: "string", format: "email", maxLength: 255, pattern: "\\S" },
    phoneNumber: { type: "string", minLength: 1, maxLength: 30, pattern: "^\\+?[\\d\\s()-]{9,20}$" },
    operatorNote: { type: "string", maxLength: 500 },
  },
  required: ["name", "street", "streetNumber", "city", "emailAddress", "phoneNumber"],
  additionalProperties: true,
};

const validate = ajv.compile(schema);

function isValidPhone(phone) {
  return /^\+?[\d\s()-]{9,20}$/.test(phone) && phone.replace(/\D/g, "").length >= 9;
}

async function createAbl(req, res) {
  try {
    const operatorId = req.get("X-User-Id");
    if (!operatorId) {
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
      return res.status(400).json(invalidDtoIn(validate.errors));
    }
    if (!isValidPhone(dtoIn.phoneNumber)) {
      return res.status(400).json(invalidDtoIn([{ instancePath: "/phoneNumber" }]));
    }

    const unsupportedKeyList = Object.keys(dtoIn).filter((key) => !(key in schema.properties));

    const name = normalizeText(dtoIn.name);
    const street = normalizeText(dtoIn.street);
    const streetNumber = normalizeText(dtoIn.streetNumber);
    const city = normalizeText(dtoIn.city);
    const email = normalizeText(dtoIn.emailAddress).toLowerCase();
    const phone = normalizeText(dtoIn.phoneNumber);
    const noteForAthletes = dtoIn.operatorNote ? normalizeText(dtoIn.operatorNote) : null;

    if (await venueDao.getByNameAndAddress(operatorId, name, street, streetNumber, city)) {
      return res.status(409).json({
        code: "venue/create/venueAlreadyExists",
        message: "Areál s tímto názvem a adresou již existuje.",
        params: { name, street, streetNumber, city },
      });
    }

    const venue = await venueDao.create({
      id: crypto.randomUUID(),
      operatorId,
      name,
      street,
      streetNumber,
      city,
      noteForAthletes,
      email,
      phone,
    });

    const dtoOut = { venue };
    if (unsupportedKeyList.length > 0) {
      dtoOut.warnings = [
        {
          code: "venue/create/unsupportedKeys",
          message: "Vstup obsahuje nepodporované klíče.",
          params: { unsupportedKeyList },
        },
      ];
    }
    return res.status(201).json(dtoOut);
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      code: "venue/create/failed",
      message: "Vytvoření areálu se nezdařilo.",
      params: {},
    });
  }
}

export default createAbl;
