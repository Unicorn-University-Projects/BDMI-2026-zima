import express from "express";
import registerAbl from "../abl/user/register-abl.js";

const router = express.Router();

router.post("/register", registerAbl);

export default router;