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

function createToken(role, userId = "integration-test-user") {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, role }),
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
  startService("venue", ports.venue, {
    GATEWAY_INTERNAL_SECRET: gatewaySecret,
    VENUE_MEMORY_DB: "1",
  });
  startService("booking", ports.booking, {
    GATEWAY_INTERNAL_SECRET: gatewaySecret,
    BOOKING_MEMORY_DB: "1",
    VENUE_URL: `http://127.0.0.1:${ports.venue}`,
  });
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

function weekOpeningHours({ openFrom = "08:00", openTo = "22:00", closedDays = [] } = {}) {
  return Array.from({ length: 7 }, (_, index) => {
    const dayOfWeek = index + 1;
    const isClosed = closedDays.includes(dayOfWeek);
    return {
      dayOfWeek,
      isClosed,
      openFrom: isClosed ? null : openFrom,
      openTo: isClosed ? null : openTo,
    };
  });
}

test("sports ground starts inactive, stays hidden from athletes until hours and price list are set", async () => {
  const operatorHeaders = {
    Authorization: `Bearer ${createToken("operator")}`,
    "Content-Type": "application/json",
  };
  const athleteHeaders = {
    Authorization: `Bearer ${createToken("athlete")}`,
    "Content-Type": "application/json",
  };

  const venue = await readJson(await fetch(serviceUrl("gateway", "/venue/venue/create"), {
    method: "POST",
    headers: operatorHeaders,
    body: JSON.stringify({
      name: "US08 Areál",
      street: "Sportovní",
      streetNumber: "1",
      city: "Praha",
      emailAddress: "us08@example.com",
      phoneNumber: "+420777000111",
    }),
  }));
  assert.equal(venue.status, 201, JSON.stringify(venue.body));
  const venueId = venue.body.venue.id;

  const created = await readJson(await fetch(serviceUrl("gateway", "/venue/sportsGround/create"), {
    method: "POST",
    headers: operatorHeaders,
    body: JSON.stringify({
      venueId,
      sportCode: "tennis",
      name: "Kurt A",
      surface: "antuka",
      coverType: "outdoor",
      status: "active",
    }),
  }));
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.sportsGround.status, "inactive");
  const sportsGroundId = created.body.sportsGround.id;

  const athleteList = await readJson(await fetch(
    serviceUrl("gateway", `/venue/sportsGround/list?venueId=${venueId}`),
    { headers: athleteHeaders },
  ));
  assert.equal(athleteList.status, 200);
  assert.equal(athleteList.body.itemList.length, 0);

  const athleteGet = await readJson(await fetch(
    serviceUrl("gateway", `/venue/sportsGround/get?id=${sportsGroundId}`),
    { headers: athleteHeaders },
  ));
  assert.equal(athleteGet.status, 404);
  assert.equal(athleteGet.body.code, "sportsGround/notFound");

  const operatorGet = await readJson(await fetch(
    serviceUrl("gateway", `/venue/sportsGround/get?id=${sportsGroundId}`),
    { headers: operatorHeaders },
  ));
  assert.equal(operatorGet.status, 200);
  assert.equal(operatorGet.body.sportsGround.status, "inactive");

  const invalidOpenTo = await readJson(await fetch(
    serviceUrl("gateway", "/venue/sportsGround/setOpeningHoursAndPriceList"),
    {
      method: "POST",
      headers: operatorHeaders,
      body: JSON.stringify({
        sportsGroundId,
        openingHours: weekOpeningHours({ openFrom: "18:00", openTo: "10:00" }),
        priceList: { basePrice: 400, hasPeak: false },
      }),
    },
  ));
  assert.equal(invalidOpenTo.status, 400);
  assert.equal(invalidOpenTo.body.code, "sportsGround/invalidOpeningHours");
  assert.equal(invalidOpenTo.body.message, "Konec otevírací doby musí být později než začátek.");

  const peakOutside = await readJson(await fetch(
    serviceUrl("gateway", "/venue/sportsGround/setOpeningHoursAndPriceList"),
    {
      method: "POST",
      headers: operatorHeaders,
      body: JSON.stringify({
        id: sportsGroundId,
        openingHours: weekOpeningHours({ openFrom: "08:00", openTo: "16:00" }),
        priceList: {
          basePrice: 400,
          hasPeak: true,
          peakPrice: 600,
          peakDays: [1, 2],
          peakFrom: "15:00",
          peakTo: "18:00",
        },
      }),
    },
  ));
  assert.equal(peakOutside.status, 400);
  assert.equal(peakOutside.body.code, "sportsGround/peakOutsideOpeningHours");
  assert.equal(peakOutside.body.message, "Čas špičky musí být v rámci otevírací doby.");

  const saved = await readJson(await fetch(
    serviceUrl("gateway", "/venue/sportsGround/setOpeningHoursAndPriceList"),
    {
      method: "PUT",
      headers: operatorHeaders,
      body: JSON.stringify({
        sportsGroundId,
        openingHours: weekOpeningHours({ openFrom: "08:00", openTo: "22:00", closedDays: [7] }),
        basePrice: 450,
        hasPeak: true,
        peakPrice: 650,
        peakDays: [1, 2, 3],
        peakFrom: "17:00",
        peakTo: "21:00",
      }),
    },
  ));
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.sportsGround.status, "active");
  assert.equal(saved.body.sportsGround.priceList.regularPrice, 450);
  assert.equal(saved.body.sportsGround.priceList.hasPeak, true);
  assert.deepEqual(saved.body.sportsGround.priceList.peakDays, [1, 2, 3]);
  assert.equal(saved.body.sportsGround.openingHours.length, 7);
  assert.equal(saved.body.sportsGround.openingHours[6].isClosed, true);

  const athleteListAfter = await readJson(await fetch(
    serviceUrl("gateway", `/venue/sportsGround/list?venueId=${venueId}`),
    { headers: athleteHeaders },
  ));
  assert.equal(athleteListAfter.status, 200);
  assert.equal(athleteListAfter.body.itemList.length, 1);
  assert.equal(athleteListAfter.body.itemList[0].id, sportsGroundId);
  assert.equal(athleteListAfter.body.itemList[0].status, "active");

  const athleteGetAfter = await readJson(await fetch(
    serviceUrl("gateway", `/venue/sportsGround/get?id=${sportsGroundId}`),
    { headers: athleteHeaders },
  ));
  assert.equal(athleteGetAfter.status, 200);
  assert.equal(athleteGetAfter.body.sportsGround.status, "active");
});

