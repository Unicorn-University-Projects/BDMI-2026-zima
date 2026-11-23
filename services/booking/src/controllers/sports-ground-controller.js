import express from "express";
import getAvailabilityAbl from "../abl/sports-ground/get-availability-abl.js";

const router = express.Router();

router.get("/getAvailability", getAvailabilityAbl);

export default router;
