import express from "express";
import createAbl from "../abl/sports-ground/create-abl.js";
import listAbl from "../abl/sports-ground/list-abl.js";
import getAbl from "../abl/sports-ground/get-abl.js";
import updateAbl from "../abl/sports-ground/update-abl.js";
import deleteAbl from "../abl/sports-ground/delete-abl.js";

const router = express.Router();

router.post("/create", createAbl);
router.get("/list", listAbl);
router.get("/get", getAbl);
router.put("/update", updateAbl);
router.patch("/update", updateAbl);
router.delete("/delete", deleteAbl);

export default router;