test("gateway, venue and booking fail fast without GATEWAY_INTERNAL_SECRET", async () => {
  for (const [name, directory, extraEnv] of [
    ["venue", resolve(repoRoot, "services/venue"), { VENUE_MEMORY_DB: "1" }],
    ["booking", resolve(repoRoot, "services/booking"), { BOOKING_MEMORY_DB: "1", VENUE_URL: "http://127.0.0.1:9" }],
    ["gateway", resolve(repoRoot, "gateway"), {}],
  ]) {
    const port = await availablePort();
    const env = { ...process.env, PORT: String(port), ...extraEnv };
    delete env.GATEWAY_INTERNAL_SECRET;
    const child = spawn(process.execPath, ["src/server.js"], {
      cwd: directory,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stderr.setEncoding("utf8").on("data", (chunk) => {
      output += chunk;
    });
    child.stdout.setEncoding("utf8").on("data", (chunk) => {
      output += chunk;
    });
    const [code] = await Promise.race([
      once(child, "exit"),
      delay(5_000).then(() => {
        child.kill("SIGKILL");
        return ["timeout"];
      }),
    ]);
    assert.notEqual(code, 0, `${name} should exit when secret is missing:\n${output}`);
    assert.match(output, /GATEWAY_INTERNAL_SECRET/);
  }
});

test("venue validation rejects invalid phone and oversized fields", async () => {
  const headers = {
    Authorization: `Bearer ${createToken("operator")}`,
    "Content-Type": "application/json",
  };
  const invalidPhone = await readJson(await fetch(serviceUrl("gateway", "/venue/venue/create"), {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Telefon Areál",
      street: "Ulice",
      streetNumber: "1",
      city: "Praha",
      emailAddress: "phone@example.com",
      phoneNumber: "zavolejte mi",
    }),
  }));
  assert.equal(invalidPhone.status, 400);
  assert.equal(invalidPhone.body.code, "venue/invalidDtoIn");
  assert.ok(invalidPhone.body.params.invalidFields.includes("phoneNumber"));

  const tooLong = await readJson(await fetch(serviceUrl("gateway", "/venue/venue/create"), {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "N".repeat(101),
      street: "S".repeat(101),
      streetNumber: "1".repeat(21),
      city: "C".repeat(101),
      emailAddress: "long@example.com",
      phoneNumber: "+420777000222",
      operatorNote: "X".repeat(501),
    }),
  }));
  assert.equal(tooLong.status, 400);
  assert.equal(tooLong.body.code, "venue/invalidDtoIn");
  for (const field of ["name", "street", "streetNumber", "city", "operatorNote"]) {
    assert.ok(tooLong.body.params.invalidFields.includes(field), field);
  }

  const created = await readJson(await fetch(serviceUrl("gateway", "/venue/venue/create"), {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Oddělená adresa",
      street: "Sportovní",
      streetNumber: "12A",
      city: "Brno",
      emailAddress: "street@example.com",
      phoneNumber: "+420777000333",
    }),
  }));
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.venue.street, "Sportovní");
  assert.equal(created.body.venue.streetNumber, "12A");
});

