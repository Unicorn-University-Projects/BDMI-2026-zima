// Přeposílání požadavků z gateway do služeb a bezpečnostní hlavičky.
import { describe, test, after } from "node:test";
import assert from "node:assert/strict";
import { startGateway, FRONTEND_URL, USER_ID } from "./helpers.js";

const gw = await startGateway();
after(() => gw.close());

describe("Směrování na služby", () => {
  test("příkaz dorazí do správné služby bez jejího prefixu", async () => {
    const cases = [
      ["/auth/user/getMe", "auth", "/user/getMe"],
      ["/venue/venue/get", "venue", "/venue/get"],
      ["/booking/reservation/listMine", "booking", "/reservation/listMine"],
    ];
    for (const [path, service, expectedUrl] of cases) {
      const res = await gw.call(path, { token: gw.tokenFor("athlete") });
      assert.equal(res.status, 200, path);
      assert.equal(res.body.service, service, path);
      assert.equal(res.body.url, expectedUrl, path);
    }
  });

  test("query string se zachová", async () => {
    const res = await gw.call("/venue/sportsGround/get?id=d0000000-0000-4000-8000-000000000002", {
      method: "GET",
      token: gw.tokenFor("athlete"),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.url, "/sportsGround/get?id=d0000000-0000-4000-8000-000000000002");
    assert.equal(res.body.method, "GET");
  });

  test("tělo požadavku se přepošle beze změny", async () => {
    const body = { email: "petra.dvorakova@rezervace.test", password: "Heslo123!" };
    const res = await gw.call("/auth/user/signIn", { body });
    assert.equal(res.status, 200);
    assert.equal(res.body.method, "POST");
    assert.deepEqual(JSON.parse(res.body.body), body);
  });

  test("nedostupná služba → 502 gateway/serviceUnavailable", async () => {
    const res = await gw.call("/review/rating/list", { token: gw.tokenFor("athlete") });
    assert.equal(res.status, 502);
    assert.equal(res.body.code, "gateway/serviceUnavailable");
  });
});

describe("Předávání uživatele službám", () => {
  test("služba dostane id a roli z tokenu", async () => {
    const res = await gw.call("/auth/user/getMe", { token: gw.tokenFor("operator") });
    assert.equal(res.body.headers["x-user-id"], USER_ID);
    assert.equal(res.body.headers["x-user-role"], "operator");
  });

  test("uživatel bez role předá jen id", async () => {
    const res = await gw.call("/auth/user/getMe", { token: gw.tokenFor(undefined) });
    assert.equal(res.body.headers["x-user-id"], USER_ID);
    assert.equal(res.body.headers["x-user-role"], undefined);
  });

  test("podvržené hlavičky od klienta se nahradí údaji z tokenu", async () => {
    const res = await gw.call("/auth/user/getMe", {
      token: gw.tokenFor("athlete"),
      headers: { "X-User-Id": "utocnik", "X-User-Role": "operator", "X-System-Key": "podvrh" },
    });
    assert.equal(res.body.headers["x-user-id"], USER_ID);
    assert.equal(res.body.headers["x-user-role"], "athlete");
    assert.equal(res.body.headers["x-system-key"], undefined);
  });

  test("u veřejného příkazu se podvržené hlavičky zahodí úplně", async () => {
    const res = await gw.call("/auth/user/signIn", {
      headers: { "X-User-Id": "utocnik", "X-User-Role": "operator", "X-System-Key": "podvrh" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.headers["x-user-id"], undefined);
    assert.equal(res.body.headers["x-user-role"], undefined);
    assert.equal(res.body.headers["x-system-key"], undefined);
  });

  test("token z hlavičky Authorization se službám nepředává", async () => {
    const res = await gw.call("/auth/user/getMe", { token: gw.tokenFor("athlete") });
    assert.equal(res.body.headers.authorization, undefined);
  });
});

describe("Bezpečnostní a CORS hlavičky", () => {
  test("helmet nastaví bezpečnostní hlavičky a skryje X-Powered-By", async () => {
    const res = await gw.call("/health", { method: "GET" });
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-powered-by"), null);
  });

  test("CORS povoluje jen adresu frontendu", async () => {
    const res = await gw.call("/health", { method: "GET", headers: { Origin: "https://utocnik.example" } });
    assert.equal(res.headers.get("access-control-allow-origin"), FRONTEND_URL);
  });

  test("CORS preflight (OPTIONS) projde bez tokenu", async () => {
    const res = await gw.call("/venue/venue/create", {
      method: "OPTIONS",
      headers: {
        Origin: FRONTEND_URL,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type",
      },
    });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get("access-control-allow-origin"), FRONTEND_URL);
  });
});
