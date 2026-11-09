import express from "express";

export const SERVICE_NAME = "booking";

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: SERVICE_NAME });
});

export default app;
