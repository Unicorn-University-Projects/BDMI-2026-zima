import Ajv from "ajv";
import bcrypt from "bcryptjs";
import userDao from "../../dao/user-dao.js";

const ajv = new Ajv({ allErrors: true });

const schema = {
  type: "object",
  properties: {
    currentPassword: { type: "string", minLength: 1, maxLength: 72 },
    newPassword: { type: "string", minLength: 8, maxLength: 72 },
  },
  required: ["newPassword"],
};

const validate = ajv.compile(schema);

async function setPasswordAbl(req, res) {
  try {
    const userId = req.get("X-User-Id");
    if (!userId) {
      return res.status(401).json({
        code: "user/unauthenticated",
        message: "Uživatel není přihlášený.",
        params: {},
      });
    }

    const dtoIn = req.body ?? {};
    if (!validate(dtoIn)) {
      return res.status(400).json({
        code: "user/setPassword/invalidDtoIn",
        message: "DtoIn is not valid.",
        params: { validationErrors: validate.errors },
      });
    }
    const unsupportedKeyList = Object.keys(dtoIn).filter((key) => !(key in schema.properties));

    const user = await userDao.get(userId);
    if (!user) {
      return res.status(404).json({
        code: "user/notFound",
        message: "Uživatel neexistuje.",
        params: { userId },
      });
    }

    if (user.passwordHash !== null) {
      const currentPasswordMatches =
        dtoIn.currentPassword !== undefined && (await bcrypt.compare(dtoIn.currentPassword, user.passwordHash));
      if (!currentPasswordMatches) {
        return res.status(400).json({
          code: "user/setPassword/invalidCurrentPassword",
          message: "Současné heslo není správné.",
          params: {},
        });
      }
    }

    const passwordHash = await bcrypt.hash(dtoIn.newPassword, 10);
    const updatedUser = await userDao.updatePassword(userId, passwordHash);

    const dtoOut = {
      hasPassword: true,
      passwordChangedAt: updatedUser.passwordChangedAt,
    };
    if (unsupportedKeyList.length > 0) {
      dtoOut.warnings = [
        {
          code: "user/setPassword/unsupportedKeys",
          message: "DtoIn contains unsupported keys.",
          params: { unsupportedKeyList },
        },
      ];
    }
    return res.json(dtoOut);
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      code: "user/setPassword/failed",
      message: "Nastavení hesla se nezdařilo.",
      params: {},
    });
  }
}

export default setPasswordAbl;
