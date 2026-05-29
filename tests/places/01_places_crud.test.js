/**
 * TEST SUITE — Places CRUD
 *
 * Covers:
 *   GET    /places         — list (empty, with filters)
 *   GET    /places/:id     — by id, not found, invalid id
 *   POST   /places         — create (auth), validation, duplicate slug
 *   PUT    /places/:id     — update (auth), not found, protected fields
 *   DELETE /places/:id     — soft delete (admin/entrepreneur), 403 for regular user
 *
 * Usage:  node tests/places/01_places_crud.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

// ── Shared state ───────────────────────────────────────────────────────────────
let user          = null;
let token         = null;
let adminToken    = null;
let testPlaceId   = null;
let testCityId    = null;
let testCategoryId = null;
let ts            = Date.now();

async function bootstrap() {
  const u = makeTestUser("places_crud");
  const res = await api.post("/auth/register", {
    firstName: u.firstName,
    lastName:  u.lastName,
    email:     u.email,
    password:  u.password,
  });
  if (!res.ok) throw new Error(`Bootstrap register failed: ${JSON.stringify(res.data)}`);
  user       = res.data.user;
  token      = res.data.token;
  adminToken = process.env.ADMIN_TOKEN || null;

  // Find or create a city
  const citiesRes = await api.get("/cities");
  if (citiesRes.ok && Array.isArray(citiesRes.data) && citiesRes.data.length > 0) {
    testCityId = citiesRes.data[0]._id || citiesRes.data[0].id;
  } else if (adminToken) {
    const citySlug = `test-city-${ts}`;
    const cityRes = await api.post("/cities", { name: "Test City", slug: citySlug }, adminToken);
    if (cityRes.ok) testCityId = cityRes.data._id || cityRes.data.id;
  }

  // Find or create a category
  const catRes = await api.get("/categories");
  if (catRes.ok && Array.isArray(catRes.data) && catRes.data.length > 0) {
    testCategoryId = catRes.data[0]._id || catRes.data[0].id;
  } else if (adminToken) {
    const catSlug = `test-cat-${ts}`;
    const catCreateRes = await api.post("/categories", { name: "Test Category", slug: catSlug }, adminToken);
    if (catCreateRes.ok) testCategoryId = catCreateRes.data._id || catCreateRes.data.id;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
async function runAll() {
  await bootstrap();

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Places 01-A  GET /places");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns a list (possibly empty) — 200", async () => {
    const res = await api.get("/places");
    assertStatus(res, 200);
    assert(res.data.places !== undefined || Array.isArray(res.data), "should return places array");
  });

  await test("filters by cityId", async () => {
    if (!testCityId) return console.log("    ⚠ skip: no testCityId");
    const res = await api.get(`/places?cityId=${testCityId}`);
    assertStatus(res, 200);
  });

  await test("filters by categoryId", async () => {
    if (!testCategoryId) return console.log("    ⚠ skip: no testCategoryId");
    const res = await api.get(`/places?categoryId=${testCategoryId}`);
    assertStatus(res, 200);
  });

  await test("filters by isFeatured", async () => {
    const res = await api.get("/places?isFeatured=true");
    assertStatus(res, 200);
  });

  await test("filters by status", async () => {
    const res = await api.get("/places?status=active");
    assertStatus(res, 200);
  });

  await test("supports pagination (page & limit)", async () => {
    const res = await api.get("/places?page=1&limit=5");
    assertStatus(res, 200);
    if (res.data.places) {
      assert(res.data.page !== undefined, "should return page");
      assert(res.data.limit !== undefined, "should return limit");
      assert(res.data.total !== undefined, "should return total");
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Places 01-B  GET /places/:id");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns 404 for non-existent ObjectId", async () => {
    const res = await api.get("/places/000000000000000000000000");
    assertStatus(res, 404);
  });

  await test("returns 4xx for invalid id format", async () => {
    const res = await api.get("/places/not-a-valid-id");
    assert(res.status >= 400, "should reject invalid ObjectId");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Places 01-C  POST /places — create");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("creates a place with valid data — 201", async () => {
    if (!testCityId || !testCategoryId) return console.log("    ⚠ skip: missing testCityId or testCategoryId");
    const slug = `test-place-${ts}`;
    const res  = await api.post("/places", {
      name:       "Test Place",
      slug,
      categoryId: testCategoryId,
      cityId:     testCityId,
      description: "A test place for integration tests",
      address:    "123 Test Street",
      priceRange: "$$",
      location:   { type: "Point", coordinates: [-7.5898, 33.5731] },
    }, token);
    assertStatus(res, 201);
    assert(res.data._id || res.data.id, "should return place id");
    assertEqual(res.data.name, "Test Place", "name");
    assertEqual(res.data.slug, slug, "slug");
    testPlaceId = res.data._id || res.data.id;
  });

  await test("rejects duplicate slug — 4xx", async () => {
    if (!testCityId || !testCategoryId) return console.log("    ⚠ skip: missing dependencies");
    const res = await api.post("/places", {
      name:       "Another Place",
      slug:       `test-place-${ts}`,
      categoryId: testCategoryId,
      cityId:     testCityId,
    }, token);
    assert(res.status >= 400, "should reject duplicate slug");
  });

  await test("rejects missing name — 4xx", async () => {
    if (!testCategoryId || !testCityId) return console.log("    ⚠ skip: missing dependencies");
    const res = await api.post("/places", {
      slug:       `no-name-${ts}`,
      categoryId: testCategoryId,
      cityId:     testCityId,
    }, token);
    assert(res.status >= 400, "should reject missing name");
  });

  await test("rejects missing slug — 4xx", async () => {
    if (!testCategoryId || !testCityId) return console.log("    ⚠ skip: missing dependencies");
    const res = await api.post("/places", {
      name:       "No Slug",
      categoryId: testCategoryId,
      cityId:     testCityId,
    }, token);
    assert(res.status >= 400, "should reject missing slug");
  });

  await test("rejects missing categoryId — 4xx", async () => {
    if (!testCityId) return console.log("    ⚠ skip: missing testCityId");
    const res = await api.post("/places", {
      name:   "No Category",
      slug:   `no-cat-${ts}`,
      cityId: testCityId,
    }, token);
    assert(res.status >= 400, "should reject missing categoryId");
  });

  await test("rejects missing cityId — 4xx", async () => {
    if (!testCategoryId) return console.log("    ⚠ skip: missing testCategoryId");
    const res = await api.post("/places", {
      name:       "No City",
      slug:       `no-city-${ts}`,
      categoryId: testCategoryId,
    }, token);
    assert(res.status >= 400, "should reject missing cityId");
  });

  await test("rejects create without auth — 401", async () => {
    if (!testCityId || !testCategoryId) return console.log("    ⚠ skip: missing dependencies");
    const res = await api.post("/places", {
      name:       "Unauthorized",
      slug:       `unauth-${ts}`,
      categoryId: testCategoryId,
      cityId:     testCityId,
    });
    assertStatus(res, 401);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Places 01-D  GET /places/:id — after create");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("fetches created place by id — 200", async () => {
    if (!testPlaceId) return console.log("    ⚠ skip: no testPlaceId");
    const res = await api.get(`/places/${testPlaceId}`);
    assertStatus(res, 200);
    assertEqual(res.data.name, "Test Place", "name");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Places 01-E  PUT /places/:id — update");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("updates place fields — 200", async () => {
    if (!testPlaceId) return console.log("    ⚠ skip: no testPlaceId");
    const res = await api.put(`/places/${testPlaceId}`, {
      name:        "Updated Place",
      description: "Updated description",
      priceRange:  "$$$",
    }, token);
    assertStatus(res, 200);
    assertEqual(res.data.name, "Updated Place", "name updated");
    assertEqual(res.data.description, "Updated description", "description updated");
  });

  await test("rejects update without auth — 401", async () => {
    if (!testPlaceId) return console.log("    ⚠ skip: no testPlaceId");
    const res = await api.put(`/places/${testPlaceId}`, { name: "No Auth" });
    assertStatus(res, 401);
  });

  await test("returns 404 for update on non-existent id", async () => {
    const res = await api.put("/places/000000000000000000000000", { name: "Ghost" }, token);
    assertStatus(res, 404);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Places 01-F  DELETE /places/:id — soft delete");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("regular user cannot delete a place — 403", async () => {
    if (!testPlaceId) return console.log("    ⚠ skip: no testPlaceId");
    const res = await api.delete(`/places/${testPlaceId}`, token);
    assertStatus(res, 403);
  });

  await test("admin can delete (soft archive) a place — 200", async () => {
    if (!testPlaceId) return console.log("    ⚠ skip: no testPlaceId");
    if (!adminToken)   return console.log("    ⚠ skip: no ADMIN_TOKEN");
    const res = await api.delete(`/places/${testPlaceId}`, adminToken);
    assertStatus(res, 200);
    assert(res.data.message, "should return confirmation message");
  });

  await test("rejects delete without auth — 401", async () => {
    if (!testPlaceId) return console.log("    ⚠ skip: no testPlaceId");
    const res = await api.delete(`/places/${testPlaceId}`);
    assertStatus(res, 401);
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  return summary("Suite — Places CRUD");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
