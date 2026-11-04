import crypto from "node:crypto";

function hash(value) {
  return crypto.createHash("sha256").update(value).digest();
}

const systemKeyHash = process.env.SYSTEM_KEY ? hash(process.env.SYSTEM_KEY) : null;

function requireSystem(req, res, next) {
  const providedKey = req.get("X-System-Key");
  if (!systemKeyHash || !providedKey || !crypto.timingSafeEqual(hash(providedKey), systemKeyHash)) {
    return res.status(403).json({
      code: "user/forbidden",
      message: "Tento endpoint smí volat jen jiná služba.",
      params: {},
    });
  }
  req.profile = "System";
  return next();
}

export default requireSystem;
