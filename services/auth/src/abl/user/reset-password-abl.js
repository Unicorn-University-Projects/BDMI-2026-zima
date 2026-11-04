import crypto from "node:crypto";
import Ajv from "ajv";
import bcrypt from "bcryptjs";
import userDao from "../../dao/user-dao.js";

const ajv = new Ajv({ allErrors: true });

const schema = {
  type: "object",
  properties: {
    token: { type: "string", pattern: "^[0-9a-f]{64}$" },
    newPassword: { type: "string", minLength: 8, maxLength: 72 },
  },
  required: ["token", "newPassword"],
};

const validate = ajv.compile(schema);

async function resetPasswordAbl(req, res) {
  try {
    const dtoIn = req.body ?? {};
    if (!validate(dtoIn)) {
      return res.status(400).json({
        code: "user/resetPassword/invalidDtoIn",
        message: "DtoIn is not valid.",
        params: { validationErrors: validate.errors },
      });
    }
    const unsupportedKeyList = Object.keys(dtoIn).filter((key) => !(key in schema.properties));

    const tokenHash = crypto.createHash("sha256").update(dtoIn.token).digest("hex");
    const user = await userDao.getByPasswordResetToken(tokenHash);
    if (!user || user.passwordResetExpiresAt < new Date()) {
      return res.status(400).json({
        code: "user/resetPassword/invalidResetLink",
        message: "Odkaz pro obnovu hesla už neplatí.",
        params: {},
      });
    }

    const passwordHash = await bcrypt.hash(dtoIn.newPassword, 10);
    const updatedUser = await userDao.updatePassword(user.id, passwordHash);

    const dtoOut = {
      hasPassword: true,
      passwordChangedAt: updatedUser.passwordChangedAt,
    };
    if (unsupportedKeyList.length > 0) {
      dtoOut.warnings = [
        {
          code: "user/resetPassword/unsupportedKeys",
          message: "DtoIn contains unsupported keys.",
          params: { unsupportedKeyList },
        },
      ];
    }
    return res.json(dtoOut);
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      code: "user/resetPassword/failed",
      message: "Obnova hesla se nezdařila.",
      params: {},
    });
  }
}

export default resetPasswordAbl;
