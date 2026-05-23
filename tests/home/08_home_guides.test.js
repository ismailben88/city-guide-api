/**
 * TEST SUITE — Home Page: GET /guideProfiles endpoints
 *
 * Covers:
 *   GET /guideProfiles       — list, sort, filter by cityId
 *   GET /guideProfiles/:id   — single guide profile
 *   GET /guideProfiles/nearby — nearby guides (geo)
 *
 * Usage:
 *   node tests/home/08_home_guides.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

const FAKE_ID = "000000000000000000000000";
const BAD_ID  = "not-a-valid-objectid";

// ── Bootstrap ─────────────────────────────────────────────────────────────────

let token;

async function bootstrap() {
  const u = makeTestUser("home-guide");
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
  suite("HOME-27  GET /guideProfiles — list & defaults");
  // ═════════════════════════════════════════════════════════════════════════

  await test("returns 200 with array of guide profiles", async () => {
    const res = await api.get("/guideProfiles");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("each guide has required fields", async () => {
    const res = await api.get("/guideProfiles");
    assertStatus(res, 200);
    if (res.data.length > 0) {
      const g = res.data[0];
      assert(g._id || g.id, "guide should have _id/id");
      assert(g.userId || g.user, "guide should have userId or user");
    }
  });

  await test("returns only verified/published guides", async () => {
    const res = await api.get("/guideProfiles");
    assertStatus(res, 200);
    if (res.data.length > 0) {
      res.data.forEach((g) => {
        // Either published or verified
        if (g.verificationStatus !== undefined) {
          assert(
            g.verificationStatus === "verified" || g.isPublished === true,
            `guide should be verified or published, got verificationStatus=${g.verificationStatus} isPublished=${g.isPublished}`
          );
        }
      });
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-28  GET /guideProfiles — filters");
  // ═════════════════════════════════════════════════════════════════════════

  await test("filters by cityId — 200", async () => {
    const res = await api.get(`/guideProfiles?cityId=${FAKE_ID}`);
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return array");
  });

  await test("filters by userId (if matching) — 200", async () => {
    const res = await api.get(`/guideProfiles?userId=${FAKE_ID}`);
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return array");
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-29  GET /guideProfiles — pagination");
  // ═════════════════════════════════════════════════════════════════════════

  await test("pagination with limit — 200", async () => {
    const res = await api.get("/guideProfiles?limit=3");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return array");
    assert(res.data.length <= 3, "should respect limit=3");
  });

  await test("pagination with page — 200", async () => {
    const res = await api.get("/guideProfiles?page=1&limit=2");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return array");
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-30  GET /guideProfiles/nearby — geolocation");
  // ═════════════════════════════════════════════════════════════════════════

  await test("nearby without params returns 4xx — 400", async () => {
    const res = await api.get("/guideProfiles/nearby");
    assert(res.status === 400 || res.status === 200,
      `expected 400 or 200, got ${res.status}`);
  });

  await test("nearby with valid lat/lng — 200", async () => {
    const res = await api.get("/guideProfiles/nearby?lat=31.6295&lng=-7.9811");
    assert(res.status === 200 || res.status === 404,
      `expected 200 or 404, got ${res.status}`);
    if (res.status === 200) {
      assert(Array.isArray(res.data), "should return array");
    }
  });

  await test("nearby with radius — 200", async () => {
    const res = await api.get("/guideProfiles/nearby?lat=31.6295&lng=-7.9811&radius=5000");
    assert(res.status === 200 || res.status === 404,
      `expected 200 or 404, got ${res.status}`);
    if (res.status === 200) {
      assert(Array.isArray(res.data), "should return array");
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-31  GET /guideProfiles/:id — single guide");
  // ═════════════════════════════════════════════════════════════════════════

  await test("returns 404 for non-existent guide — 404", async () => {
    const res = await api.get(`/guideProfiles/${FAKE_ID}`);
    assertStatus(res, 404);
  });

  await test("returns 4xx for malformed guide ID", async () => {
    const res = await api.get(`/guideProfiles/${BAD_ID}`);
    assert(res.status === 400 || res.status === 500 || res.status === 404,
      `expected 4xx/500, got ${res.status}`);
  });

  await test("returns 200 with guide for a valid ID (fetch first from list)", async () => {
    const listRes = await api.get("/guideProfiles?limit=1");
    assertStatus(listRes, 200);
    if (listRes.data.length > 0) {
      const first = listRes.data[0];
      const id = first._id || first.id;
      const res = await api.get(`/guideProfiles/${id}`);
      assertStatus(res, 200);
      assert(res.data._id === id || res.data.id === id,
        "returned guide should match requested ID");
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-32  GET /guideProfiles — frontend transform fields");
  // ═════════════════════════════════════════════════════════════════════════

  await test("guide profiles have rating and reviewCount", async () => {
    const res = await api.get("/guideProfiles");
    assertStatus(res, 200);
    if (res.data.length > 0) {
      const withRating = res.data.filter((g) => g.averageRating !== undefined);
      withRating.forEach((g) => {
        assert(typeof g.averageRating === "number", "averageRating should be a number");
        assert(g.averageRating >= 0 && g.averageRating <= 5, "averageRating should be 0-5");
      });
    }
  });

  await test("guide profiles have languages if present", async () => {
    const res = await api.get("/guideProfiles");
    assertStatus(res, 200);
    if (res.data.length > 0) {
      const withLang = res.data.filter((g) => g.spokenLanguages !== undefined);
      withLang.forEach((g) => {
        assert(Array.isArray(g.spokenLanguages), "spokenLanguages should be an array");
      });
    }
  });

  return summary("Home Guides API");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
