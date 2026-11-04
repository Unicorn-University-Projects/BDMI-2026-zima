import crypto from "node:crypto";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import bcrypt from "bcryptjs";
import userDao from "../../dao/user-dao.js";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schema = {
  type: "object",
  properties: {
    firstName: { type: "string", minLength: 1, maxLength: 100 },
    surName: { type: "string", minLength: 1, maxLength: 100 },
    email: { type: "string", format: "email", maxLength: 255 },
    password: { type: "string", minLength: 8, maxLength: 72 },
    role: { type: "string", enum: ["athlete", "operator"] },
    termsAccepted: { type: "boolean", const: true },
  },
  required: ["firstName", "surName", "email", "password", "role", "termsAccepted"],
};

const validate = ajv.compile(schema);

async function registerAbl(req, res) {
  try {
    const dtoIn = req.body ?? {};

    // 1. validace dtoIn
    if (!validate(dtoIn)) {
      return res.status(400).json({
        code: "user/register/invalidDtoIn",
        message: "DtoIn is not valid.",
        params: { validationErrors: validate.errors },
      });
    }
    const unsupportedKeyList = Object.keys(dtoIn).filter((key) => !(key in schema.properties));

    // 2. e-mail musí být unikátní
    const email = dtoIn.email.toLowerCase();
    if (await userDao.getByEmail(email)) {
      return res.status(400).json({
        code: "user/register/emailAlreadyExists",
        message: "Uživatel s tímto emailem už existuje.",
        params: { email },
      });
    }

    // 3. hash hesla – samotné heslo se nikdy neukládá
    const passwordHash = await bcrypt.hash(dtoIn.password, 10);

    // 4. uložení uživatele
    const now = new Date();
    const user = await userDao.create({
      id: crypto.randomUUID(),
      email,
      firstName: dtoIn.firstName,
      surName: dtoIn.surName,
      phoneNumber: null,
      role: dtoIn.role,
      termsAcceptedAt: now,
      passwordHash,
      passwordChangedAt: now,
    });

    // 5. dtoOut – bez hashe hesla
    const dtoOut = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      surName: user.surName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      termsAcceptedAt: user.termsAcceptedAt,
    };
    if (unsupportedKeyList.length > 0) {
      dtoOut.warnings = [
        {
          code: "user/register/unsupportedKeys",
          message: "DtoIn contains unsupported keys.",
          params: { unsupportedKeyList },
        },
      ];
    }
    return res.json(dtoOut);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        code: "user/register/emailAlreadyExists",
        message: "Uživatel s tímto emailem už existuje.",
        params: {},
      });
    }
    console.error(e);
    return res.status(500).json({
      code: "user/register/failed",
      message: "Registrace se nezdařila.",
      params: {},
    });
  }
}

export default registerAbl;