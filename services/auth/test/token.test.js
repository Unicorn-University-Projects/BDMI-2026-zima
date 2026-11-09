// Vydávání JWT tokenů – musí jít ověřit tak, jak je ověřuje gateway (RS256, veřejný klíč).
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { createKeyPair, toBase64, USER_ID } from "./helpers.js";

const keys = createKeyPair();
// token.js čte JWT_PRIVATE_KEY hned při načtení, proto se nastavuje před importem.
process.env.JWT_PRIVATE_KEY = toBase64(keys.privateKey);
delete process.env.JWT_EXPIRES_IN;
const { default: token } = await import("../src/token.js");

const verify = (value) => jwt.verify(value, keys.publicKey, { algorithms: ["RS256"] });

afterEach(() => {
  delete process.env.JWT_EXPIRES_IN;
});

test("token jde ověřit veřejným klíčem stejně jako v gateway", () => {
  const payload = verify(token.createToken({ id: USER_ID, role: "athlete" }));

  assert.equal(payload.sub, USER_ID);
  assert.equal(payload.role, "athlete");
});

test("token je podepsaný algoritmem RS256", () => {
  const decoded = jwt.decode(token.createToken({ id: USER_ID, role: "operator" }), { complete: true });

  assert.equal(decoded.header.alg, "RS256");
});

test("uživatel bez role dostane token s role = null", () => {
  const payload = verify(token.createToken({ id: USER_ID, role: null }));

  assert.equal(payload.role, null);
});

test("výchozí platnost tokenu je 8 hodin", () => {
  const payload = verify(token.createToken({ id: USER_ID, role: "athlete" }));

  assert.equal(payload.exp - payload.iat, 8 * 60 * 60);
});

test("platnost jde změnit proměnnou JWT_EXPIRES_IN", () => {
  process.env.JWT_EXPIRES_IN = "1h";
  const payload = verify(token.createToken({ id: USER_ID, role: "athlete" }));

  assert.equal(payload.exp - payload.iat, 60 * 60);
});

test("token neobsahuje citlivé údaje uživatele", () => {
  const user = { id: USER_ID, role: "athlete", email: "petra@test.cz", passwordHash: "$2b$10$tajne" };
  const payload = verify(token.createToken(user));

  assert.deepEqual(Object.keys(payload).sort(), ["exp", "iat", "role", "sub"]);
});
