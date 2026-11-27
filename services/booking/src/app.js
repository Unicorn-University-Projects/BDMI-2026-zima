import express from "express";
import requireGateway from "./middleware/require-gateway.js";
import reservationController from "./controllers/reservation-controller.js";
import sportsGroundController from "./controllers/sports-ground-controller.js";

export const SERVICE_NAME = "booking";

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: SERVICE_NAME });
});

app.use(requireGateway);
app.use("/reservation", reservationController);
app.use("/sportsGround", sportsGroundController);

export default app;
