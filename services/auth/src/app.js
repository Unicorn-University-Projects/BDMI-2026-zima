import express from "express";
import userController from "./controllers/user-controller.js";

export const SERVICE_NAME = "auth";

const app = express();
app.set("trust proxy", 1);
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: SERVICE_NAME });
});

app.use("/user", userController);

export default app;