test("sportsGround list requires venueId and hides inactive grounds from foreign operators", async () => {
  const ownerHeaders = {
    Authorization: `Bearer ${createToken("operator", "owner-operator")}`,
    "Content-Type": "application/json",
  };
  const foreignHeaders = {
    Authorization: `Bearer ${createToken("operator", "foreign-operator")}`,
    "Content-Type": "application/json",
  };

  const missingVenueId = await readJson(await fetch(
    serviceUrl("gateway", "/venue/sportsGround/list"),
    { headers: ownerHeaders },
  ));
  assert.equal(missingVenueId.status, 400);
  assert.equal(missingVenueId.body.code, "sportsGround/invalidDtoIn");
  assert.ok(missingVenueId.body.params.invalidFields.includes("venueId"));

  const venue = await readJson(await fetch(serviceUrl("gateway", "/venue/venue/create"), {
    method: "POST",
    headers: ownerHeaders,
    body: JSON.stringify({
      name: "NP03 Areál",
      street: "Skrytá",
      streetNumber: "9",
      city: "Praha",
      emailAddress: "np03@example.com",
      phoneNumber: "+420777000444",
    }),
  }));
  assert.equal(venue.status, 201, JSON.stringify(venue.body));
  const venueId = venue.body.venue.id;

  const created = await readJson(await fetch(serviceUrl("gateway", "/venue/sportsGround/create"), {
    method: "POST",
    headers: ownerHeaders,
    body: JSON.stringify({
      venueId,
      sportCode: "tennis",
      name: "Skrytý kurt",
      surface: "antuka",
      coverType: "outdoor",
    }),
  }));
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const sportsGroundId = created.body.sportsGround.id;
  assert.equal(created.body.sportsGround.status, "inactive");

  const foreignList = await readJson(await fetch(
    serviceUrl("gateway", `/venue/sportsGround/list?venueId=${venueId}`),
    { headers: foreignHeaders },
  ));
  assert.equal(foreignList.status, 200);
  assert.equal(foreignList.body.itemList.length, 0);

  const foreignGet = await readJson(await fetch(
    serviceUrl("gateway", `/venue/sportsGround/get?id=${sportsGroundId}`),
    { headers: foreignHeaders },
  ));
  assert.equal(foreignGet.status, 404);
  assert.equal(foreignGet.body.code, "sportsGround/notFound");

  const ownerList = await readJson(await fetch(
    serviceUrl("gateway", `/venue/sportsGround/list?venueId=${venueId}`),
    { headers: ownerHeaders },
  ));
  assert.equal(ownerList.status, 200);
  assert.equal(ownerList.body.itemList.length, 1);
  assert.equal(ownerList.body.itemList[0].status, "inactive");
});

