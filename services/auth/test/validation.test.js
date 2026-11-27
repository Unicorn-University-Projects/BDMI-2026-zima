// Validace vstupů auth služby. Všechny tyto chyby vznikají dřív, než se služba
// zeptá databáze, takže testy nepotřebují MySQL.
import { describe, test, after } from "node:test";
import assert from "node:assert/strict";
import { startAuth, USER_ID } from "./helpers.js";

const auth = await startAuth();
after(() => auth.close());

const userHeader = { "X-User-Id": USER_ID };

function assertInvalidDtoIn(res, command) {
  assert.equal(res.status, 400);
  assert.equal(res.body.code, `user/${command}/invalidDtoIn`);
  assert.ok(Array.isArray(res.body.params.validationErrors) && res.body.params.validationErrors.length > 0);
}

function assertUnauthenticated(res) {
  assert.equal(res.status, 401);
  assert.equal(res.body.code, "user/unauthenticated");
}

describe("POST /user/register", () => {
  const validDtoIn = {
    firstName: "Petra",
    surName: "Dvořáková",
    email: "petra@test.cz",
    password: "Heslo123!",
    role: "athlete",
    termsAccepted: true,
  };

  const invalidCases = [
    ["prázdné tělo", {}],
    ["chybí jméno", { ...validDtoIn, firstName: undefined }],
    ["prázdné jméno", { ...validDtoIn, firstName: "" }],
    ["chybí příjmení", { ...validDtoIn, surName: undefined }],
    ["neplatný e-mail", { ...validDtoIn, email: "neni-email" }],
    ["heslo kratší než 8 znaků", { ...validDtoIn, password: "Kratke1" }],
    ["heslo delší než 72 znaků", { ...validDtoIn, password: "a".repeat(73) }],
    ["neznámá role", { ...validDtoIn, role: "admin" }],
    ["nesouhlas s podmínkami", { ...validDtoIn, termsAccepted: false }],
    ["chybí souhlas s podmínkami", { ...validDtoIn, termsAccepted: undefined }],
    ["jméno není text", { ...validDtoIn, firstName: 123 }],
  ];

  for (const [name, body] of invalidCases) {
    test(`${name} → 400`, async () => {
      assertInvalidDtoIn(await auth.call("/user/register", { body }), "register");
    });
  }

  test("platná data projdou validací (bez databáze pak skončí 500, ne 400)", async () => {
    const res = await auth.call("/user/register", { body: validDtoIn });
    assert.equal(res.status, 500);
    assert.equal(res.body.code, "user/register/failed");
  });
});

describe("POST /user/signIn", () => {
  test("chybí heslo → 400", async () => {
    assertInvalidDtoIn(await auth.call("/user/signIn", { body: { email: "petra@test.cz" } }), "signIn");
  });

  test("neplatný e-mail → 400", async () => {
    assertInvalidDtoIn(
      await auth.call("/user/signIn", { body: { email: "neni-email", password: "Heslo123!" } }),
      "signIn",
    );
  });

  test("po 5 neúspěšných pokusech pro stejný e-mail → 429", async () => {
    const body = { email: "limit@test.cz" };
    for (let attempt = 1; attempt <= 5; attempt++) {
      assert.equal((await auth.call("/user/signIn", { body })).status, 400, `pokus ${attempt}`);
    }

    const res = await auth.call("/user/signIn", { body });
    assert.equal(res.status, 429);
    assert.equal(res.body.code, "user/signIn/tooManyAttempts");
  });

  test("limit pro jeden e-mail neblokuje jiný e-mail", async () => {
    const res = await auth.call("/user/signIn", { body: { email: "jiny@test.cz" } });
    assert.equal(res.status, 400);
  });
});

describe("Příkazy přihlášeného uživatele bez X-User-Id → 401", () => {
  for (const [method, path] of [
    ["GET", "/user/getMe"],
    ["POST", "/user/setRole"],
    ["POST", "/user/setPassword"],
  ]) {
    test(`${method} ${path}`, async () => {
      assertUnauthenticated(await auth.call(path, { method, body: method === "POST" ? {} : undefined }));
    });
  }
});

describe("POST /user/setRole", () => {
  test("neznámá role → 400", async () => {
    const res = await auth.call("/user/setRole", { headers: userHeader, body: { role: "admin", termsAccepted: true } });
    assertInvalidDtoIn(res, "setRole");
  });

  test("bez souhlasu s podmínkami → 400", async () => {
    const res = await auth.call("/user/setRole", { headers: userHeader, body: { role: "athlete" } });
    assertInvalidDtoIn(res, "setRole");
  });
});

describe("POST /user/setPassword", () => {
  test("chybí nové heslo → 400", async () => {
    assertInvalidDtoIn(await auth.call("/user/setPassword", { headers: userHeader, body: {} }), "setPassword");
  });

  test("nové heslo kratší než 8 znaků → 400", async () => {
    const res = await auth.call("/user/setPassword", { headers: userHeader, body: { newPassword: "Kratke1" } });
    assertInvalidDtoIn(res, "setPassword");
  });
});

describe("Obnova hesla", () => {
  test("requestPasswordReset s neplatným e-mailem → 400", async () => {
    const res = await auth.call("/user/requestPasswordReset", { body: { email: "neni-email" } });
    assertInvalidDtoIn(res, "requestPasswordReset");
  });

  test("resetPassword s tokenem v chybném formátu → 400", async () => {
    const res = await auth.call("/user/resetPassword", { body: { token: "abc", newPassword: "Heslo123!" } });
    assertInvalidDtoIn(res, "resetPassword");
  });

  test("resetPassword s krátkým heslem → 400", async () => {
    const res = await auth.call("/user/resetPassword", { body: { token: "a".repeat(64), newPassword: "Kratke1" } });
    assertInvalidDtoIn(res, "resetPassword");
  });
});

describe("POST /user/signInWithProvider", () => {
  const validDtoIn = {
    provider: "google",
    code: "autorizacni-kod",
    codeVerifier: "v".repeat(43),
    nonce: "nahodny-nonce",
  };

  test("chybí povinné údaje → 400", async () => {
    assertInvalidDtoIn(await auth.call("/user/signInWithProvider", { body: {} }), "signInWithProvider");
  });

  test("nepodporovaný poskytovatel → 400", async () => {
    const res = await auth.call("/user/signInWithProvider", { body: { ...validDtoIn, provider: "facebook" } });
    assertInvalidDtoIn(res, "signInWithProvider");
  });

  test("příliš krátký codeVerifier (PKCE) → 400", async () => {
    const res = await auth.call("/user/signInWithProvider", { body: { ...validDtoIn, codeVerifier: "kratky" } });
    assertInvalidDtoIn(res, "signInWithProvider");
  });

  test("nenakonfigurovaný poskytovatel → 400 providerNotSupported (bez volání Googlu)", async () => {
    const res = await auth.call("/user/signInWithProvider", { body: validDtoIn });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "user/signInWithProvider/providerNotSupported");
  });
});
