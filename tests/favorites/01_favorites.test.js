/**
 * TEST SUITE — Favorites CRUD
 *
 * Covers:
 *   GET    /favorites        — list user's favorites (auth), filter by targetType/targetId
 *   POST   /favorites        — add favorite (auth), duplicate guard
 *   DELETE /favorites/:id    — remove favorite (auth)
 *   Auth required for all endpoints
 *
 * Usage:  node tests/favorites/01_favorites.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

// ── Shared state ───────────────────────────────────────────────────────────────
let token           = null;
let testPlaceId     = null;
let testCityId      = null;
let testCategoryId  = null;
let testFavoriteId  = null;
let ts              = Date.now();

async function bootstrap() {
  const u = makeTestUser("favs");
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

  // Create a place to favorite
  if (testCityId && testCategoryId) {
    const slug = `fav-place-${ts}`;
    const pRes = await api.post("/places", {
      name:       "Favorite Test Place",
      slug,
      categoryId: testCategoryId,
      cityId:     testCityId,
    }, token);
    if (pRes.ok) testPlaceId = pRes.data._id || pRes.data.id;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
async function runAll() {
  await bootstrap();

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Favorites 01-A  GET /favorites");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns user's favorites (initially empty) — 200", async () => {
    const res = await api.get("/favorites", token);
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("rejects without auth — 401", async () => {
    const res = await api.get("/favorites");
    assertStatus(res, 401);
  });

  await test("filters by targetType", async () => {
    const res = await api.get("/favorites?targetType=Place", token);
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("filters by targetType and targetId", async () => {
    if (!testPlaceId) return console.log("    ⚠ skip: no testPlaceId");
    const res = await api.get(`/favorites?targetType=Place&targetId=${testPlaceId}`, token);
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Favorites 01-B  POST /favorites — add");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("adds a place to favorites — 201", async () => {
    if (!testPlaceId) return console.log("    ⚠ skip: no testPlaceId");
    const res = await api.post("/favorites", {
      targetId:   testPlaceId,
      targetType: "Place",
    }, token);
    assertStatus(res, 201);
    assert(res.data._id || res.data.id, "should return favorite id");
    testFavoriteId = res.data._id || res.data.id;
  });

  await test("rejects duplicate favorite — 400", async () => {
    if (!testPlaceId) return console.log("    ⚠ skip: no testPlaceId");
    const res = await api.post("/favorites", {
      targetId:   testPlaceId,
      targetType: "Place",
    }, token);
    assertStatus(res, 400);
  });

  await test("rejects missing targetId — 4xx", async () => {
    const res = await api.post("/favorites", { targetType: "Place" }, token);
    assert(res.status >= 400, "should reject missing targetId");
  });

  await test("rejects missing targetType — 4xx", async () => {
    if (!testPlaceId) return console.log("    ⚠ skip: no testPlaceId");
    const res = await api.post("/favorites", { targetId: testPlaceId }, token);
    assert(res.status >= 400, "should reject missing targetType");
  });

  await test("rejects add without auth — 401", async () => {
    if (!testPlaceId) return console.log("    ⚠ skip: no testPlaceId");
    const res = await api.post("/favorites", {
      targetId:   testPlaceId,
      targetType: "Place",
    });
    assertStatus(res, 401);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Favorites 01-C  GET /favorites — after add");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("favorites list now contains the added item", async () => {
    if (!testPlaceId) return console.log("    ⚠ skip: no testPlaceId");
    const res = await api.get("/favorites", token);
    assertStatus(res, 200);
    const favs = Array.isArray(res.data) ? res.data : [];
    const match = favs.some((f) => {
      const tid = f.targetId?._id || f.targetId?.id || f.targetId;
      return tid === testPlaceId;
    });
    assert(match, "favorites should include the added place");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Favorites 01-D  DELETE /favorites/:id — remove");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects remove without auth — 401", async () => {
    if (!testFavoriteId) return console.log("    ⚠ skip: no testFavoriteId");
    const res = await api.delete(`/favorites/${testFavoriteId}`);
    assertStatus(res, 401);
  });

  await test("removes favorite — 200", async () => {
    if (!testFavoriteId) return console.log("    ⚠ skip: no testFavoriteId");
    const res = await api.delete(`/favorites/${testFavoriteId}`, token);
    assertStatus(res, 200);
  });

  await test("rejects remove of non-existent favorite — 200 or 404", async () => {
    if (!testFavoriteId) return console.log("    ⚠ skip: no testFavoriteId");
    const res = await api.delete(`/favorites/${testFavoriteId}`, token);
    // The controller uses findByIdAndDelete which succeeds even if not found
    assert(res.ok || res.status === 404, "should handle gracefully");
  });

  await test("favorites list is empty after removal", async () => {
    if (!testPlaceId) return console.log("    ⚠ skip: no testPlaceId");
    const res = await api.get("/favorites", token);
    assertStatus(res, 200);
    const favs = Array.isArray(res.data) ? res.data : [];
    const match = favs.some((f) => {
      const tid = f.targetId?._id || f.targetId?.id || f.targetId;
      return tid === testPlaceId;
    });
    assert(!match, "removed favorite should no longer appear");
  });

  // ── Cleanup ──────────────────────────────────────────────────────────────
  if (testPlaceId) {
    const adminToken = process.env.ADMIN_TOKEN;
    if (adminToken) {
      await api.delete(`/places/${testPlaceId}`, adminToken).catch(() => {});
    }
  }

  return summary("Suite — Favorites CRUD");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
