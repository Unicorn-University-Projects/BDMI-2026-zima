import express from "express";
import requireSystem from "./middleware/require-system.js";

const SERVICE_NAME = "audit";
const PORT = process.env.PORT || 4005;

const app = express();
app.use(express.json());

app.get("/health", (req,res) => {
    res.json({ status: "ok", service: SERVICE_NAME });
});

app.use("/audit", requireSystem);

app.listen(PORT, (error) => {
    if (error) throw error;
    console.log(`${SERVICE_NAME} bezi, port: ${PORT}`);
});