import crypto from "node:crypto";
import Ajv from "ajv";
import * as oidc from "openid-client";
import userDao from "../../dao/user-dao.js";
import token from "../../token.js";

const ajv = new Ajv({ allErrors: true });

const schema = {
  type: "object",
  properties: {
    provider: { type: "string", enum: ["google", "microsoft"] },
    code: { type: "string", minLength: 1, maxLength: 2048 },
    codeVerifier: { type: "string", minLength: 43, maxLength: 128 },
    nonce: { type: "string", minLength: 1, maxLength: 255 },
  },
  required: ["provider", "code", "codeVerifier", "nonce"],
};

const validate = ajv.compile(schema);

const providers = {
  google: {
    issuer: "https://accounts.google.com",
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    getIdentity: (claims) => ({
      providerUserId: claims.sub,
      email: claims.email_verified === true ? claims.email : null,
    }),
  },
  microsoft: {
    issuer: "https://login.microsoftonline.com/common/v2.0",
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    redirectUri: process.env.MICROSOFT_REDIRECT_URI,
    getIdentity: (claims) => ({
      providerUserId: claims.tid && claims.oid ? `${claims.tid}:${claims.oid}` : null,
      email: claims.email ?? (String(claims.preferred_username ?? "").includes("@") ? claims.preferred_username : null),
    }),
  },
};

function getNames(claims) {
  const nameParts = String(claims.name ?? "").trim().split(/\s+/);
  const firstName = claims.given_name ?? nameParts[0] ?? "";
  const surName = claims.family_name ?? nameParts.slice(1).join(" ");
  return { firstName: String(firstName).slice(0, 100), surName: String(surName).slice(0, 100) };
}

const configCache = {};

function getProviderConfig(name) {
  const provider = providers[name];
  if (!configCache[name]) {
    configCache[name] = oidc
      .discovery(new URL(provider.issuer), provider.clientId, provider.clientSecret)
      .catch((e) => {
        delete configCache[name];
        throw e;
      });
  }
  return configCache[name];
}

function isConfigured(name) {
  const provider = providers[name];
  return Boolean(provider?.clientId && provider?.clientSecret && provider?.redirectUri);
}

function toUserDtoOut(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    surName: user.surName,
    phoneNumber: user.phoneNumber,
    role: user.role,
    termsAcceptedAt: user.termsAcceptedAt,
  };
}

async function signInWithProviderAbl(req, res) {
  try {
    const dtoIn = req.body ?? {};
    if (!validate(dtoIn)) {
      return res.status(400).json({
        code: "user/signInWithProvider/invalidDtoIn",
        message: "DtoIn is not valid.",
        params: { validationErrors: validate.errors },
      });
    }
    const unsupportedKeyList = Object.keys(dtoIn).filter((key) => !(key in schema.properties));

    if (!isConfigured(dtoIn.provider)) {
      return res.status(400).json({
        code: "user/signInWithProvider/providerNotSupported",
        message: "Přihlášení přes tohoto poskytovatele zatím není dostupné.",
        params: { provider: dtoIn.provider },
      });
    }

    let claims;
    try {
      const config = await getProviderConfig(dtoIn.provider);
      const callbackUrl = new URL(providers[dtoIn.provider].redirectUri);
      callbackUrl.searchParams.set("code", dtoIn.code);
      if (config.serverMetadata().authorization_response_iss_parameter_supported) {
        callbackUrl.searchParams.set("iss", config.serverMetadata().issuer);
      }
      const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
        pkceCodeVerifier: dtoIn.codeVerifier,
        expectedNonce: dtoIn.nonce,
        idTokenExpected: true,
      });
      claims = tokens.claims();
    } catch (e) {
      console.error(e);
      return res.status(401).json({
        code: "user/signInWithProvider/providerAuthFailed",
        message: "Přihlášení přes poskytovatele se nezdařilo. Zkuste to znovu.",
        params: { provider: dtoIn.provider },
      });
    }

    const identity = providers[dtoIn.provider].getIdentity(claims);
    if (!identity.providerUserId) {
      return res.status(401).json({
        code: "user/signInWithProvider/providerAuthFailed",
        message: "Přihlášení přes poskytovatele se nezdařilo. Zkuste to znovu.",
        params: { provider: dtoIn.provider },
      });
    }
    const providerUserId = identity.providerUserId;
    const email = identity.email ? identity.email.toLowerCase() : null;

    let user = await userDao.getByAuthProvider(dtoIn.provider, providerUserId);

    if (!user) {
      if (!email) {
        return res.status(400).json({
          code: "user/signInWithProvider/emailNotAvailable",
          message: "Poskytovatel nevrátil ověřený e-mail.",
          params: { provider: dtoIn.provider },
        });
      }

      const emailOwner = await userDao.getByEmail(email);
      if (emailOwner) {
        return res.status(409).json({
          code: "user/signInWithProvider/emailAlreadyRegistered",
          message: "Účet s tímto e-mailem už existuje. Přihlaste se e-mailem a heslem.",
          params: {},
        });
      }

      try {
        user = await userDao.createWithAuthProvider(
          {
            id: crypto.randomUUID(),
            email,
            ...getNames(claims),
          },
          { provider: dtoIn.provider, providerUserId, email },
        );
      } catch (e) {
        if (e.code === "ER_DUP_ENTRY") {
          return res.status(409).json({
            code: "user/signInWithProvider/emailAlreadyRegistered",
            message: "Účet s tímto e-mailem už existuje. Přihlaste se e-mailem a heslem.",
            params: {},
          });
        }
        throw e;
      }
    }

    const dtoOut = {
      token: token.createToken(user),
      user: toUserDtoOut(user),
    };
    if (unsupportedKeyList.length > 0) {
      dtoOut.warnings = [
        {
          code: "user/signInWithProvider/unsupportedKeys",
          message: "DtoIn contains unsupported keys.",
          params: { unsupportedKeyList },
        },
      ];
    }
    return res.json(dtoOut);
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      code: "user/signInWithProvider/failed",
      message: "Přihlášení přes poskytovatele se nezdařilo.",
      params: {},
    });
  }
}

export default signInWithProviderAbl;
