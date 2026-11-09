import { describe, test } from "node:test";
import assert from "node:assert/strict";
import permissions from "../src/permissions.js";

const KNOWN_PROFILES = ["Public", "Authenticated", "Athlete", "Operator", "System"];

describe("getCommandPath", () => {
  test("odstraní lomítka na začátku a na konci", () => {
    assert.equal(permissions.getCommandPath({ path: "/auth/user/signIn" }), "auth/user/signIn");
    assert.equal(permissions.getCommandPath({ path: "/auth/user/signIn/" }), "auth/user/signIn");
    assert.equal(permissions.getCommandPath({ path: "//auth/user/signIn//" }), "auth/user/signIn");
  });

  test("kořenová cesta je prázdný příkaz", () => {
    assert.equal(permissions.getCommandPath({ path: "/" }), "");
  });
});

describe("getProfiles", () => {
  test("vrátí role pro známý příkaz", () => {
    assert.deepEqual(permissions.getProfiles("auth/user/signIn"), ["Public"]);
    assert.deepEqual(permissions.getProfiles("venue/venue/create"), ["Operator"]);
    assert.deepEqual(permissions.getProfiles("booking/reservation/cancel"), ["Athlete", "Operator"]);
  });

  test("vrátí null pro neznámý příkaz", () => {
    assert.equal(permissions.getProfiles("venue/venue/neexistuje"), null);
    assert.equal(permissions.getProfiles(""), null);
  });

  test("vlastnosti zděděné z Object.prototype nejsou příkazy", () => {
    for (const name of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      assert.equal(permissions.getProfiles(name), null, name);
    }
  });
});

describe("tabulka oprávnění", () => {
  const entries = Object.entries(permissions.permissions);

  test("každý příkaz má tvar služba/entita/akce", () => {
    for (const [command] of entries) {
      assert.match(command, /^[a-z]+\/[A-Za-z]+\/[A-Za-z]+$/, command);
    }
  });

  test("každý příkaz má aspoň jednu známou roli (chrání před překlepem)", () => {
    for (const [command, profiles] of entries) {
      assert.ok(Array.isArray(profiles) && profiles.length > 0, command);
      for (const profile of profiles) {
        assert.ok(KNOWN_PROFILES.includes(profile), `${command}: neznámá role ${profile}`);
      }
    }
  });

  test("příkaz pro klienty vede na službu, kterou gateway zná", () => {
    for (const [command, profiles] of entries) {
      const service = command.split("/")[0];
      const internalOnly = profiles.every((profile) => profile === "System");
      assert.ok(internalOnly || Object.hasOwn(permissions.services, service), `${command}: služba ${service} chybí`);
    }
  });

  test("příkazy povolené bez role existují v tabulce", () => {
    for (const command of permissions.roleNotSetAllowed) {
      assert.ok(Object.hasOwn(permissions.permissions, command), command);
    }
  });

  test("role z tokenu se převádějí na profily Athlete a Operator", () => {
    assert.deepEqual(permissions.roleProfiles, { athlete: "Athlete", operator: "Operator" });
  });
});
