import jwt from "jsonwebtoken";

const privateKey = Buffer.from(process.env.JWT_PRIVATE_KEY ?? "", "base64").toString("utf8");

function createToken(user) {
  return jwt.sign({ role: user.role }, privateKey, {
    algorithm: "RS256",
    subject: user.id,
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });
}

export default { createToken };