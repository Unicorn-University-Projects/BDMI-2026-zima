import express from "express";
import createAbl from "../abl/venue/create-abl.js";
import listAbl from "../abl/venue/list-abl.js";
import getAbl from "../abl/venue/get-abl.js";
import updateAbl from "../abl/venue/update-abl.js";
import deleteAbl from "../abl/venue/delete-abl.js";

const router = express.Router();

router.post("/create", createAbl);
router.get("/list", listAbl);
router.get("/get", getAbl);
router.put("/update", updateAbl);
router.patch("/update", updateAbl);
router.delete("/delete", deleteAbl);

export default router;
