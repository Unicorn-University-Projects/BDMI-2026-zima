// Pomocné funkce pro testy gateway. Nepotřebují databázi ani běžící služby.
import crypto from "node:crypto";
import http from "node:http";
import jwt from "jsonwebtoken";

export const FRONTEND_URL = "http://localhost:5173";
export const USER_ID = "a0000000-0000-4000-8000-000000000003";

// Dvojice RSA klíčů vygenerovaná jen pro testy (stejný formát, jaký používá auth).
export function createKeyPair() {
  return crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
}

export function toBase64(text) {
  return Buffer.from(text, "utf8").toString("base64");
}

// Platný RS256 token. Bez `exp` v payloadu platí hodinu.
export function createToken(privateKey, payload = {}, options = {}) {
  const signOptions = { algorithm: "RS256", ...options };
  if (payload.exp === undefined && signOptions.expiresIn === undefined) {
    signOptions.expiresIn = "1h";
  }
  return jwt.sign(payload, privateKey, signOptions);
}

// Ručně složený token s libovolným algoritmem – pro útoky typu „alg: HS256“ a „alg: none“.
export function forgeToken(header, payload, secret) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const data = `${encode(header)}.${encode(payload)}`;
  if (!secret) return `${data}.`;
  const signature = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
}

// Spustí HTTP server (Express aplikaci nebo obyčejný handler) na volném portu.
export async function listen(handler) {
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  const close = () =>
    new Promise((resolve) => {
      server.closeAllConnections();
      server.close(() => resolve());
    });
  return { url, close };
}

// Falešná služba: vrátí, co od gateway dostala (metodu, cestu, hlavičky a tělo).
export function createEchoService(name) {
  return (req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ service: name, method: req.method, url: req.url, headers: req.headers, body }));
    });
  };
}

// Adresa, na které nic neběží – simuluje nedostupnou službu.
export async function getUnusedUrl() {
  const server = await listen((req, res) => res.end());
  await server.close();
  return server.url;
}

// Spustí gateway proti falešným službám auth, venue a booking.
// Služba review je schválně nedostupná (test chyby 502).
// Proměnné prostředí se musí nastavit PŘED importem aplikace, protože je
// authenticate.js a permissions.js čtou hned při načtení.
export async function startGateway() {
  const keys = createKeyPair();
  const services = {
    auth: await listen(createEchoService("auth")),
    venue: await listen(createEchoService("venue")),
    booking: await listen(createEchoService("booking")),
  };

  process.env.JWT_PUBLIC_KEY = toBase64(keys.publicKey);
  process.env.FRONTEND_URL = FRONTEND_URL;
  process.env.AUTH_URL = services.auth.url;
  process.env.VENUE_URL = services.venue.url;
  process.env.BOOKING_URL = services.booking.url;
  process.env.GATEWAY_INTERNAL_SECRET ??= "test-gateway-secret";
  process.env.REVIEW_URL = await getUnusedUrl();

  const { default: app } = await import("../src/app.js");
  const gateway = await listen(app);

  const tokenFor = (role, payload = {}) => createToken(keys.privateKey, { role, ...payload }, { subject: USER_ID });

  async function call(path, { method = "POST", token, headers = {}, body } = {}) {
    const requestHeaders = { ...headers };
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
    if (body !== undefined) requestHeaders["Content-Type"] = "application/json";
    const res = await fetch(`${gateway.url}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: res.status, headers: res.headers, body: json };
  }

  async function close() {
    await gateway.close();
    await Promise.all(Object.values(services).map((service) => service.close()));
  }

  return { keys, tokenFor, call, close };
}
