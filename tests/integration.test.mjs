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
const keyPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const services = new Map();
const systemKey = "integration-test-system-key";
const gatewaySecret = "integration-test-gateway-secret";
let gateway;
let gatewayPort;
let forwardingUpstream;

async function availablePort() {
  const server = createServer();
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
  return `${unsignedToken}.${signer.sign(keyPair.privateKey).toString("base64url")}`;
}

function startService(name, port, env = {}) {
  const directory = name.startsWith("gateway")
    ? resolve(repoRoot, "gateway")
    : resolve(repoRoot, "services", name);
  const child = spawn(process.execPath, ["src/server.js"], {
    cwd: directory,
    env: { ...process.env, PORT: String(port), ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const service = { child, port, output: "" };
  child.stdout.setEncoding("utf8").on("data", (chunk) => {
    service.output += chunk;
  });
  child.stderr.setEncoding("utf8").on("data", (chunk) => {
    service.output += chunk;
  });
  services.set(name, service);
  return service;
}

async function waitForHealth(name, expectedStatus = 200) {
  const service = services.get(name);
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (service.child.exitCode !== null) {
      throw new Error(`${name} exited before becoming ready:\n${service.output}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${service.port}/health`);
      if (response.status === expectedStatus) return;
    } catch {
      await delay(100);
    }
  }
  throw new Error(`${name} did not become ready:\n${service.output}`);
}

function serviceUrl(name, path = "") {
  return `http://127.0.0.1:${services.get(name).port}${path}`;
}

async function readJson(response) {
  return { status: response.status, body: await response.json() };
}

// Start the real HTTP services on temporary ports with test-only JWT keys.
// The suite does not require MySQL; database-backed success paths are not exercised.
before(async () => {
  const ports = {};
  for (const name of ["auth", "venue", "booking", "review", "audit"]) {
    ports[name] = await availablePort();
  }

  startService("auth", ports.auth, {
    JWT_PRIVATE_KEY: Buffer.from(keyPair.privateKey.export({ type: "pkcs8", format: "pem" })).toString("base64"),
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    GOOGLE_REDIRECT_URI: "",
    MICROSOFT_CLIENT_ID: "",
    MICROSOFT_CLIENT_SECRET: "",
    MICROSOFT_REDIRECT_URI: "",
  });
  startService("venue", ports.venue, { GATEWAY_INTERNAL_SECRET: gatewaySecret });
  startService("booking", ports.booking);
  startService("review", ports.review);
  startService("audit", ports.audit, { SYSTEM_KEY: systemKey });

  for (const name of ["auth", "venue", "booking", "review", "audit"]) {
    await waitForHealth(name);
  }

  gatewayPort = await availablePort();
  startService("gateway", gatewayPort, {
    AUTH_URL: serviceUrl("auth"),
    VENUE_URL: serviceUrl("venue"),
    BOOKING_URL: serviceUrl("booking"),
    REVIEW_URL: serviceUrl("review"),
    GATEWAY_INTERNAL_SECRET: gatewaySecret,
    JWT_PUBLIC_KEY: Buffer.from(
      keyPair.publicKey.export({ type: "spki", format: "pem" }),
    ).toString("base64"),
  });
  await waitForHealth("gateway");
});

after(async () => {
  for (const { child } of [...services.values()].reverse()) {
    if (child.exitCode === null) {
      const exited = once(child, "exit");
      child.kill();
      await Promise.race([exited, delay(3_000)]);
      if (child.exitCode === null) child.kill("SIGKILL");
    }
  }
  if (forwardingUpstream?.listening) {
    await new Promise((resolveClose, reject) => {
      forwardingUpstream.close((error) => (error ? reject(error) : resolveClose()));
    });
  }
});

// Health checks cover the gateway and each currently implemented backend service.
test("all backend services expose their health endpoint", async () => {
  for (const name of ["gateway", "auth", "venue", "booking", "review", "audit"]) {
    const response = await fetch(serviceUrl(name, "/health"));
    assert.equal(response.status, 200, `${name} health status`);
    assert.deepEqual(await response.json(), { status: "ok", service: name });
  }
});

// Public Auth requests pass through the gateway and retain the Auth service response.
test("gateway routes a public auth request to auth and returns DTO validation errors", async () => {
  const { status, body } = await readJson(await fetch(serviceUrl("gateway", "/auth/user/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "not-an-email" }),
  }));
  assert.equal(status, 400);
  assert.equal(body.code, "user/register/invalidDtoIn");
});

// Auth request validation: sign-in, password reset, and provider sign-in payloads.
test("auth rejects invalid sign-in, reset, and OAuth request DTOs", async () => {
  const scenarios = [
    ["/auth/user/signIn", { email: "bad", password: "" }, "user/signIn/invalidDtoIn"],
    ["/auth/user/requestPasswordReset", {}, "user/requestPasswordReset/invalidDtoIn"],
    [
      "/auth/user/resetPassword",
      { token: "not-a-reset-token", newPassword: "new-password" },
      "user/resetPassword/invalidDtoIn",
    ],
    [
      "/auth/user/signInWithProvider",
      { provider: "google", code: "code", codeVerifier: "short", nonce: "nonce" },
      "user/signInWithProvider/invalidDtoIn",
    ],
  ];

  for (const [path, dtoIn, expectedCode] of scenarios) {
    const { status, body } = await readJson(await fetch(serviceUrl("gateway", path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dtoIn),
    }));
    assert.equal(status, 400, path);
    assert.equal(body.code, expectedCode, path);
  }
});

// OAuth is deliberately unconfigured in this isolated test environment.
test("auth rejects provider login when OAuth credentials are not configured", async () => {
  const { status, body } = await readJson(await fetch(serviceUrl("gateway", "/auth/user/signInWithProvider"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: "google",
      code: "authorization-code",
      codeVerifier: "v".repeat(43),
      nonce: "integration-test-nonce",
    }),
  }));
  assert.equal(status, 400);
  assert.equal(body.code, "user/signInWithProvider/providerNotSupported");
});

