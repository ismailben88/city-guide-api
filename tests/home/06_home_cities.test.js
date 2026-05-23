/**
 * TEST SUITE — Home Page: GET /cities endpoints
 *
 * Covers:
 *   GET /cities          — list, isActive filter
 *   GET /cities/:id      — single city
 *   GET /cities?lang=    — i18n support
 *
 * Usage:
 *   node tests/home/06_home_cities.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

const FAKE_ID = "000000000000000000000000";
const BAD_ID  = "not-a-valid-objectid";

// ── Bootstrap ─────────────────────────────────────────────────────────────────

let token;

async function bootstrap() {
  const u = makeTestUser("home-city");
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
  suite("HOME-15  GET /cities — list & defaults");
  // ═════════════════════════════════════════════════════════════════════════

  await test("returns 200 with array of cities", async () => {
    const res = await api.get("/cities");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("each city has required fields", async () => {
    const res = await api.get("/cities");
    assertStatus(res, 200);
    if (res.data.length > 0) {
      const city = res.data[0];
      assert(city._id || city.id, "city should have _id/id");
      assert(city.name, "city should have name");
      assert(city.slug, "city should have slug");
    }
  });

  await test("default returns active cities only", async () => {
    const res = await api.get("/cities");
    assertStatus(res, 200);
    if (res.data.length > 0) {
      res.data.forEach((c) => {
        // isActive is undefined or true by default
        if (c.isActive !== undefined) {
          assertEqual(c.isActive, true, `city "${c.name}" should be active`);
        }
      });
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-16  GET /cities — isActive filter");
  // ═════════════════════════════════════════════════════════════════════════

  await test("filters by isActive=true — 200", async () => {
    const res = await api.get("/cities?isActive=true");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return array");
    res.data.forEach((c) => {
      if (c.isActive !== undefined) {
        assertEqual(c.isActive, true, `city "${c.name}" should be active`);
      }
    });
  });

  await test("filters by isActive=false — 200", async () => {
    const res = await api.get("/cities?isActive=false");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return array");
  });

  await test("handles invalid isActive value — 200", async () => {
    const res = await api.get("/cities?isActive=notabool");
    assert(res.status === 200 || res.status === 400,
      `expected 200 or 400, got ${res.status}`);
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-17  GET /cities — lang parameter");
  // ═════════════════════════════════════════════════════════════════════════

  await test("supports lang=fr — 200", async () => {
    const res = await api.get("/cities?lang=fr");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return array");
  });

  await test("supports lang=ar — 200", async () => {
    const res = await api.get("/cities?lang=ar");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return array");
  });

  await test("supports lang=en — 200", async () => {
    const res = await api.get("/cities?lang=en");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return array");
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-18  GET /cities/:id — single city");
  // ═════════════════════════════════════════════════════════════════════════

  await test("returns 404 for non-existent city — 404", async () => {
    const res = await api.get(`/cities/${FAKE_ID}`);
    assertStatus(res, 404);
  });

  await test("returns 4xx for malformed city ID", async () => {
    const res = await api.get(`/cities/${BAD_ID}`);
    assert(res.status === 400 || res.status === 500 || res.status === 404,
      `expected 4xx/500, got ${res.status}`);
  });

  await test("returns 200 with city for a valid ID (fetch first from list)", async () => {
    const listRes = await api.get("/cities?limit=1");
    assertStatus(listRes, 200);
    if (listRes.data.length > 0) {
      const first = listRes.data[0];
      const id = first._id || first.id;
      const res = await api.get(`/cities/${id}`);
      assertStatus(res, 200);
      assert(res.data._id === id || res.data.id === id,
        "returned city should match requested ID");
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-19  GET /cities — region & location fields");
  // ═════════════════════════════════════════════════════════════════════════

  await test("cities have region field if present", async () => {
    const res = await api.get("/cities");
    assertStatus(res, 200);
    if (res.data.length > 0) {
      const withRegion = res.data.filter((c) => c.region !== undefined);
      withRegion.forEach((c) => {
        assert(typeof c.region === "string", "region should be a string");
      });
    }
  });

  await test("cities sorted alphabetically by name", async () => {
    const res = await api.get("/cities");
    assertStatus(res, 200);
    if (res.data.length > 1) {
      for (let i = 1; i < res.data.length; i++) {
        assert(
          res.data[i - 1].name.localeCompare(res.data[i].name) <= 0,
          `cities should be sorted by name: "${res.data[i - 1].name}" > "${res.data[i].name}"`
        );
      }
    }
  });

  return summary("Home Cities API");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
