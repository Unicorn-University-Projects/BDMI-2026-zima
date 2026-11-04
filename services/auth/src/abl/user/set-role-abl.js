import Ajv from "ajv";
import userDao from "../../dao/user-dao.js";
import token from "../../token.js";

const ajv = new Ajv({ allErrors: true });

const schema = {
  type: "object",
  properties: {
    role: { type: "string", enum: ["athlete", "operator"] },
    termsAccepted: { type: "boolean", const: true },
  },
  required: ["role", "termsAccepted"],
};

const validate = ajv.compile(schema);

async function setRoleAbl(req, res) {
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
        code: "user/setRole/invalidDtoIn",
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
    const updatedUser = user.role === null ? await userDao.updateRole(userId, dtoIn.role, new Date()) : null;
    if (!updatedUser) {
      return res.status(409).json({
        code: "user/setRole/roleAlreadySet",
        message: "Role už je nastavená a nejde ji změnit.",
        params: { role: user.role },
      });
    }

    const dtoOut = {
      token: token.createToken(updatedUser),
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        surName: updatedUser.surName,
        phoneNumber: updatedUser.phoneNumber,
        role: updatedUser.role,
        termsAcceptedAt: updatedUser.termsAcceptedAt,
      },
    };
    if (unsupportedKeyList.length > 0) {
      dtoOut.warnings = [
        {
          code: "user/setRole/unsupportedKeys",
          message: "DtoIn contains unsupported keys.",
          params: { unsupportedKeyList },
        },
      ];
    }
    return res.json(dtoOut);
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      code: "user/setRole/failed",
      message: "Nastavení role se nezdařilo.",
      params: {},
    });
  }
}

export default setRoleAbl;
