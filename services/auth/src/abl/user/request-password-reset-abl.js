import crypto from "node:crypto";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import userDao from "../../dao/user-dao.js";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schema = {
  type: "object",
  properties: {
    email: { type: "string", format: "email", maxLength: 255 },
  },
  required: ["email"],
};

const validate = ajv.compile(schema);

const RESET_LINK_VALIDITY_MS = 60 * 60 * 1000;

async function requestPasswordResetAbl(req, res) {
  try {
    const dtoIn = req.body ?? {};
    if (!validate(dtoIn)) {
      return res.status(400).json({
        code: "user/requestPasswordReset/invalidDtoIn",
        message: "DtoIn is not valid.",
        params: { validationErrors: validate.errors },
      });
    }
    const unsupportedKeyList = Object.keys(dtoIn).filter((key) => !(key in schema.properties));

    const user = await userDao.getByEmail(dtoIn.email);
    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      await userDao.updatePasswordReset(user.id, {
        tokenHash: crypto.createHash("sha256").update(resetToken).digest("hex"),
        expiresAt: new Date(Date.now() + RESET_LINK_VALIDITY_MS),
      });

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      console.log(`Odkaz pro obnovu hesla (${user.email}): ${frontendUrl}/obnova-hesla/${resetToken}`);
    }

    const dtoOut = {
      message: "Pokud účet s tímto e-mailem existuje, poslali jsme na něj odkaz pro obnovu hesla.",
    };
    if (unsupportedKeyList.length > 0) {
      dtoOut.warnings = [
        {
          code: "user/requestPasswordReset/unsupportedKeys",
          message: "DtoIn contains unsupported keys.",
          params: { unsupportedKeyList },
        },
      ];
    }
    return res.json(dtoOut);
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      code: "user/requestPasswordReset/failed",
      message: "Odeslání odkazu se nezdařilo.",
      params: {},
    });
  }
}

export default requestPasswordResetAbl;
