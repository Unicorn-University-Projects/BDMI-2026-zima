import express from "express";
import requireGateway from "./middleware/require-gateway.js";
import reservationController from "./controllers/reservation-controller.js";

const SERVICE_NAME = "booking";
const PORT = process.env.PORT || 4003;

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: SERVICE_NAME });
});

app.use(requireGateway);
app.use("/reservation", reservationController);

app.listen(PORT, (error) => {
  if (error) throw error;
  console.log(`${SERVICE_NAME} bezi, port: ${PORT}`);
});
