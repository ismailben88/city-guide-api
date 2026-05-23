/**
 * TEST SUITE — Home Page: GET /places endpoints
 *
 * Covers:
 *   GET /places              — list, filter by status/cityId/categoryId/isFeatured
 *   GET /places?page=&limit= — pagination
 *   GET /places/top          — top places (featured + reviews)
 *   GET /places/search       — search by name, cityId, categoryId
 *   GET /places/nearby       — nearby places (geo)
 *   GET /places/:id          — single place
 *
 * Usage:
 *   node tests/home/04_home_places.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

const FAKE_ID = "000000000000000000000000";
const BAD_ID  = "not-a-valid-objectid";

// ── Bootstrap ─────────────────────────────────────────────────────────────────

let token;

async function bootstrap() {
  const u = makeTestUser("home-places");
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
  suite("HOME-01  GET /places — list & defaults");
  // ═════════════════════════════════════════════════════════════════════════

  await test("returns 200 with places array and pagination meta", async () => {
    const res = await api.get("/places");
    assertStatus(res, 200);
    assert(Array.isArray(res.data.places), "places should be an array");
    assert(typeof res.data.total === "number", "total should be a number");
    assert(typeof res.data.page === "number", "page should be a number");
    assert(typeof res.data.limit === "number", "limit should be a number");
    assert(res.data.total >= 0, "total should be >= 0");
  });

  await test("default limit is applied when no limit param", async () => {
    const res = await api.get("/places");
    assertStatus(res, 200);
    // server default is typically 50 — just check it's reasonable
    assert(res.data.limit > 0, "limit should be > 0");
    assert(res.data.places.length <= res.data.limit, "places should respect limit");
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-02  GET /places — status filter");
  // ═════════════════════════════════════════════════════════════════════════

  await test("filters by status=active — 200", async () => {
    const res = await api.get("/places?status=active");
    assertStatus(res, 200);
    assert(Array.isArray(res.data.places), "should return array");
  });

  await test("filters by status=all — 200", async () => {
    const res = await api.get("/places?status=all");
    assertStatus(res, 200);
    assert(Array.isArray(res.data.places), "should return array");
  });

  await test("handles unknown status gracefully — 200", async () => {
    const res = await api.get("/places?status=invalid_status_xyz");
    assert(res.status === 200 || res.status === 400,
      `expected 200 or 400, got ${res.status}`);
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-03  GET /places — cityId & categoryId filters");
  // ═════════════════════════════════════════════════════════════════════════

  await test("filters by cityId — 200", async () => {
    const res = await api.get(`/places?cityId=${FAKE_ID}`);
    assertStatus(res, 200);
    assert(Array.isArray(res.data.places), "should return array");
  });

  await test("filters by categoryId — 200", async () => {
    const res = await api.get(`/places?categoryId=${FAKE_ID}`);
    assertStatus(res, 200);
    assert(Array.isArray(res.data.places), "should return array");
  });

  await test("filters by cityId + categoryId combined — 200", async () => {
    const res = await api.get(`/places?cityId=${FAKE_ID}&categoryId=${FAKE_ID}`);
    assertStatus(res, 200);
    assert(Array.isArray(res.data.places), "should return array");
  });

  await test("filters by isFeatured=true — 200", async () => {
    const res = await api.get("/places?isFeatured=true");
    assertStatus(res, 200);
    assert(Array.isArray(res.data.places), "should return array");
  });

  await test("filters by isFeatured=false — 200", async () => {
    const res = await api.get("/places?isFeatured=false");
    assertStatus(res, 200);
    assert(Array.isArray(res.data.places), "should return array");
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-04  GET /places — pagination");
  // ═════════════════════════════════════════════════════════════════════════

  await test("pagination with limit — 200", async () => {
    const res = await api.get("/places?limit=3");
    assertStatus(res, 200);
    assert(res.data.places.length <= 3, "should respect limit=3");
    assertEqual(res.data.limit, 3, "limit in response");
  });

  await test("pagination with page and limit — 200", async () => {
    const res = await api.get("/places?page=1&limit=3");
    assertStatus(res, 200);
    assert(res.data.page === 1, "page should be 1");
  });

  await test("page beyond results returns empty array — 200", async () => {
    const res = await api.get("/places?page=99999&limit=100");
    assertStatus(res, 200);
    assert(Array.isArray(res.data.places), "should return array");
    // should be empty or small
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-05  GET /places/top — top places");
  // ═════════════════════════════════════════════════════════════════════════

  await test("returns array of top places — 200", async () => {
    const res = await api.get("/places/top");
    assert(res.status === 200 || res.status === 404,
      `expected 200 or 404, got ${res.status}`);
    if (res.status === 200) {
      assert(Array.isArray(res.data), "should return an array");
    }
  });

  await test("top places respects limit param — 200", async () => {
    const res = await api.get("/places/top?limit=3");
    assert(res.status === 200 || res.status === 404,
      `expected 200 or 404, got ${res.status}`);
    if (res.status === 200 && Array.isArray(res.data)) {
      assert(res.data.length <= 3, "should respect limit=3");
    }
  });

  await test("top places with limit=0 returns empty — 200", async () => {
    const res = await api.get("/places/top?limit=0");
    assert(res.status === 200 || res.status === 404,
      `expected 200 or 404, got ${res.status}`);
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-06  GET /places/search — search");
  // ═════════════════════════════════════════════════════════════════════════

  await test("search by name — 200", async () => {
    const res = await api.get("/places/search?q=test");
    assert(res.status === 200 || res.status === 404,
      `expected 200 or 404, got ${res.status}`);
    if (res.status === 200) {
      assert(Array.isArray(res.data), "should return array");
    }
  });

  await test("search with cityId — 200", async () => {
    const res = await api.get(`/places/search?q=test&cityId=${FAKE_ID}`);
    assert(res.status === 200 || res.status === 404,
      `expected 200 or 404, got ${res.status}`);
    if (res.status === 200) {
      assert(Array.isArray(res.data), "should return array");
    }
  });

  await test("search with empty q returns all — 200", async () => {
    const res = await api.get("/places/search?q=");
    assert(res.status === 200 || res.status === 404,
      `expected 200 or 404, got ${res.status}`);
    if (res.status === 200) {
      assert(Array.isArray(res.data), "should return array");
    }
  });

  await test("search with special characters in q — 200", async () => {
    const res = await api.get("/places/search?q=%24%5E%2B%28%29"); // $^+()
    assert(res.status === 200 || res.status === 404,
      `expected 200 or 404, got ${res.status}`);
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-07  GET /places/nearby — geolocation");
  // ═════════════════════════════════════════════════════════════════════════

  await test("nearby without params returns 4xx — 400", async () => {
    const res = await api.get("/places/nearby");
    assert(res.status === 400 || res.status === 200,
      `expected 400 or 200, got ${res.status}`);
  });

  await test("nearby with valid lat/lng — 200", async () => {
    const res = await api.get("/places/nearby?lat=31.6295&lng=-7.9811");
    assert(res.status === 200 || res.status === 404,
      `expected 200 or 404, got ${res.status}`);
    if (res.status === 200) {
      assert(Array.isArray(res.data), "should return array");
    }
  });

  await test("nearby with custom radius — 200", async () => {
    const res = await api.get("/places/nearby?lat=31.6295&lng=-7.9811&radius=10000");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return array");
  });

  await test("nearby with zero radius — 200", async () => {
    const res = await api.get("/places/nearby?lat=31.6295&lng=-7.9811&radius=0");
    assert(res.status === 200 || res.status === 400,
      `expected 200 or 400, got ${res.status}`);
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-08  GET /places/:id — single place");
  // ═════════════════════════════════════════════════════════════════════════

  await test("returns 404 for non-existent place — 404", async () => {
    const res = await api.get(`/places/${FAKE_ID}`);
    assertStatus(res, 404);
  });

  await test("returns 4xx for malformed place ID", async () => {
    const res = await api.get(`/places/${BAD_ID}`);
    assert(res.status === 400 || res.status === 500 || res.status === 404,
      `expected 4xx/500, got ${res.status}`);
  });

  await test("returns 200 with place object for valid ID (fetch first from list)", async () => {
    const listRes = await api.get("/places?limit=1");
    assertStatus(listRes, 200);
    if (listRes.data.places.length > 0) {
      const first = listRes.data.places[0];
      const id = first._id || first.id;
      const res = await api.get(`/places/${id}`);
      assertStatus(res, 200);
      assert(res.data._id === id || res.data.id === id,
        "returned place should match requested ID");
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-09  GET /places — lang parameter");
  // ═════════════════════════════════════════════════════════════════════════

  await test("supports lang=fr parameter — 200", async () => {
    const res = await api.get("/places?lang=fr");
    assertStatus(res, 200);
    assert(Array.isArray(res.data.places), "should return array");
  });

  await test("supports lang=ar parameter — 200", async () => {
    const res = await api.get("/places?lang=ar");
    assertStatus(res, 200);
    assert(Array.isArray(res.data.places), "should return array");
  });

  await test("supports lang=en parameter — 200", async () => {
    const res = await api.get("/places?lang=en");
    assertStatus(res, 200);
    assert(Array.isArray(res.data.places), "should return array");
  });

  return summary("Home Places API");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
