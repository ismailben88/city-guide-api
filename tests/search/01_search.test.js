/**
 * TEST SUITE — Cross-Resource Search
 *
 * Tests search & discovery endpoints across multiple resource types:
 *   GET /places/search   — full-text search on places
 *   GET /places          — list with filters
 *   GET /events          — list with filters
 *   GET /guides          — list with filters
 *   GET /places/nearby   — geo search
 *   GET /places/top      — top places
 *   Pagination, filters, edge cases
 *
 * Usage:  node tests/search/01_search.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

// ── Shared state ───────────────────────────────────────────────────────────────
let token          = null;
let testPlaceId    = null;
let testCityId     = null;
let testCategoryId = null;
let ts             = Date.now();

async function bootstrap() {
  const u = makeTestUser("search");
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

  // Create a searchable place
  if (testCityId && testCategoryId) {
    const slug = `searchable-place-${ts}`;
    const pRes = await api.post("/places", {
      name:        "Alphabet Soup Restaurant",
      slug,
      categoryId:  testCategoryId,
      cityId:      testCityId,
      description: "The best alphabet soup in town. A unique dining experience.",
      address:     "999 Search Lane",
      priceRange:  "$$",
    }, token);
    if (pRes.ok) testPlaceId = pRes.data._id || pRes.data.id;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
async function runAll() {
  await bootstrap();

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Search 01-A  Places search — GET /places/search");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("search by keyword returns matching places — 200", async () => {
    const res = await api.get("/places/search?q=Alphabet");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("search with multiple words — 200", async () => {
    const res = await api.get("/places/search?q=Soup+Restaurant");
    assertStatus(res, 200);
  });

  await test("search with partial word match — 200", async () => {
    const res = await api.get("/places/search?q=alph");
    assertStatus(res, 200);
  });

  await test("search with cityId filter", async () => {
    if (!testCityId) return console.log("    ⚠ skip: no testCityId");
    const res = await api.get(`/places/search?q=Restaurant&cityId=${testCityId}`);
    assertStatus(res, 200);
  });

  await test("search with categoryId filter", async () => {
    if (!testCategoryId) return console.log("    ⚠ skip: no testCategoryId");
    const res = await api.get(`/places/search?q=Restaurant&categoryId=${testCategoryId}`);
    assertStatus(res, 200);
  });

  await test("search with no matches returns empty array", async () => {
    const res = await api.get("/places/search?q=xyznonexistentvalue");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
    assert(res.data.length === 0, "should be empty for no matches");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Search 01-B  Places list with pagination — GET /places");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("list places with page & limit — 200", async () => {
    const res = await api.get("/places?page=1&limit=5");
    assertStatus(res, 200);
    if (res.data.places) {
      assert(typeof res.data.total === "number", "should return total");
      assert(typeof res.data.page === "number", "should return page");
      assert(typeof res.data.limit === "number", "should return limit");
    }
  });

  await test("list places with city filter", async () => {
    if (!testCityId) return console.log("    ⚠ skip: no testCityId");
    const res = await api.get(`/places?cityId=${testCityId}`);
    assertStatus(res, 200);
  });

  await test("list places with category filter", async () => {
    if (!testCategoryId) return console.log("    ⚠ skip: no testCategoryId");
    const res = await api.get(`/places?categoryId=${testCategoryId}`);
    assertStatus(res, 200);
  });

  await test("list featured places", async () => {
    const res = await api.get("/places?isFeatured=true");
    assertStatus(res, 200);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Search 01-C  Events list — GET /events");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("list events with pagination — 200", async () => {
    const res = await api.get("/events?page=1&limit=10");
    assertStatus(res, 200);
  });

  await test("list featured events — 200", async () => {
    const res = await api.get("/events?isFeatured=true");
    assertStatus(res, 200);
  });

  await test("list upcoming events — 200", async () => {
    const res = await api.get("/events?status=upcoming");
    assertStatus(res, 200);
  });

  await test("list events by city — 200", async () => {
    if (!testCityId) return console.log("    ⚠ skip: no testCityId");
    const res = await api.get(`/events?cityId=${testCityId}`);
    assertStatus(res, 200);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Search 01-D  Guides list — GET /guides");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("list guides — 200", async () => {
    const res = await api.get("/guides");
    assertStatus(res, 200);
    assert(Array.isArray(res.data) || (res.data.guides !== undefined), "should return guides");
  });

  await test("list guides with pagination", async () => {
    const res = await api.get("/guides?page=1&limit=5");
    assertStatus(res, 200);
  });

  await test("list guides filtered by city", async () => {
    if (!testCityId) return console.log("    ⚠ skip: no testCityId");
    const res = await api.get(`/guides?cityId=${testCityId}`);
    assertStatus(res, 200);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Search 01-E  Nearby — GET /places/nearby");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("nearby places with coordinates — 200", async () => {
    const res = await api.get("/places/nearby?lat=33.5731&lng=-7.5898");
    assertStatus(res, 200);
  });

  await test("nearby places with radius — 200", async () => {
    const res = await api.get("/places/nearby?lat=33.5731&lng=-7.5898&radius=20000");
    assertStatus(res, 200);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Search 01-F  Top places — GET /places/top");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("top places default — 200", async () => {
    const res = await api.get("/places/top");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return array");
  });

  await test("top places with limit — 200", async () => {
    const res = await api.get("/places/top?limit=5");
    assertStatus(res, 200);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Search 01-G  Edge cases");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("places list with large page number — 200", async () => {
    const res = await api.get("/places?page=9999&limit=5");
    assertStatus(res, 200);
  });

  await test("places list with string page param — 200", async () => {
    const res = await api.get("/places?page=abc&limit=5");
    assertStatus(res, 200);
  });

  await test("places list with negative limit — 200 (should default)", async () => {
    const res = await api.get("/places?limit=-1");
    assertStatus(res, 200);
  });

  // ── Cleanup ──────────────────────────────────────────────────────────────
  if (testPlaceId) {
    const adminToken = process.env.ADMIN_TOKEN;
    if (adminToken) {
      await api.delete(`/places/${testPlaceId}`, adminToken).catch(() => {});
    }
  }

  return summary("Suite — Cross-Resource Search");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
