import express from "express";
import getAvailabilityAbl from "../abl/sports-ground/get-availability-abl.js";
import searchAbl from "../abl/sports-ground/search-abl.js";

const router = express.Router();

router.get("/getAvailability", getAvailabilityAbl);
router.get("/search", searchAbl);

export default router;
