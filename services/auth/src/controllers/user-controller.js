import express from "express";
import rateLimit from "express-rate-limit";
import registerAbl from "../abl/user/register-abl.js";
import signInAbl from "../abl/user/sign-in-abl.js";

const router = express.Router();

// Ochrana proti zkoušení hesel (analýza 5.1): za 15 minut max. 20 neúspěšných pokusů z jedné IP
// a 5 na jeden e-mail, pak 429. Úspěšná přihlášení se nepočítají.
function tooManyAttempts(req, res) {
  res.status(429).json({
    code: "user/signIn/tooManyAttempts",
    message: "Příliš mnoho pokusů o přihlášení. Zkuste to znovu za 15 minut.",
    params: {},
  });
}

const signInIpLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  handler: tooManyAttempts,
});

const signInEmailLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => String(req.body?.email ?? "").toLowerCase(),
  handler: tooManyAttempts,
});

router.post("/register", registerAbl);
router.post("/signIn", signInIpLimit, signInEmailLimit, signInAbl);

export default router;
