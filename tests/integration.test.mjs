import assert from "node:assert/strict";
import { once } from "node:events";
import { createSign, generateKeyPairSync } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const gatewayDirectory = resolve(repoRoot, "gateway");
const receivedRequests = [];
let gateway;
let gatewayPort;
let upstream;

async function listenOnAvailablePort(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  await new Promise((resolveClose, reject) => {
    server.close((error) => (error ? reject(error) : resolveClose()));
  });
  return port;
}

function createToken(role) {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ sub: "integration-test-user", role }),
  ).toString("base64url");
  const unsignedToken = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(privateKey).toString("base64url");
  return `${unsignedToken}.${signature}`;
}

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

async function waitForGateway() {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (gateway.exitCode !== null) {
      throw new Error(`Gateway exited before becoming ready:\n${gatewayOutput}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${gatewayPort}/health`);
      if (response.ok) return;
    } catch {
      await delay(100);
    }
  }
  throw new Error(`Gateway did not become ready:\n${gatewayOutput}`);
}

let gatewayOutput = "";

before(async () => {
  upstream = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    receivedRequests.push({
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: Buffer.concat(chunks).toString("utf8"),
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ received: true }));
  });
  const upstreamPort = await listenOnAvailablePort(upstream);
  upstream.listen(upstreamPort, "127.0.0.1");
  await once(upstream, "listening");

  gatewayPort = await listenOnAvailablePort(createServer());
  gateway = spawn(process.execPath, ["src/server.js"], {
    cwd: gatewayDirectory,
    env: {
      ...process.env,
      PORT: String(gatewayPort),
      VENUE_URL: `http://127.0.0.1:${upstreamPort}`,
      JWT_PUBLIC_KEY: Buffer.from(
        publicKey.export({ type: "spki", format: "pem" }),
      ).toString("base64"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  gateway.stdout.setEncoding("utf8").on("data", (chunk) => {
    gatewayOutput += chunk;
  });
  gateway.stderr.setEncoding("utf8").on("data", (chunk) => {
    gatewayOutput += chunk;
  });
  await waitForGateway();
});

after(async () => {
  if (gateway && gateway.exitCode === null) {
    const exited = once(gateway, "exit");
    gateway.kill();
    await Promise.race([exited, delay(3_000)]);
    if (gateway.exitCode === null) gateway.kill("SIGKILL");
  }
  if (upstream?.listening) {
    await new Promise((resolveClose, reject) => {
      upstream.close((error) => (error ? reject(error) : resolveClose()));
    });
  }
});

test("gateway health endpoint is available without authentication", async () => {
  const response = await fetch(`http://127.0.0.1:${gatewayPort}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", service: "gateway" });
});

test("gateway rejects protected requests without a token", async () => {
  const requestCount = receivedRequests.length;
  const response = await fetch(`http://127.0.0.1:${gatewayPort}/venue/venue/create`);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "user/unauthenticated");
  assert.equal(receivedRequests.length, requestCount);
});

test("gateway rejects authenticated users without the required role", async () => {
  const response = await fetch(`http://127.0.0.1:${gatewayPort}/venue/venue/create`, {
    headers: { Authorization: `Bearer ${createToken("athlete")}` },
  });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, "user/forbidden");
  assert.equal(receivedRequests.length, 0);
});

test("gateway forwards authorized requests with trusted user headers", async () => {
  const response = await fetch(`http://127.0.0.1:${gatewayPort}/venue/venue/create?source=test`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${createToken("operator")}`,
      "Content-Type": "application/json",
      "X-User-Id": "spoofed-user",
      "X-User-Role": "admin",
      "X-System-Key": "spoofed-key",
    },
    body: JSON.stringify({ name: "Integration venue" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true });
  assert.equal(receivedRequests.length, 1);
  assert.equal(receivedRequests[0].method, "POST");
  assert.equal(receivedRequests[0].url, "/venue/create?source=test");
  assert.equal(receivedRequests[0].headers["x-user-id"], "integration-test-user");
  assert.equal(receivedRequests[0].headers["x-user-role"], "operator");
  assert.equal(receivedRequests[0].headers["x-system-key"], undefined);
  assert.equal(receivedRequests[0].headers.authorization, undefined);
  assert.deepEqual(JSON.parse(receivedRequests[0].body), { name: "Integration venue" });
});
