import { test, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { GATEWAY_SECRET } from "./helpers.js";

process.env.GATEWAY_INTERNAL_SECRET = GATEWAY_SECRET;
process.env.BOOKING_MEMORY_DB = "1";
const { default: app } = await import("../src/app.js");

const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

after(() => {
  server.closeAllConnections();
  server.close();
});

test("GET /health vrátí 200 a název služby", async () => {
  const res = await fetch(`${baseUrl}/health`);

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "ok", service: "booking" });
});
