/**
 * TEST SUITE — Events CRUD
 *
 * Covers:
 *   GET    /events             — list (featured filter, status filter, city filter)
 *   GET    /events/:id         — by id, not found, invalid id
 *   POST   /events             — create (admin only)
 *   PUT    /events/:id         — update (admin only)
 *   DELETE /events/:id         — cancel (admin only)
 *   PATCH  /events/:id/feature — toggle featured (admin only)
 *   Auth & validation checks
 *
 * Usage:  node tests/events/01_events_crud.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

// ── Shared state ───────────────────────────────────────────────────────────────
let user          = null;
let token         = null;
let adminToken    = null;
let testEventId   = null;
let testCityId    = null;
let ts            = Date.now();

async function bootstrap() {
  const u = makeTestUser("events");
  const res = await api.post("/auth/register", {
    firstName: u.firstName,
    lastName:  u.lastName,
    email:     u.email,
    password:  u.password,
  });
  if (!res.ok) throw new Error(`Bootstrap failed: ${JSON.stringify(res.data)}`);
  user       = res.data.user;
  token      = res.data.token;
  adminToken = process.env.ADMIN_TOKEN || null;

  // Find an existing city
  const citiesRes = await api.get("/cities");
  if (citiesRes.ok && Array.isArray(citiesRes.data) && citiesRes.data.length > 0) {
    testCityId = citiesRes.data[0]._id || citiesRes.data[0].id;
  }
}

async function futureDate(days = 30) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ─────────────────────────────────────────────────────────────────────────────
async function runAll() {
  await bootstrap();

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Events 01-A  GET /events");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns event list — 200", async () => {
    const res = await api.get("/events");
    assertStatus(res, 200);
    assert(res.data.events !== undefined || Array.isArray(res.data), "should return events");
  });

  await test("filters by isFeatured", async () => {
    const res = await api.get("/events?isFeatured=true");
    assertStatus(res, 200);
  });

  await test("filters by status", async () => {
    const res = await api.get("/events?status=upcoming");
    assertStatus(res, 200);
  });

  await test("filters by cityId", async () => {
    if (!testCityId) return console.log("    ⚠ skip: no testCityId");
    const res = await api.get(`/events?cityId=${testCityId}`);
    assertStatus(res, 200);
  });

  await test("supports pagination — page & limit", async () => {
    const res = await api.get("/events?page=1&limit=10");
    assertStatus(res, 200);
    if (res.data.totalPages !== undefined) {
      assert(typeof res.data.totalPages === "number", "totalPages should be a number");
    }
  });

  await test("public access (no auth) — 200", async () => {
    const res = await api.get("/events");
    assertStatus(res, 200);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Events 01-B  GET /events/:id");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns 404 for non-existent ObjectId", async () => {
    const res = await api.get("/events/000000000000000000000000");
    assertStatus(res, 404);
  });

  await test("returns 4xx for invalid id format", async () => {
    const res = await api.get("/events/not-an-id");
    assert(res.status >= 400, "should reject invalid ObjectId");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Events 01-C  POST /events — create (admin only)");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects create by regular user — 403", async () => {
    if (!testCityId) return console.log("    ⚠ skip: no testCityId");
    const res = await api.post("/events", {
      title:   "Test Event",
      cityId:  testCityId,
      dateRange: { from: await futureDate() },
    }, token);
    assertStatus(res, 403);
  });

  await test("rejects create without auth — 401", async () => {
    if (!testCityId) return console.log("    ⚠ skip: no testCityId");
    const res = await api.post("/events", {
      title:   "No Auth Event",
      cityId:  testCityId,
      dateRange: { from: await futureDate() },
    });
    assertStatus(res, 401);
  });

  await test("creates event with admin token — 201", async () => {
    if (!testCityId) return console.log("    ⚠ skip: no testCityId");
    if (!adminToken) return console.log("    ⚠ skip: no ADMIN_TOKEN");
    const res = await api.post("/events", {
      title:       `Test Event ${ts}`,
      description: "An integration test event",
      cityId:      testCityId,
      dateRange:   { from: await futureDate() },
      organizer:   "Test Organizer",
      ticketPrice: 0,
    }, adminToken);
    assertStatus(res, 201);
    assert(res.data._id || res.data.id, "should return event id");
    assertEqual(res.data.title, `Test Event ${ts}`, "title");
    testEventId = res.data._id || res.data.id;
  });

  await test("rejects missing title — 4xx", async () => {
    if (!testCityId || !adminToken) return console.log("    ⚠ skip: missing dependencies");
    const res = await api.post("/events", {
      cityId:    testCityId,
      dateRange: { from: await futureDate() },
    }, adminToken);
    assert(res.status >= 400, "should reject missing title");
  });

  await test("rejects missing dateRange — 4xx", async () => {
    if (!testCityId || !adminToken) return console.log("    ⚠ skip: missing dependencies");
    const res = await api.post("/events", {
      title:  `No Date ${ts}`,
      cityId: testCityId,
    }, adminToken);
    assert(res.status >= 400, "should reject missing dateRange");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Events 01-D  GET /events/:id — after create");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("fetches created event by id — 200", async () => {
    if (!testEventId) return console.log("    ⚠ skip: no testEventId");
    const res = await api.get(`/events/${testEventId}`);
    assertStatus(res, 200);
    assert(res.data._id || res.data.id, "should have id");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Events 01-E  PUT /events/:id — update (admin only)");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects update by regular user — 403", async () => {
    if (!testEventId) return console.log("    ⚠ skip: no testEventId");
    const res = await api.put(`/events/${testEventId}`, { title: "Hacker Update" }, token);
    assertStatus(res, 403);
  });

  await test("updates event with admin — 200", async () => {
    if (!testEventId) return console.log("    ⚠ skip: no testEventId");
    if (!adminToken)  return console.log("    ⚠ skip: no ADMIN_TOKEN");
    const res = await api.put(`/events/${testEventId}`, {
      title:       `Updated Event ${ts}`,
      description: "Updated description",
    }, adminToken);
    assertStatus(res, 200);
    assertEqual(res.data.title, `Updated Event ${ts}`, "title updated");
  });

  await test("returns 404 for update on non-existent id", async () => {
    if (!adminToken) return console.log("    ⚠ skip: no ADMIN_TOKEN");
    const res = await api.put("/events/000000000000000000000000", { title: "Ghost" }, adminToken);
    assertStatus(res, 404);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Events 01-F  DELETE /events/:id — cancel (admin only)");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects delete by regular user — 403", async () => {
    if (!testEventId) return console.log("    ⚠ skip: no testEventId");
    const res = await api.delete(`/events/${testEventId}`, token);
    assertStatus(res, 403);
  });

  await test("admin cancels event — 200", async () => {
    if (!testEventId) return console.log("    ⚠ skip: no testEventId");
    if (!adminToken)  return console.log("    ⚠ skip: no ADMIN_TOKEN");
    const res = await api.delete(`/events/${testEventId}`, adminToken);
    assertStatus(res, 200);
    assert(res.data.message, "should return confirmation");
  });

  await test("rejects double cancel — 400 or 404", async () => {
    if (!testEventId) return console.log("    ⚠ skip: no testEventId");
    if (!adminToken)  return console.log("    ⚠ skip: no ADMIN_TOKEN");
    const res = await api.delete(`/events/${testEventId}`, adminToken);
    assert(res.status >= 400, "should reject already cancelled event");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Events 01-G  PATCH /events/:id/feature — toggle featured (admin only)");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects feature toggle by regular user — 403", async () => {
    if (!testEventId) return console.log("    ⚠ skip: no testEventId");
    const res = await api.patch(`/events/${testEventId}/feature`, { isFeatured: true }, token);
    assertStatus(res, 403);
  });

  await test("admin toggles featured — 200", async () => {
    if (!testEventId) return console.log("    ⚠ skip: no testEventId");
    if (!adminToken)  return console.log("    ⚠ skip: no ADMIN_TOKEN");
    const res = await api.patch(`/events/${testEventId}/feature`, { isFeatured: true }, adminToken);
    assertStatus(res, 200);
    assert(res.data.isFeatured !== undefined, "should return isFeatured");
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  return summary("Suite — Events CRUD");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
