import express from "express";
import venueController from "./controllers/venue-controller.js";

const SERVICE_NAME = "venue";
const PORT = process.env.PORT || 4002;

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: SERVICE_NAME });
});

app.use("/venue", venueController);

app.listen(PORT, (error) => {
  if (error) throw error;
  console.log(`${SERVICE_NAME} bezi, port: ${PORT}`);
});
