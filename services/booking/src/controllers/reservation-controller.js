import express from "express";
import createAbl from "../abl/reservation/create-abl.js";

const router = express.Router();

router.post("/create", createAbl);

export default router;