test("sportsGround create and update reject duplicate names in the same venue", async () => {
  const headers = {
    Authorization: `Bearer ${createToken("operator")}`,
    "Content-Type": "application/json",
  };
  const venue = await readJson(await fetch(serviceUrl("gateway", "/venue/venue/create"), {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Duplikát Areál",
      street: "Duplicitní",
      streetNumber: "1",
      city: "Praha",
      emailAddress: "dup@example.com",
      phoneNumber: "+420777000555",
    }),
  }));
  assert.equal(venue.status, 201, JSON.stringify(venue.body));
  const venueId = venue.body.venue.id;

  const first = await readJson(await fetch(serviceUrl("gateway", "/venue/sportsGround/create"), {
    method: "POST",
    headers,
    body: JSON.stringify({
      venueId,
      sportCode: "tennis",
      name: "Kurt 1",
      surface: "antuka",
      coverType: "outdoor",
    }),
  }));
  assert.equal(first.status, 201, JSON.stringify(first.body));

  const duplicateCreate = await readJson(await fetch(serviceUrl("gateway", "/venue/sportsGround/create"), {
    method: "POST",
    headers,
    body: JSON.stringify({
      venueId,
      sportCode: "badminton",
      name: "kurt 1",
      surface: "PVC",
      coverType: "indoor",
    }),
  }));
  assert.equal(duplicateCreate.status, 409);
  assert.equal(duplicateCreate.body.code, "sportsGround/create/sportsGroundAlreadyExists");
  assert.equal(duplicateCreate.body.message, "Sportoviště s tímto názvem v areálu již existuje.");

  const second = await readJson(await fetch(serviceUrl("gateway", "/venue/sportsGround/create"), {
    method: "POST",
    headers,
    body: JSON.stringify({
      venueId,
      sportCode: "squash",
      name: "Kurt 2",
      surface: "parkety",
      coverType: "indoor",
    }),
  }));
  assert.equal(second.status, 201, JSON.stringify(second.body));

  const duplicateUpdate = await readJson(await fetch(serviceUrl("gateway", "/venue/sportsGround/update"), {
    method: "PUT",
    headers,
    body: JSON.stringify({
      id: second.body.sportsGround.id,
      sportCode: "squash",
      name: "Kurt 1",
      surface: "parkety",
      coverType: "indoor",
    }),
  }));
  assert.equal(duplicateUpdate.status, 409);
  assert.equal(duplicateUpdate.body.code, "sportsGround/update/sportsGroundAlreadyExists");
});

