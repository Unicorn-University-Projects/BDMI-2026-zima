import crypto from "node:crypto";

const expectedSecret = process.env.GATEWAY_INTERNAL_SECRET;
if (!expectedSecret) {
  throw new Error("GATEWAY_INTERNAL_SECRET environment variable is required");
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest();
}

const expectedHash = hash(expectedSecret);

function requireGateway(req, res, next) {
  const provided = req.get("X-Gateway-Secret") ?? "";
  if (
    provided.length !== expectedSecret.length ||
    !crypto.timingSafeEqual(hash(provided), expectedHash)
  ) {
    return res.status(403).json({
      code: "user/forbidden",
      message: "Přímý přístup ke službě není povolen.",
      params: {},
    });
  }
  return next();
}

export default requireGateway;
