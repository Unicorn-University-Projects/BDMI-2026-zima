import express from "express";
import helmet from "helmet";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import permissions from "./permissions.js";
import authenticate from "./middleware/authenticate.js";
import authorize from "./middleware/authorize.js";
import forwardUser from "./middleware/forward-user.js";

const SERVICE_NAME = "gateway";
const PORT = process.env.PORT || 4000;

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: SERVICE_NAME });
});

app.use(authenticate, authorize, forwardUser);

function serviceUnavailable(error, req, res) {
  console.error(`${req.method} ${req.originalUrl}: ${error.message}`);
  if (res.headersSent) {
    return res.end();
  }
  res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
  res.end(
    JSON.stringify({
      code: "gateway/serviceUnavailable",
      message: "Služba je momentálně nedostupná. Zkuste to později.",
      params: {},
    }),
  );
}

for (const [service, target] of Object.entries(permissions.services)) {
  app.use(
    `/${service}`,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      xfwd: true,
      on: { error: serviceUnavailable },
    }),
  );
}

app.listen(PORT, (error) => {
  if (error) throw error;
  console.log(`${SERVICE_NAME} bezi, port: ${PORT}`);
});