test("opening hours and price list reject invalid peak, prices, and accept 24:00", async () => {
  const headers = {
    Authorization: `Bearer ${createToken("operator")}`,
    "Content-Type": "application/json",
  };
  const venue = await readJson(await fetch(serviceUrl("gateway", "/venue/venue/create"), {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "US08 Edge Areál",
      street: "Hraniční",
      streetNumber: "24",
      city: "Praha",
      emailAddress: "edge@example.com",
      phoneNumber: "+420777000666",
    }),
  }));
  assert.equal(venue.status, 201, JSON.stringify(venue.body));

  const created = await readJson(await fetch(serviceUrl("gateway", "/venue/sportsGround/create"), {
    method: "POST",
    headers,
    body: JSON.stringify({
      venueId: venue.body.venue.id,
      sportCode: "tennis",
      name: "Noční kurt",
      surface: "antuka",
      coverType: "outdoor",
    }),
  }));
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const sportsGroundId = created.body.sportsGround.id;

  const tinyPrice = await readJson(await fetch(
    serviceUrl("gateway", "/venue/sportsGround/setOpeningHoursAndPriceList"),
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        sportsGroundId,
        openingHours: weekOpeningHours({ openFrom: "08:00", openTo: "22:00" }),
        priceList: { basePrice: 0.001, hasPeak: false },
      }),
    },
  ));
  assert.equal(tinyPrice.status, 400);
  assert.equal(tinyPrice.body.code, "sportsGround/invalidDtoIn");
  assert.ok(tinyPrice.body.params.invalidFields.includes("basePrice"));

  const hugePrice = await readJson(await fetch(
    serviceUrl("gateway", "/venue/sportsGround/setOpeningHoursAndPriceList"),
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        sportsGroundId,
        openingHours: weekOpeningHours({ openFrom: "08:00", openTo: "22:00" }),
        priceList: { basePrice: 10_000_000, hasPeak: false },
      }),
    },
  ));
  assert.equal(hugePrice.status, 400);
  assert.equal(hugePrice.body.code, "sportsGround/invalidDtoIn");
  assert.ok(hugePrice.body.params.invalidFields.includes("basePrice"));

  const reversedPeak = await readJson(await fetch(
    serviceUrl("gateway", "/venue/sportsGround/setOpeningHoursAndPriceList"),
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        sportsGroundId,
        openingHours: weekOpeningHours({ openFrom: "08:00", openTo: "22:00" }),
        priceList: {
          basePrice: 400,
          hasPeak: true,
          peakPrice: 600,
          peakDays: [1, 2],
          peakFrom: "18:00",
          peakTo: "17:00",
        },
      }),
    },
  ));
  assert.equal(reversedPeak.status, 400);
  assert.equal(reversedPeak.body.code, "sportsGround/invalidPeakTime");
  assert.equal(reversedPeak.body.message, "Konec špičky musí být později než začátek.");
  assert.equal(reversedPeak.body.params.field, "peak");

  const invalidPeakDay = await readJson(await fetch(
    serviceUrl("gateway", "/venue/sportsGround/setOpeningHoursAndPriceList"),
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        sportsGroundId,
        openingHours: weekOpeningHours({ openFrom: "08:00", openTo: "22:00" }),
        priceList: {
          basePrice: 400,
          hasPeak: true,
          peakPrice: 600,
          peakDays: [1, 8],
          peakFrom: "17:00",
          peakTo: "21:00",
        },
      }),
    },
  ));
  assert.equal(invalidPeakDay.status, 400);
  assert.equal(invalidPeakDay.body.code, "sportsGround/invalidDtoIn");
  assert.deepEqual(invalidPeakDay.body.params.invalidFields, ["peakDays"]);

  const duplicatePeakDay = await readJson(await fetch(
    serviceUrl("gateway", "/venue/sportsGround/setOpeningHoursAndPriceList"),
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        sportsGroundId,
        openingHours: weekOpeningHours({ openFrom: "08:00", openTo: "22:00" }),
        priceList: {
          basePrice: 400,
          hasPeak: true,
          peakPrice: 600,
          peakDays: [1, 1],
          peakFrom: "17:00",
          peakTo: "21:00",
        },
      }),
    },
  ));
  assert.equal(duplicatePeakDay.status, 400);
  assert.equal(duplicatePeakDay.body.code, "sportsGround/invalidDtoIn");
  assert.deepEqual(duplicatePeakDay.body.params.invalidFields, ["peakDays"]);

  const untilMidnight = await readJson(await fetch(
    serviceUrl("gateway", "/venue/sportsGround/setOpeningHoursAndPriceList"),
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        sportsGroundId,
        openingHours: weekOpeningHours({ openFrom: "23:00", openTo: "24:00" }),
        priceList: {
          basePrice: 500,
          hasPeak: true,
          peakPrice: 700,
          peakDays: [1, 2, 3, 4, 5],
          peakFrom: "23:00",
          peakTo: "24:00",
        },
      }),
    },
  ));
  assert.equal(untilMidnight.status, 200, JSON.stringify(untilMidnight.body));
  assert.equal(untilMidnight.body.sportsGround.status, "active");
  assert.equal(untilMidnight.body.sportsGround.openingHours[0].openTo, "24:00");
  assert.equal(untilMidnight.body.sportsGround.priceList.peakTo, "24:00");
});

function utcDayOfWeek(dateStr) {
  const jsDay = new Date(`${dateStr}T00:00:00.000Z`).getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}

