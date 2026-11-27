// Autentizace (kdo je uživatel) a autorizace (co smí) v gateway.
// Pokud gateway požadavek pustí dál, odpoví falešná služba 200.
import { describe, test, after } from "node:test";
import assert from "node:assert/strict";
import { startGateway, createKeyPair, createToken, forgeToken, USER_ID } from "./helpers.js";

const gw = await startGateway();
after(() => gw.close());

function assertUnauthenticated(res) {
  assert.equal(res.status, 401);
  assert.equal(res.body.code, "user/unauthenticated");
}

function assertForbidden(res, command) {
  assert.equal(res.status, 403);
  assert.equal(res.body.code, "user/forbidden");
  if (command) assert.equal(res.body.params.command, command);
}

describe("Neznámé a veřejné příkazy", () => {
  test("neznámý příkaz vrátí 403 i bez tokenu", async () => {
    assertForbidden(await gw.call("/venue/venue/neexistuje"), "venue/venue/neexistuje");
  });

  test("neznámý příkaz vrátí 403 i s platným tokenem", async () => {
    assertForbidden(await gw.call("/venue/venue/neexistuje", { token: gw.tokenFor("operator") }));
  });

  test("kořenová cesta vrátí 403", async () => {
    assertForbidden(await gw.call("/", { method: "GET" }));
  });

  test("veřejný příkaz projde bez tokenu", async () => {
    const res = await gw.call("/auth/user/signIn", { body: { email: "a@b.cz", password: "x" } });
    assert.equal(res.status, 200);
    assert.equal(res.body.service, "auth");
  });

  test("veřejný příkaz projde i s neplatným tokenem", async () => {
    const res = await gw.call("/auth/user/register", { token: "neplatny.token.xyz" });
    assert.equal(res.status, 200);
  });
});

describe("Ověření tokenu u chráněného příkazu", () => {
  const command = "/auth/user/getMe";

  test("platný token projde", async () => {
    const res = await gw.call(command, { token: gw.tokenFor("athlete") });
    assert.equal(res.status, 200);
  });

  test("bez hlavičky Authorization → 401", async () => {
    assertUnauthenticated(await gw.call(command));
  });

  test("jiné schéma než Bearer → 401", async () => {
    assertUnauthenticated(await gw.call(command, { headers: { Authorization: `Basic ${gw.tokenFor("athlete")}` } }));
  });

  test("Bearer bez tokenu → 401", async () => {
    assertUnauthenticated(await gw.call(command, { headers: { Authorization: "Bearer" } }));
  });

  test("poškozený token → 401", async () => {
    assertUnauthenticated(await gw.call(command, { token: "abc.def.ghi" }));
  });

  test("token podepsaný cizím klíčem → 401", async () => {
    const foreignKeys = createKeyPair();
    const token = createToken(foreignKeys.privateKey, { role: "athlete" }, { subject: USER_ID });
    assertUnauthenticated(await gw.call(command, { token }));
  });

  test("expirovaný token → 401", async () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    const token = createToken(gw.keys.privateKey, { role: "athlete", exp }, { subject: USER_ID });
    assertUnauthenticated(await gw.call(command, { token }));
  });

  test("token bez sub (id uživatele) → 401", async () => {
    const token = createToken(gw.keys.privateKey, { role: "athlete" });
    assertUnauthenticated(await gw.call(command, { token }));
  });

  test("token s alg HS256 podepsaný veřejným klíčem → 401 (záměna algoritmu)", async () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = { sub: USER_ID, role: "operator", iat: now, exp: now + 3600 };
    const token = forgeToken({ alg: "HS256", typ: "JWT" }, payload, gw.keys.publicKey);
    assertUnauthenticated(await gw.call(command, { token }));
  });

  test("token s alg none bez podpisu → 401", async () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = { sub: USER_ID, role: "operator", iat: now, exp: now + 3600 };
    const token = forgeToken({ alg: "none", typ: "JWT" }, payload);
    assertUnauthenticated(await gw.call(command, { token }));
  });
});

describe("Oprávnění podle role", () => {
  test("sportovec nesmí vytvořit areál", async () => {
    assertForbidden(await gw.call("/venue/venue/create", { token: gw.tokenFor("athlete") }), "venue/venue/create");
  });

  test("provozovatel smí vytvořit areál", async () => {
    const res = await gw.call("/venue/venue/create", { token: gw.tokenFor("operator") });
    assert.equal(res.status, 200);
    assert.equal(res.body.service, "venue");
  });

  test("sportovec smí vytvořit rezervaci, provozovatel ne", async () => {
    assert.equal((await gw.call("/booking/reservation/create", { token: gw.tokenFor("athlete") })).status, 200);
    assertForbidden(await gw.call("/booking/reservation/create", { token: gw.tokenFor("operator") }));
  });

  test("provozovatel smí potvrdit rezervaci, sportovec ne", async () => {
    assert.equal((await gw.call("/booking/reservation/confirm", { token: gw.tokenFor("operator") })).status, 200);
    assertForbidden(await gw.call("/booking/reservation/confirm", { token: gw.tokenFor("athlete") }));
  });

  test("příkaz pro Athlete i Operator smí obě role", async () => {
    for (const role of ["athlete", "operator"]) {
      const res = await gw.call("/booking/reservation/cancel", { token: gw.tokenFor(role) });
      assert.equal(res.status, 200, role);
    }
  });

  test("příkaz Authenticated smí obě role", async () => {
    for (const role of ["athlete", "operator"]) {
      const res = await gw.call("/venue/venue/get", { token: gw.tokenFor(role) });
      assert.equal(res.status, 200, role);
    }
  });

  test("příkaz jen pro System nesmí žádný uživatel", async () => {
    for (const role of ["athlete", "operator"]) {
      assertForbidden(await gw.call("/booking/reservation/complete", { token: gw.tokenFor(role) }));
      assertForbidden(await gw.call("/audit/audit/create", { token: gw.tokenFor(role) }));
    }
  });

  test("neznámá role v tokenu → 403", async () => {
    assertForbidden(await gw.call("/venue/venue/get", { token: gw.tokenFor("admin") }));
  });

  test("role System v tokenu nedává systémová práva", async () => {
    assertForbidden(await gw.call("/booking/reservation/complete", { token: gw.tokenFor("System") }));
  });
});

describe("Uživatel bez zvolené role", () => {
  const tokenWithoutRole = () => gw.tokenFor(undefined);

  test("smí zavolat getMe a setRole", async () => {
    assert.equal((await gw.call("/auth/user/getMe", { token: tokenWithoutRole() })).status, 200);
    assert.equal((await gw.call("/auth/user/setRole", { token: tokenWithoutRole() })).status, 200);
  });

  test("ostatní příkazy vrátí 403 user/roleNotSet", async () => {
    for (const path of ["/venue/venue/get", "/auth/user/setPassword"]) {
      const res = await gw.call(path, { token: tokenWithoutRole() });
      assert.equal(res.status, 403, path);
      assert.equal(res.body.code, "user/roleNotSet", path);
    }
  });

  test("veřejné příkazy fungují i bez role", async () => {
    assert.equal((await gw.call("/auth/user/signIn", { token: tokenWithoutRole() })).status, 200);
  });
});
