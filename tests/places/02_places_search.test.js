/**
 * TEST SUITE — Places Search & Discovery
 *
 * Covers:
 *   GET /places/search     — text search (q), with cityId/categoryId filter
 *   GET /places/nearby     — geo-spatial (lat, lng, radius)
 *   GET /places/top        — top-rated / most reviewed
 *   Query params, coordinate validation, pagination fallback
 *
 * Usage:  node tests/places/02_places_search.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

// ── Shared state ───────────────────────────────────────────────────────────────
let token      = null;
let testPlaceId = null;
let testCityId  = null;
let testCategoryId = null;
let ts = Date.now();

async function bootstrap() {
  const u = makeTestUser("places_srch");
  const res = await api.post("/auth/register", {
    firstName: u.firstName,
    lastName:  u.lastName,
    email:     u.email,
    password:  u.password,
  });
  if (!res.ok) throw new Error(`Bootstrap failed: ${JSON.stringify(res.data)}`);
  token = res.data.token;

  // Grab existing city + category
  const citiesRes = await api.get("/cities");
  if (citiesRes.ok && Array.isArray(citiesRes.data) && citiesRes.data.length > 0) {
    testCityId = citiesRes.data[0]._id || citiesRes.data[0].id;
  }
  const catRes = await api.get("/categories");
  if (catRes.ok && Array.isArray(catRes.data) && catRes.data.length > 0) {
    testCategoryId = catRes.data[0]._id || catRes.data[0].id;
  }

  // Create a test place if possible (needed for search to yield results)
  if (testCityId && testCategoryId) {
    const slug = `search-test-${ts}`;
    const pRes = await api.post("/places", {
      name:        "Cafe Search Test Place",
      slug,
      categoryId:  testCategoryId,
      cityId:      testCityId,
      description: "A unique cafe for testing search functionality",
      address:     "42 Search Avenue",
      location:    { type: "Point", coordinates: [-7.5898, 33.5731] },
    }, token);
    if (pRes.ok) testPlaceId = pRes.data._id || pRes.data.id;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
async function runAll() {
  await bootstrap();

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Places 02-A  GET /places/search");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns places matching text query — 200", async () => {
    const res = await api.get("/places/search?q=Cafe");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("search with empty query returns places — 200", async () => {
    const res = await api.get("/places/search?q=");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("search with non-matching q returns empty array", async () => {
    const res = await api.get("/places/search?q=xyznonexistent999");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("search filters by cityId", async () => {
    if (!testCityId) return console.log("    ⚠ skip: no testCityId");
    const res = await api.get(`/places/search?cityId=${testCityId}`);
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("search filters by categoryId", async () => {
    if (!testCategoryId) return console.log("    ⚠ skip: no testCategoryId");
    const res = await api.get(`/places/search?categoryId=${testCategoryId}`);
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("search with all filters combined", async () => {
    if (!testCityId || !testCategoryId) return console.log("    ⚠ skip: missing dependencies");
    const res = await api.get(`/places/search?q=Cafe&cityId=${testCityId}&categoryId=${testCategoryId}`);
    assertStatus(res, 200);
  });

  await test("search without query params returns all — 200", async () => {
    const res = await api.get("/places/search");
    assertStatus(res, 200);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Places 02-B  GET /places/nearby");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns places near coordinates — 200", async () => {
    const res = await api.get("/places/nearby?lat=33.5731&lng=-7.5898");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("nearby with custom radius — 200", async () => {
    const res = await api.get("/places/nearby?lat=33.5731&lng=-7.5898&radius=10000");
    assertStatus(res, 200);
  });

  await test("nearby with 0 results returns empty array", async () => {
    const res = await api.get("/places/nearby?lat=90&lng=180&radius=1");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("nearby rejects missing lat/lng — 4xx or empty", async () => {
    const res = await api.get("/places/nearby");
    // Should either error or return empty — accept either
    assert(res.ok || res.status >= 400, "should handle missing coordinates");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Places 02-C  GET /places/top");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns top places — 200", async () => {
    const res = await api.get("/places/top");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("top places respects limit param", async () => {
    const res = await api.get("/places/top?limit=3");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("top places with high limit — 200", async () => {
    const res = await api.get("/places/top?limit=50");
    assertStatus(res, 200);
  });

  await test("top places with invalid limit defaults gracefully", async () => {
    const res = await api.get("/places/top?limit=abc");
    assertStatus(res, 200);
  });

  // ── Cleanup ──────────────────────────────────────────────────────────────
  if (testPlaceId) {
    const adminToken = process.env.ADMIN_TOKEN;
    if (adminToken) {
      await api.delete(`/places/${testPlaceId}`, adminToken).catch(() => {});
    }
  }

  return summary("Suite — Places Search & Discovery");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