function nextUtcDateForDayOfWeek(dayOfWeek, minHoursAhead = 36) {
  const start = new Date(Date.now() + minHoursAhead * 3600_000);
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  for (let i = 0; i < 8; i += 1) {
    if (utcDayOfWeek(cursor.toISOString().slice(0, 10)) === dayOfWeek) {
      return cursor.toISOString().slice(0, 10);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  throw new Error(`No date found for dayOfWeek=${dayOfWeek}`);
}

async function createActiveGroundForBooking({
  operatorId = "booking-operator",
  name,
  openFrom = "08:00",
  openTo = "22:00",
  closedDays = [],
  priceList = { basePrice: 400, hasPeak: false },
}) {
  const operatorHeaders = {
    Authorization: `Bearer ${createToken("operator", operatorId)}`,
    "Content-Type": "application/json",
  };
  const venue = await readJson(await fetch(serviceUrl("gateway", "/venue/venue/create"), {
    method: "POST",
    headers: operatorHeaders,
    body: JSON.stringify({
      name: `Areál ${name}`,
      street: "Sportovní",
      streetNumber: "1",
      city: "Praha",
      emailAddress: `${name.replace(/\s+/g, "-").toLowerCase()}@example.com`,
      phoneNumber: "+420777000222",
    }),
  }));
  assert.equal(venue.status, 201, JSON.stringify(venue.body));

  const created = await readJson(await fetch(serviceUrl("gateway", "/venue/sportsGround/create"), {
    method: "POST",
    headers: operatorHeaders,
    body: JSON.stringify({
      venueId: venue.body.venue.id,
      sportCode: "tennis",
      name,
      surface: "antuka",
      coverType: "outdoor",
    }),
  }));
  assert.equal(created.status, 201, JSON.stringify(created.body));

  const activated = await readJson(await fetch(
    serviceUrl("gateway", "/venue/sportsGround/setOpeningHoursAndPriceList"),
    {
      method: "POST",
      headers: operatorHeaders,
      body: JSON.stringify({
        sportsGroundId: created.body.sportsGround.id,
        openingHours: weekOpeningHours({ openFrom, openTo, closedDays }),
        priceList,
      }),
    },
  ));
  assert.equal(activated.status, 200, JSON.stringify(activated.body));
  return {
    operatorHeaders,
    venueId: venue.body.venue.id,
    sportsGroundId: created.body.sportsGround.id,
  };
}

test("reservation/create stores base and peak price and rejects unavailable slots", async () => {
  const athleteId = "booking-athlete-1";
  const athleteHeaders = {
    Authorization: `Bearer ${createToken("athlete", athleteId)}`,
    "Content-Type": "application/json",
  };
  const { operatorHeaders, sportsGroundId } = await createActiveGroundForBooking({
    name: "Rezervace Peak Kurt",
    openFrom: "08:00",
    openTo: "22:00",
    priceList: {
      basePrice: 400,
      hasPeak: true,
      peakPrice: 650,
      peakDays: [1, 2, 3, 4, 5],
      peakFrom: "16:00",
      peakTo: "20:00",
    },
  });

  const baseDate = nextUtcDateForDayOfWeek(1);
  const peakDate = nextUtcDateForDayOfWeek(2);

  const baseReservation = await readJson(await fetch(serviceUrl("gateway", "/booking/reservation/create"), {
    method: "POST",
    headers: athleteHeaders,
    body: JSON.stringify({
      sportsGroundId,
      date: baseDate,
      startTime: "10:00",
      note: "základní cena",
    }),
  }));
  assert.equal(baseReservation.status, 201, JSON.stringify(baseReservation.body));
  assert.equal(baseReservation.body.reservation.state, "created");
  assert.equal(baseReservation.body.reservation.athleteId, athleteId);
  assert.equal(baseReservation.body.reservation.price, 400);
  assert.equal(baseReservation.body.reservation.isPeak, false);
  assert.equal(baseReservation.body.reservation.endTime, "11:00");
  assert.equal(baseReservation.body.reservation.rejectionReason, null);

  const peakReservation = await readJson(await fetch(serviceUrl("gateway", "/booking/reservation/create"), {
    method: "POST",
    headers: athleteHeaders,
    body: JSON.stringify({
      sportsGroundId,
      date: peakDate,
      startTime: "17:00",
    }),
  }));
  assert.equal(peakReservation.status, 201, JSON.stringify(peakReservation.body));
  assert.equal(peakReservation.body.reservation.price, 650);
  assert.equal(peakReservation.body.reservation.isPeak, true);
  assert.equal(peakReservation.body.reservation.endTime, "18:00");

  const updatedPriceList = await readJson(await fetch(
    serviceUrl("gateway", "/venue/sportsGround/setOpeningHoursAndPriceList"),
    {
      method: "POST",
      headers: operatorHeaders,
      body: JSON.stringify({
        sportsGroundId,
        openingHours: weekOpeningHours({ openFrom: "08:00", openTo: "22:00" }),
        priceList: {
          basePrice: 500,
          hasPeak: true,
          peakPrice: 900,
          peakDays: [1, 2, 3, 4, 5],
          peakFrom: "16:00",
          peakTo: "20:00",
        },
      }),
    },
  ));
  assert.equal(updatedPriceList.status, 200, JSON.stringify(updatedPriceList.body));

  const laterPeakDate = nextUtcDateForDayOfWeek(3);
  const afterChange = await readJson(await fetch(serviceUrl("gateway", "/booking/reservation/create"), {
    method: "POST",
    headers: athleteHeaders,
    body: JSON.stringify({
      sportsGroundId,
      date: laterPeakDate,
      startTime: "18:00",
    }),
  }));
  assert.equal(afterChange.status, 201, JSON.stringify(afterChange.body));
  assert.equal(afterChange.body.reservation.price, 900);
  assert.equal(peakReservation.body.reservation.price, 650);

  const duplicate = await readJson(await fetch(serviceUrl("gateway", "/booking/reservation/create"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${createToken("athlete", "booking-athlete-2")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sportsGroundId,
      date: peakDate,
      startTime: "17:00",
    }),
  }));
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.code, "reservation/create/slotUnavailable");
  assert.equal(duplicate.body.message, "Tento termín už není volný.");
});

