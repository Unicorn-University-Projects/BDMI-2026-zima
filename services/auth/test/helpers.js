// Pomocné funkce pro testy auth bez databáze.
import crypto from "node:crypto";
import http from "node:http";

export const USER_ID = "a0000000-0000-4000-8000-000000000003";

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

// Adresa, na které nic neběží. Databáze se nastaví sem, takže omylem
// zavolaný dotaz okamžitě selže (500) a test nezůstane viset.
export async function getUnusedPort() {
  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

// Připraví prostředí a spustí auth aplikaci na volném portu.
// Proměnné prostředí se musí nastavit PŘED importem, protože je token.js
// a sign-in-with-provider-abl.js čtou hned při načtení.
export async function startAuth() {
  const keys = createKeyPair();
  process.env.JWT_PRIVATE_KEY = toBase64(keys.privateKey);
  process.env.DB_HOST = "127.0.0.1";
  process.env.DB_PORT = String(await getUnusedPort());
  for (const name of [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
    "MICROSOFT_CLIENT_ID",
    "MICROSOFT_CLIENT_SECRET",
    "MICROSOFT_REDIRECT_URI",
  ]) {
    delete process.env[name];
  }

  const { default: app } = await import("../src/app.js");
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  async function call(path, { method = "POST", headers = {}, body } = {}) {
    const requestHeaders = { ...headers };
    if (body !== undefined) requestHeaders["Content-Type"] = "application/json";
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  function close() {
    server.closeAllConnections();
    return new Promise((resolve) => server.close(() => resolve()));
  }

  return { keys, call, close };
}