// Gateway authentication: missing/invalid tokens and Auth role-selection validation.
test("gateway protects authenticated auth and venue commands", async () => {
  const scenarios = [
    ["GET", "/auth/user/getMe"],
    ["POST", "/auth/user/setRole"],
    ["POST", "/venue/venue/create"],
    ["GET", "/venue/venue/list"],
    ["GET", "/venue/venue/get?id=not-a-uuid"],
  ];
  for (const [method, path] of scenarios) {
    const { status, body } = await readJson(await fetch(serviceUrl("gateway", path), {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? "{}" : undefined,
    }));
    assert.equal(status, 401, path);
    assert.equal(body.code, "user/unauthenticated", path);
  }

  const invalidToken = await readJson(await fetch(serviceUrl("gateway", "/venue/venue/create"), {
    method: "POST",
    headers: { Authorization: "Bearer not-a-valid-token", "Content-Type": "application/json" },
    body: "{}",
  }));
  assert.equal(invalidToken.status, 401);
  assert.equal(invalidToken.body.code, "user/unauthenticated");

  const invalidRole = await readJson(await fetch(serviceUrl("gateway", "/auth/user/setRole"), {
    method: "POST",
    headers: { Authorization: `Bearer ${createToken(null)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "invalid", termsAccepted: true }),
  }));
  assert.equal(invalidRole.status, 400);
  assert.equal(invalidRole.body.code, "user/setRole/invalidDtoIn");
});

// Venue validation and role checks return before DAO calls, so no database is needed.
test("gateway and venue service reject roles and invalid venue DTOs before database access", async () => {
  const athleteToken = createToken("athlete");
  const forbidden = await readJson(await fetch(serviceUrl("gateway", "/venue/venue/create"), {
    method: "POST",
    headers: { Authorization: `Bearer ${athleteToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  }));
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.body.code, "user/forbidden");

  const operatorHeaders = {
    Authorization: `Bearer ${createToken("operator")}`,
    "Content-Type": "application/json",
  };
  const invalidCreate = await readJson(await fetch(serviceUrl("gateway", "/venue/venue/create"), {
    method: "POST",
    headers: operatorHeaders,
    body: JSON.stringify({ name: "   " }),
  }));
  assert.equal(invalidCreate.status, 400);
  assert.equal(invalidCreate.body.code, "venue/invalidDtoIn");
  assert.equal(invalidCreate.body.message, "Vstupní data nejsou validní.");

  const invalidGet = await readJson(await fetch(serviceUrl("gateway", "/venue/venue/get?id=not-a-uuid"), {
    headers: operatorHeaders,
  }));
  assert.equal(invalidGet.status, 400);
  assert.equal(invalidGet.body.code, "venue/invalidDtoIn");

  const invalidUpdate = await readJson(await fetch(serviceUrl("gateway", "/venue/venue/update"), {
    method: "PUT",
    headers: operatorHeaders,
    body: JSON.stringify({ id: "invalid-id" }),
  }));
  assert.equal(invalidUpdate.status, 400);
  assert.equal(invalidUpdate.body.code, "venue/invalidDtoIn");

  const invalidDelete = await readJson(await fetch(serviceUrl("gateway", "/venue/venue/delete?id=invalid-id"), {
    method: "DELETE",
    headers: operatorHeaders,
  }));
  assert.equal(invalidDelete.status, 400);
  assert.equal(invalidDelete.body.code, "venue/invalidDtoIn");

  const invalidSportsGround = await readJson(await fetch(serviceUrl("gateway", "/venue/sportsGround/create"), {
    method: "POST",
    headers: operatorHeaders,
    body: JSON.stringify({ name: "   " }),
  }));
  assert.equal(invalidSportsGround.status, 400);
  assert.equal(invalidSportsGround.body.code, "sportsGround/invalidDtoIn");
});

// Auth service boundary checks for internal requests that bypass the gateway.
test("auth service enforces identity and DTO validation on direct internal calls", async () => {
  const unauthenticated = await readJson(await fetch(serviceUrl("auth", "/user/getMe")));
  assert.equal(unauthenticated.status, 401);
  assert.equal(unauthenticated.body.code, "user/unauthenticated");

  const invalidPassword = await readJson(await fetch(serviceUrl("auth", "/user/setPassword"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": "integration-test-user" },
    body: JSON.stringify({ newPassword: "short" }),
  }));
  assert.equal(invalidPassword.status, 400);
  assert.equal(invalidPassword.body.code, "user/setPassword/invalidDtoIn");
});

// Venue service rejects direct access without gateway secret and validates identity with a valid secret.
test("venue service requires gateway secret and enforces identity headers", async () => {
  const blocked = await readJson(await fetch(serviceUrl("venue", "/venue/list")));
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.code, "user/forbidden");

  const secretHeaders = { "X-Gateway-Secret": gatewaySecret };

  const unauthenticated = await readJson(await fetch(serviceUrl("venue", "/venue/create"), {
    method: "POST",
    headers: { ...secretHeaders, "Content-Type": "application/json" },
    body: "{}",
  }));
  assert.equal(unauthenticated.status, 401);
  assert.equal(unauthenticated.body.code, "user/unauthenticated");

  const forbiddenCreate = await readJson(await fetch(serviceUrl("venue", "/venue/create"), {
    method: "POST",
    headers: {
      ...secretHeaders,
      "Content-Type": "application/json",
      "X-User-Id": "integration-test-user",
      "X-User-Role": "athlete",
    },
    body: "{}",
  }));
  assert.equal(forbiddenCreate.status, 403);
  assert.equal(forbiddenCreate.body.code, "user/forbidden");

  const forbiddenList = await readJson(await fetch(serviceUrl("venue", "/venue/list"), {
    headers: {
      ...secretHeaders,
      "X-User-Id": "integration-test-user",
      "X-User-Role": "athlete",
    },
  }));
  assert.equal(forbiddenList.status, 403);
  assert.equal(forbiddenList.body.code, "user/forbidden");

  const forbiddenGet = await readJson(await fetch(serviceUrl("venue", "/venue/get?id=not-a-uuid"), {
    headers: {
      ...secretHeaders,
      "X-User-Id": "integration-test-user",
      "X-User-Role": "system",
    },
  }));
  assert.equal(forbiddenGet.status, 403);
  assert.equal(forbiddenGet.body.code, "user/forbidden");
});