test("reservation/create rejects unauthorized roles and unavailable sports grounds", async () => {
  const { sportsGroundId } = await createActiveGroundForBooking({
    name: "Rezervace Auth Kurt",
    priceList: { basePrice: 350, hasPeak: false },
  });
  const futureDate = nextUtcDateForDayOfWeek(3);

  const unauthenticated = await readJson(await fetch(serviceUrl("gateway", "/booking/reservation/create"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sportsGroundId,
      date: futureDate,
      startTime: "10:00",
    }),
  }));
  assert.equal(unauthenticated.status, 401);
  assert.equal(unauthenticated.body.code, "user/unauthenticated");

  const operatorForbidden = await readJson(await fetch(serviceUrl("gateway", "/booking/reservation/create"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${createToken("operator", "booking-operator-forbidden")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sportsGroundId,
      date: futureDate,
      startTime: "10:00",
    }),
  }));
  assert.equal(operatorForbidden.status, 403);
  assert.equal(operatorForbidden.body.code, "user/forbidden");

  const missingGround = await readJson(await fetch(serviceUrl("gateway", "/booking/reservation/create"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${createToken("athlete", "booking-athlete-missing")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sportsGroundId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      date: futureDate,
      startTime: "10:00",
    }),
  }));
  assert.equal(missingGround.status, 404);
  assert.equal(missingGround.body.code, "reservation/create/sportsGroundNotAvailable");

  const operatorHeaders = {
    Authorization: `Bearer ${createToken("operator", "booking-operator-inactive")}`,
    "Content-Type": "application/json",
  };
  const venue = await readJson(await fetch(serviceUrl("gateway", "/venue/venue/create"), {
    method: "POST",
    headers: operatorHeaders,
    body: JSON.stringify({
      name: "Neaktivní Areál",
      street: "Sportovní",
      streetNumber: "9",
      city: "Brno",
      emailAddress: "inactive-booking@example.com",
      phoneNumber: "+420777000333",
    }),
  }));
  assert.equal(venue.status, 201, JSON.stringify(venue.body));
  const inactive = await readJson(await fetch(serviceUrl("gateway", "/venue/sportsGround/create"), {
    method: "POST",
    headers: operatorHeaders,
    body: JSON.stringify({
      venueId: venue.body.venue.id,
      sportCode: "tennis",
      name: "Neaktivní kurt",
      surface: "antuka",
      coverType: "outdoor",
    }),
  }));
  assert.equal(inactive.status, 201, JSON.stringify(inactive.body));
  assert.equal(inactive.body.sportsGround.status, "inactive");

  const inactiveReject = await readJson(await fetch(serviceUrl("gateway", "/booking/reservation/create"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${createToken("athlete", "booking-athlete-inactive")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sportsGroundId: inactive.body.sportsGround.id,
      date: futureDate,
      startTime: "10:00",
    }),
  }));
  assert.equal(inactiveReject.status, 404);
  assert.equal(inactiveReject.body.code, "reservation/create/sportsGroundNotAvailable");
});

