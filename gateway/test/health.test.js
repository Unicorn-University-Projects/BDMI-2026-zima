import { test, after } from "node:test";
import assert from "node:assert/strict";
import { listen } from "./helpers.js";
import app from "../src/app.js";

const server = await listen(app);
after(() => server.close());

test("GET /health vrátí 200 a název služby", async () => {
  const res = await fetch(`${server.url}/health`);

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "ok", service: "gateway" });
});

test("GET /health nepotřebuje token", async () => {
  const res = await fetch(`${server.url}/health`, { headers: { Authorization: "Bearer neplatny" } });

  assert.equal(res.status, 200);
});