// Audit middleware rejects invalid keys; a valid key reaches the currently unimplemented route.
test("audit service rejects missing and invalid system credentials", async () => {
  for (const headers of [{}, { "X-System-Key": "wrong-key" }]) {
    const { status, body } = await readJson(await fetch(serviceUrl("audit", "/audit/events"), { headers }));
    assert.equal(status, 403);
    assert.equal(body.code, "user/forbidden");
  }

  const authorized = await fetch(serviceUrl("audit", "/audit/events"), {
    headers: { "X-System-Key": systemKey },
  });
  assert.equal(authorized.status, 404);
});

// Unknown gateway commands are rejected before reaching a backend service.
test("gateway rejects unlisted commands without forwarding them", async () => {
  const { status, body } = await readJson(await fetch(serviceUrl("gateway", "/venue/not-a-command")));
  assert.equal(status, 403);
  assert.equal(body.code, "user/forbidden");
});

// Use a capture server to verify proxy path/body forwarding and replacement of spoofed headers.
test("gateway strips caller-supplied identity headers and forwards the verified identity", async () => {
  let received;
  forwardingUpstream = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    received = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: Buffer.concat(chunks).toString("utf8"),
    };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ forwarded: true }));
  });
  forwardingUpstream.listen(0, "127.0.0.1");
  await once(forwardingUpstream, "listening");
  const forwardingPort = forwardingUpstream.address().port;

  const forwardingGatewayPort = await availablePort();
  startService("gatewayForwarding", forwardingGatewayPort, {
    AUTH_URL: serviceUrl("auth"),
    VENUE_URL: `http://127.0.0.1:${forwardingPort}`,
    BOOKING_URL: serviceUrl("booking"),
    REVIEW_URL: serviceUrl("review"),
    GATEWAY_INTERNAL_SECRET: gatewaySecret,
    JWT_PUBLIC_KEY: Buffer.from(
      keyPair.publicKey.export({ type: "spki", format: "pem" }),
    ).toString("base64"),
  });
  await waitForHealth("gatewayForwarding");

  const response = await fetch(serviceUrl("gatewayForwarding", "/venue/venue/create?source=test"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${createToken("operator")}`,
      "Content-Type": "application/json",
      "X-User-Id": "spoofed-user",
      "X-User-Role": "operator",
      "X-System-Key": "spoofed-key",
      "X-Gateway-Secret": "spoofed-secret",
    },
    body: JSON.stringify({ name: "Integration venue" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { forwarded: true });
  assert.equal(received.method, "POST");
  assert.equal(received.url, "/venue/create?source=test");
  assert.equal(received.headers["x-user-id"], "integration-test-user");
  assert.equal(received.headers["x-user-role"], "operator");
  assert.equal(received.headers["x-system-key"], undefined);
  assert.equal(received.headers["x-gateway-secret"], gatewaySecret);
  assert.equal(received.headers.authorization, undefined);
  assert.deepEqual(JSON.parse(received.body), { name: "Integration venue" });
});
