import Ajv from "ajv";
import addFormats from "ajv-formats";
import bcrypt from "bcryptjs";
import userDao from "../../dao/user-dao.js";
import token from "../../token.js";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schema = {
  type: "object",
  properties: {
    email: { type: "string", format: "email", maxLength: 255 },
    password: { type: "string", minLength: 1, maxLength: 72 },
  },
  required: ["email", "password"],
};

const validate = ajv.compile(schema);

const DUMMY_PASSWORD_HASH = bcrypt.hashSync("dummy-password", 10);

async function signInAbl(req, res) {
  try {
    const dtoIn = req.body ?? {};

    if (!validate(dtoIn)) {
      return res.status(400).json({
        code: "user/signIn/invalidDtoIn",
        message: "DtoIn is not valid.",
        params: { validationErrors: validate.errors },
      });
    }
    const unsupportedKeyList = Object.keys(dtoIn).filter((key) => !(key in schema.properties));

    const user = await userDao.getByEmail(dtoIn.email);
    const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const passwordMatches = await bcrypt.compare(dtoIn.password, passwordHash);
    if (!user || !user.passwordHash || !passwordMatches) {
      return res.status(401).json({
        code: "user/signIn/invalidCredentials",
        message: "Nesprávný e-mail nebo heslo.",
        params: {},
      });
    }

    const dtoOut = {
      token: token.createToken(user),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        surName: user.surName,
        phoneNumber: user.phoneNumber,
        role: user.role,
        termsAcceptedAt: user.termsAcceptedAt,
      },
    };
    if (unsupportedKeyList.length > 0) {
      dtoOut.warnings = [
        {
          code: "user/signIn/unsupportedKeys",
          message: "DtoIn contains unsupported keys.",
          params: { unsupportedKeyList },
        },
      ];
    }
    return res.json(dtoOut);
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      code: "user/signIn/failed",
      message: "Přihlášení se nezdařilo.",
      params: {},
    });
  }
}

export default signInAbl;
