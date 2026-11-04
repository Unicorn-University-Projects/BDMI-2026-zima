import express from "express";
import rateLimit from "express-rate-limit";
import registerAbl from "../abl/user/register-abl.js";
import signInAbl from "../abl/user/sign-in-abl.js";
import getMeAbl from "../abl/user/get-me-abl.js";
import setRoleAbl from "../abl/user/set-role-abl.js";
import setPasswordAbl from "../abl/user/set-password-abl.js";
import requestPasswordResetAbl from "../abl/user/request-password-reset-abl.js";
import resetPasswordAbl from "../abl/user/reset-password-abl.js";
import signInWithProviderAbl from "../abl/user/sign-in-with-provider-abl.js";

const router = express.Router();

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
router.post("/signInWithProvider", signInWithProviderAbl);
router.get("/getMe", getMeAbl);
router.post("/setRole", setRoleAbl);
router.post("/setPassword", setPasswordAbl);
router.post("/requestPasswordReset", requestPasswordResetAbl);
router.post("/resetPassword", resetPasswordAbl);

export default router;
