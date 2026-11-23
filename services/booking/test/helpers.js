// Spuštění booking služby pro testy: data v paměti (BOOKING_MEMORY_DB=1),
// pevně nastavený čas a hlavičky, které by jinak doplnila gateway.
import http from "node:http";

export const GATEWAY_SECRET = "test-gateway-secret";
export const ATHLETE = { "X-User-Id": "a0000000-0000-4000-8000-000000000003", "X-User-Role": "athlete" };
export const OPERATOR = { "X-User-Id": "a0000000-0000-4000-8000-000000000001", "X-User-Role": "operator" };

export const GROUND = {
  lipaCourt1: "d0000000-0000-4000-8000-000000000001",
  lipaCourt2: "d0000000-0000-4000-8000-000000000002",
  lipaCourt3: "d0000000-0000-4000-8000-000000000003",
  lipaHall: "d0000000-0000-4000-8000-000000000004",
  hradiskoA: "d0000000-0000-4000-8000-000000000005",
  hradiskoB: "d0000000-0000-4000-8000-000000000006",
  hradiskoSquashInactive: "d0000000-0000-4000-8000-000000000007",
  zizkovBadminton: "d0000000-0000-4000-8000-000000000008",
};

// Pondělí 23. 11. 2026 10:30 pražského času
export const NOW = "2026-11-23T10:30:00+01:00";
export const TODAY = "2026-11-23";

export async function startBooking() {
  process.env.BOOKING_MEMORY_DB = "1";
  process.env.GATEWAY_INTERNAL_SECRET = GATEWAY_SECRET;

  const { default: app } = await import("../src/app.js");
  const { default: clock } = await import("../src/utils/clock.js");
  const { default: memoryStore } = await import("../src/dao/memory-store.js");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  async function call(path, { headers = ATHLETE, gatewaySecret = GATEWAY_SECRET } = {}) {
    const requestHeaders = { ...headers };
    if (gatewaySecret) requestHeaders["X-Gateway-Secret"] = gatewaySecret;
    const res = await fetch(`${baseUrl}${path}`, { headers: requestHeaders });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  function reserve(sportsGroundId, date, startTimes, state = "created") {
    for (const startTime of startTimes) {
      memoryStore.state.reservations.push({
        id: `r-${sportsGroundId}-${date}-${startTime}-${memoryStore.state.reservations.length}`,
        sportsGroundId,
        athleteId: ATHLETE["X-User-Id"],
        date,
        startTime,
        price: 300,
        state,
      });
    }
  }

  function reset() {
    memoryStore.reset();
    clock.setNow(NOW);
  }

  function close() {
    clock.setNow(null);
    server.closeAllConnections();
    return new Promise((resolve) => server.close(() => resolve()));
  }

  reset();
  return { call, reserve, reset, close, clock, memoryStore };
}

export function hours(from, to) {
  return Array.from({ length: to - from }, (unused, index) => `${String(from + index).padStart(2, "0")}:00`);
}
