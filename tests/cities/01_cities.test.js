/**
 * TEST SUITE — Cities CRUD
 *
 * Covers:
 *   GET    /cities         — list (isActive filter)
 *   GET    /cities/:id     — by id, not found, invalid id
 *   POST   /cities         — create (admin only)
 *   PUT    /cities/:id     — update (admin only)
 *   DELETE /cities/:id     — delete (admin only)
 *   Auth & validation checks
 *
 * Usage:  node tests/cities/01_cities.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

// ── Shared state ───────────────────────────────────────────────────────────────
let user        = null;
let token       = null;
let adminToken  = null;
let testCityId  = null;
let ts          = Date.now();

async function bootstrap() {
  const u = makeTestUser("cities");
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
}

// ─────────────────────────────────────────────────────────────────────────────
async function runAll() {
  await bootstrap();

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Cities 01-A  GET /cities");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns city list — 200", async () => {
    const res = await api.get("/cities");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("filters by isActive", async () => {
    const res = await api.get("/cities?isActive=true");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("filters by isActive=false", async () => {
    const res = await api.get("/cities?isActive=false");
    assertStatus(res, 200);
  });

  await test("public access (no auth) — 200", async () => {
    const res = await api.get("/cities");
    assertStatus(res, 200);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Cities 01-B  GET /cities/:id");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns 404 for non-existent ObjectId", async () => {
    const res = await api.get("/cities/000000000000000000000000");
    assertStatus(res, 404);
  });

  await test("returns 4xx for invalid id format", async () => {
    const res = await api.get("/cities/not-a-valid-id");
    assert(res.status >= 400, "should reject invalid ObjectId");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Cities 01-C  POST /cities — create (admin only)");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects create by regular user — 403", async () => {
    const res = await api.post("/cities", { name: "Hacker City", slug: `hack-${ts}` }, token);
    assertStatus(res, 403);
  });

  await test("rejects create without auth — 401", async () => {
    const res = await api.post("/cities", { name: "No Auth", slug: `noauth-${ts}` });
    assertStatus(res, 401);
  });

  await test("creates city with admin token — 201", async () => {
    if (!adminToken) return console.log("    ⚠ skip: no ADMIN_TOKEN");
    const slug = `test-city-${ts}`;
    const res  = await api.post("/cities", {
      name:   `Test City ${ts}`,
      slug,
      region: "Test Region",
    }, adminToken);
    assertStatus(res, 201);
    assert(res.data._id || res.data.id, "should return city id");
    assertEqual(res.data.name, `Test City ${ts}`, "name");
    assertEqual(res.data.slug, slug, "slug");
    testCityId = res.data._id || res.data.id;
  });

  await test("rejects duplicate slug — 4xx", async () => {
    if (!adminToken) return console.log("    ⚠ skip: no ADMIN_TOKEN");
    const res = await api.post("/cities", {
      name: "Duplicate City",
      slug: `test-city-${ts}`,
    }, adminToken);
    assert(res.status >= 400, "should reject duplicate slug");
  });

  await test("rejects missing name — 4xx", async () => {
    if (!adminToken) return console.log("    ⚠ skip: no ADMIN_TOKEN");
    const res = await api.post("/cities", { slug: `noname-${ts}` }, adminToken);
    assert(res.status >= 400, "should reject missing name");
  });

  await test("rejects missing slug — 4xx", async () => {
    if (!adminToken) return console.log("    ⚠ skip: no ADMIN_TOKEN");
    const res = await api.post("/cities", { name: "No Slug" }, adminToken);
    assert(res.status >= 400, "should reject missing slug");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Cities 01-D  GET /cities/:id — after create & PUT /cities/:id");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("fetches created city by id — 200", async () => {
    if (!testCityId) return console.log("    ⚠ skip: no testCityId");
    const res = await api.get(`/cities/${testCityId}`);
    assertStatus(res, 200);
    assertEqual(res.data.name, `Test City ${ts}`, "name");
  });

  await test("rejects update by regular user — 403", async () => {
    if (!testCityId) return console.log("    ⚠ skip: no testCityId");
    const res = await api.put(`/cities/${testCityId}`, { name: "Hack" }, token);
    assertStatus(res, 403);
  });

  await test("updates city with admin — 200", async () => {
    if (!testCityId) return console.log("    ⚠ skip: no testCityId");
    if (!adminToken) return console.log("    ⚠ skip: no ADMIN_TOKEN");
    const res = await api.put(`/cities/${testCityId}`, {
      name:   `Updated City ${ts}`,
      region: "Updated Region",
    }, adminToken);
    assertStatus(res, 200);
    assertEqual(res.data.name, `Updated City ${ts}`, "name updated");
  });

  await test("returns 404 for update on non-existent id", async () => {
    if (!adminToken) return console.log("    ⚠ skip: no ADMIN_TOKEN");
    const res = await api.put("/cities/000000000000000000000000", { name: "Ghost" }, adminToken);
    assertStatus(res, 404);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Cities 01-E  DELETE /cities/:id (admin only)");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects delete by regular user — 403", async () => {
    if (!testCityId) return console.log("    ⚠ skip: no testCityId");
    const res = await api.delete(`/cities/${testCityId}`, token);
    assertStatus(res, 403);
  });

  await test("admin deletes city — 200", async () => {
    if (!testCityId) return console.log("    ⚠ skip: no testCityId");
    if (!adminToken) return console.log("    ⚠ skip: no ADMIN_TOKEN");
    const res = await api.delete(`/cities/${testCityId}`, adminToken);
    assertStatus(res, 200);
  });

  await test("confirm city is deleted — 404", async () => {
    if (!testCityId) return console.log("    ⚠ skip: no testCityId");
    const res = await api.get(`/cities/${testCityId}`);
    assertStatus(res, 404);
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  return summary("Suite — Cities CRUD");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
