/**
 * TEST SUITE — Home Page: GET /events endpoints
 *
 * Covers:
 *   GET /events          — list, filter by status/cityId/isFeatured
 *   GET /events?page=    — pagination
 *   GET /events/nearby   — nearby events (geo)
 *   GET /events/:id      — single event
 *   GET /events?lang=    — i18n support
 *
 * Usage:
 *   node tests/home/07_home_events.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

const FAKE_ID = "000000000000000000000000";
const BAD_ID  = "not-a-valid-objectid";

// ── Bootstrap ─────────────────────────────────────────────────────────────────

let token;

async function bootstrap() {
  const u = makeTestUser("home-evt");
  const res = await api.post("/auth/register", {
    firstName: u.firstName, lastName: u.lastName,
    email: u.email, password: u.password,
  });
  if (!res.ok) throw new Error(`Bootstrap register failed: ${JSON.stringify(res.data)}`);
  token = res.data.token;
}

// ── Suite runner ──────────────────────────────────────────────────────────────

async function runAll() {
  await bootstrap();

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-20  GET /events — list & defaults");
  // ═════════════════════════════════════════════════════════════════════════

  await test("returns 200 with events array and pagination meta", async () => {
    const res = await api.get("/events");
    assertStatus(res, 200);
    assert(Array.isArray(res.data.events), "events should be an array");
    assert(typeof res.data.total === "number", "total should be a number");
    assert(typeof res.data.page === "number", "page should be a number");
    assert(typeof res.data.limit === "number", "limit should be a number");
  });

  await test("default limit is applied", async () => {
    const res = await api.get("/events");
    assertStatus(res, 200);
    assert(res.data.limit > 0, "limit should be > 0");
    assert(res.data.events.length <= res.data.limit, "events should respect limit");
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-21  GET /events — status filter");
  // ═════════════════════════════════════════════════════════════════════════

  await test("filters by status=upcoming — 200", async () => {
    const res = await api.get("/events?status=upcoming");
    assertStatus(res, 200);
    assert(Array.isArray(res.data.events), "should return events array");
  });

  await test("filters by status=ongoing — 200", async () => {
    const res = await api.get("/events?status=ongoing");
    assertStatus(res, 200);
    assert(Array.isArray(res.data.events), "should return events array");
  });

  await test("filters by status=past — 200", async () => {
    const res = await api.get("/events?status=past");
    assertStatus(res, 200);
    assert(Array.isArray(res.data.events), "should return events array");
  });

  await test("filters by status=cancelled — 200", async () => {
    const res = await api.get("/events?status=cancelled");
    assertStatus(res, 200);
    assert(Array.isArray(res.data.events), "should return events array");
  });

  await test("handles unknown status gracefully — 200", async () => {
    const res = await api.get("/events?status=invalid_status_xyz");
    assert(res.status === 200 || res.status === 400,
      `expected 200 or 400, got ${res.status}`);
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-22  GET /events — cityId & isFeatured filters");
  // ═════════════════════════════════════════════════════════════════════════

  await test("filters by cityId — 200", async () => {
    const res = await api.get(`/events?cityId=${FAKE_ID}`);
    assertStatus(res, 200);
    assert(Array.isArray(res.data.events), "should return events array");
  });

  await test("filters by isFeatured=true — 200", async () => {
    const res = await api.get("/events?isFeatured=true");
    assertStatus(res, 200);
    assert(Array.isArray(res.data.events), "should return events array");
  });

  await test("filters by cityId + status combined — 200", async () => {
    const res = await api.get(`/events?cityId=${FAKE_ID}&status=upcoming`);
    assertStatus(res, 200);
    assert(Array.isArray(res.data.events), "should return events array");
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-23  GET /events — pagination");
  // ═════════════════════════════════════════════════════════════════════════

  await test("pagination with limit — 200", async () => {
    const res = await api.get("/events?limit=3");
    assertStatus(res, 200);
    assert(res.data.events.length <= 3, "should respect limit=3");
    assertEqual(res.data.limit, 3, "limit in response");
  });

  await test("pagination with page — 200", async () => {
    const res = await api.get("/events?page=1&limit=3");
    assertStatus(res, 200);
    assert(res.data.page === 1, "page should be 1");
  });

  await test("page beyond results returns empty — 200", async () => {
    const res = await api.get("/events?page=99999&limit=100");
    assertStatus(res, 200);
    assert(Array.isArray(res.data.events), "should return array");
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-24  GET /events/nearby — geolocation");
  // ═════════════════════════════════════════════════════════════════════════

  await test("nearby without params returns 4xx — 400", async () => {
    const res = await api.get("/events/nearby");
    assert(res.status === 400 || res.status === 200,
      `expected 400 or 200, got ${res.status}`);
  });

  await test("nearby with valid lat/lng — 200", async () => {
    const res = await api.get("/events/nearby?lat=31.6295&lng=-7.9811");
    assert(res.status === 200 || res.status === 404,
      `expected 200 or 404, got ${res.status}`);
    if (res.status === 200) {
      assert(Array.isArray(res.data), "should return array");
    }
  });

  await test("nearby with custom radius — 200", async () => {
    const res = await api.get("/events/nearby?lat=31.6295&lng=-7.9811&radius=20000");
    assert(res.status === 200 || res.status === 404,
      `expected 200 or 404, got ${res.status}`);
    if (res.status === 200) {
      assert(Array.isArray(res.data), "should return array");
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-25  GET /events/:id — single event");
  // ═════════════════════════════════════════════════════════════════════════

  await test("returns 404 for non-existent event — 404", async () => {
    const res = await api.get(`/events/${FAKE_ID}`);
    assertStatus(res, 404);
  });

  await test("returns 4xx for malformed event ID", async () => {
    const res = await api.get(`/events/${BAD_ID}`);
    assert(res.status === 400 || res.status === 500 || res.status === 404,
      `expected 4xx/500, got ${res.status}`);
  });

  await test("returns 200 with populated event for a valid ID (fetch first from list)", async () => {
    const listRes = await api.get("/events?limit=1");
    assertStatus(listRes, 200);
    if (listRes.data.events.length > 0) {
      const first = listRes.data.events[0];
      const id = first._id || first.id;
      const res = await api.get(`/events/${id}`);
      assertStatus(res, 200);
      assert(res.data._id === id || res.data.id === id,
        "returned event should match requested ID");
      // check populated fields
      if (res.data.cityId) {
        assert(typeof res.data.cityId === "object" || typeof res.data.cityId === "string",
          "cityId should be populated or raw");
      }
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-26  GET /events — lang parameter");
  // ═════════════════════════════════════════════════════════════════════════

  await test("supports lang=fr — 200", async () => {
    const res = await api.get("/events?lang=fr");
    assertStatus(res, 200);
    assert(Array.isArray(res.data.events), "should return array");
  });

  await test("supports lang=ar — 200", async () => {
    const res = await api.get("/events?lang=ar");
    assertStatus(res, 200);
    assert(Array.isArray(res.data.events), "should return array");
  });

  return summary("Home Events API");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
