import jwt from "jsonwebtoken";
import permissions from "../permissions.js";

const publicKey = Buffer.from(process.env.JWT_PUBLIC_KEY ?? "", "base64")
  .toString("utf8")
  .replace(/\\n/g, "\n");

function unauthenticated(res) {
  return res.status(401).json({
    code: "user/unauthenticated",
    message: "Pro tuto akci se musíte přihlásit.",
    params: {},
  });
}

function authenticate(req, res, next) {
  req.commandPath = permissions.getCommandPath(req);
  req.profiles = permissions.getProfiles(req.commandPath);
  req.user = null;

  if (!req.profiles || req.profiles.includes("Public")) {
    return next();
  }

  const [scheme, token] = (req.get("Authorization") ?? "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return unauthenticated(res);
  }

  try {
    const payload = jwt.verify(token, publicKey, { algorithms: ["RS256"] });
    req.user = { id: payload.sub, role: payload.role ?? null };
  } catch (err) {
    console.error("GATEWAY AUTH ERROR:", err);
    return unauthenticated(res);
  }

  if (!req.user.id) {
    return unauthenticated(res);
  }
  return next();
}

export default authenticate;
