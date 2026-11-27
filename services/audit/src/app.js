import express from "express";
import requireSystem from "./middleware/require-system.js";

export const SERVICE_NAME = "audit";

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: SERVICE_NAME });
});

app.use("/audit", requireSystem);

export default app;
