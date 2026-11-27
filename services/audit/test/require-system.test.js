// Ochrana interních endpointů auditu sdíleným systémovým klíčem.
import { describe, test, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

const SYSTEM_KEY = "testovaci-systemovy-klic";

// require-system.js čte SYSTEM_KEY hned při načtení, proto se nastavuje před importem.
process.env.SYSTEM_KEY = SYSTEM_KEY;
const { default: app } = await import("../src/app.js");

const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

after(() => {
  server.closeAllConnections();
  server.close();
});

function postAudit(headers = {}) {
  return fetch(`${baseUrl}/audit/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ entityType: "reservation", action: "create" }),
  });
}

describe("Endpointy /audit přes HTTP", () => {
  test("bez systémového klíče → 403", async () => {
    const res = await postAudit();
    assert.equal(res.status, 403);
    assert.equal((await res.json()).code, "user/forbidden");
  });

  test("se špatným klíčem → 403", async () => {
    const res = await postAudit({ "X-System-Key": "spatny-klic" });
    assert.equal(res.status, 403);
  });

  test("klíč jiné délky nezpůsobí chybu serveru", async () => {
    const res = await postAudit({ "X-System-Key": "x".repeat(500) });
    assert.equal(res.status, 403);
  });

  test("se správným klíčem projde ochranou", async () => {
    const res = await postAudit({ "X-System-Key": SYSTEM_KEY });
    // Endpoint /audit/create zatím neexistuje, proto 404 – důležité je, že to není 403.
    assert.notEqual(res.status, 403);
  });

  test("/health systémový klíč nepotřebuje", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
  });
});

describe("Middleware bez nastaveného SYSTEM_KEY", () => {
  test("nepustí nikoho, ani s libovolným klíčem", async () => {
    delete process.env.SYSTEM_KEY;
    // Parametr v adrese vynutí nové načtení modulu, tentokrát bez klíče.
    const { default: requireSystem } = await import("../src/middleware/require-system.js?bez-klice");

    for (const providedKey of [undefined, "", SYSTEM_KEY]) {
      const req = { get: (name) => (name === "X-System-Key" ? providedKey : undefined) };
      const res = {
        statusCode: 200,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(body) {
          this.body = body;
          return this;
        },
      };
      let nextCalled = false;

      requireSystem(req, res, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, false, `klíč: ${providedKey}`);
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.code, "user/forbidden");
    }
  });
});