test("reservation/create rejects past slots, closed days and hours outside opening time", async () => {
  const athleteHeaders = {
    Authorization: `Bearer ${createToken("athlete", "booking-athlete-hours")}`,
    "Content-Type": "application/json",
  };
  const { sportsGroundId } = await createActiveGroundForBooking({
    name: "Rezervace Hodiny Kurt",
    openFrom: "08:00",
    openTo: "24:00",
    closedDays: [7],
    priceList: { basePrice: 420, hasPeak: false },
  });

  const past = await readJson(await fetch(serviceUrl("gateway", "/booking/reservation/create"), {
    method: "POST",
    headers: athleteHeaders,
    body: JSON.stringify({
      sportsGroundId,
      date: "2020-01-06",
      startTime: "10:00",
    }),
  }));
  assert.equal(past.status, 400);
  assert.equal(past.body.code, "reservation/create/slotInPast");

  const sunday = nextUtcDateForDayOfWeek(7);
  const closedDay = await readJson(await fetch(serviceUrl("gateway", "/booking/reservation/create"), {
    method: "POST",
    headers: athleteHeaders,
    body: JSON.stringify({
      sportsGroundId,
      date: sunday,
      startTime: "10:00",
    }),
  }));
  assert.equal(closedDay.status, 400);
  assert.equal(closedDay.body.code, "reservation/create/outsideOpeningHours");

  const beforeOpen = await readJson(await fetch(serviceUrl("gateway", "/booking/reservation/create"), {
    method: "POST",
    headers: athleteHeaders,
    body: JSON.stringify({
      sportsGroundId,
      date: nextUtcDateForDayOfWeek(1),
      startTime: "07:00",
    }),
  }));
  assert.equal(beforeOpen.status, 400);
  assert.equal(beforeOpen.body.code, "reservation/create/outsideOpeningHours");

  const untilMidnight = await readJson(await fetch(serviceUrl("gateway", "/booking/reservation/create"), {
    method: "POST",
    headers: athleteHeaders,
    body: JSON.stringify({
      sportsGroundId,
      date: nextUtcDateForDayOfWeek(2),
      startTime: "23:00",
    }),
  }));
  assert.equal(untilMidnight.status, 201, JSON.stringify(untilMidnight.body));
  assert.equal(untilMidnight.body.reservation.endTime, "24:00");
  assert.equal(untilMidnight.body.reservation.price, 420);
});

test("reservation/create rejects invalid dtoIn values", async () => {
  const athleteHeaders = {
    Authorization: `Bearer ${createToken("athlete", "booking-athlete-dto")}`,
    "Content-Type": "application/json",
  };
  const { sportsGroundId } = await createActiveGroundForBooking({
    name: "Rezervace DTO Kurt",
    priceList: { basePrice: 300, hasPeak: false },
  });
  const futureDate = nextUtcDateForDayOfWeek(4);

  const halfHour = await readJson(await fetch(serviceUrl("gateway", "/booking/reservation/create"), {
    method: "POST",
    headers: athleteHeaders,
    body: JSON.stringify({
      sportsGroundId,
      date: futureDate,
      startTime: "10:30",
    }),
  }));
  assert.equal(halfHour.status, 400);
  assert.equal(halfHour.body.code, "reservation/invalidDtoIn");
  assert.ok(halfHour.body.params.invalidFields.includes("startTime"));

  const invalidDate = await readJson(await fetch(serviceUrl("gateway", "/booking/reservation/create"), {
    method: "POST",
    headers: athleteHeaders,
    body: JSON.stringify({
      sportsGroundId,
      date: "2026-02-30",
      startTime: "10:00",
    }),
  }));
  assert.equal(invalidDate.status, 400);
  assert.equal(invalidDate.body.code, "reservation/invalidDtoIn");
  assert.ok(invalidDate.body.params.invalidFields.includes("date"));

  const longNote = await readJson(await fetch(serviceUrl("gateway", "/booking/reservation/create"), {
    method: "POST",
    headers: athleteHeaders,
    body: JSON.stringify({
      sportsGroundId,
      date: futureDate,
      startTime: "11:00",
      note: "x".repeat(201),
    }),
  }));
  assert.equal(longNote.status, 400);
  assert.equal(longNote.body.code, "reservation/invalidDtoIn");
  assert.ok(longNote.body.params.invalidFields.includes("note"));
});
