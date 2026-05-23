/**
 * TEST SUITE — Home Page: GET /categories endpoints
 *
 * Covers:
 *   GET /categories        — list, status filter, pagination
 *   GET /categories/:id    — single category
 *   GET /categories?lang=  — i18n support
 *
 * Usage:
 *   node tests/home/05_home_categories.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

const FAKE_ID = "000000000000000000000000";
const BAD_ID  = "not-a-valid-objectid";

// ── Bootstrap ─────────────────────────────────────────────────────────────────

let token;

async function bootstrap() {
  const u = makeTestUser("home-cat");
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
  suite("HOME-10  GET /categories — list & defaults");
  // ═════════════════════════════════════════════════════════════════════════

  await test("returns 200 with array of categories", async () => {
    const res = await api.get("/categories");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("each category has required fields", async () => {
    const res = await api.get("/categories");
    assertStatus(res, 200);
    if (res.data.length > 0) {
      const cat = res.data[0];
      assert(cat._id || cat.id, "category should have _id/id");
      assert(cat.name || cat.slug, "category should have name or slug");
    }
  });

  await test("default returns active categories only", async () => {
    const res = await api.get("/categories");
    assertStatus(res, 200);
    if (res.data.length > 0) {
      const noStatus = res.data.filter((c) => c.status !== undefined);
      noStatus.forEach((c) => {
        assertEqual(c.status, "active", `category "${c.name}" should be active`);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-11  GET /categories — status filter");
  // ═════════════════════════════════════════════════════════════════════════

  await test("filters by status=all — 200", async () => {
    const res = await api.get("/categories?status=all");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return array");
  });

  await test("filters by status=active — 200", async () => {
    const res = await api.get("/categories?status=active");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return array");
  });

  await test("handles unknown status gracefully — 200", async () => {
    const res = await api.get("/categories?status=invalid_status_xyz");
    assert(res.status === 200 || res.status === 400,
      `expected 200 or 400, got ${res.status}`);
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-12  GET /categories — lang parameter");
  // ═════════════════════════════════════════════════════════════════════════

  await test("supports lang=fr — 200", async () => {
    const res = await api.get("/categories?lang=fr");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return array");
  });

  await test("supports lang=ar — 200", async () => {
    const res = await api.get("/categories?lang=ar");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return array");
  });

  await test("supports lang=en — 200", async () => {
    const res = await api.get("/categories?lang=en");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return array");
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-13  GET /categories/:id — single category");
  // ═════════════════════════════════════════════════════════════════════════

  await test("returns 404 for non-existent category — 404", async () => {
    const res = await api.get(`/categories/${FAKE_ID}`);
    assertStatus(res, 404);
  });

  await test("returns 4xx for malformed category ID", async () => {
    const res = await api.get(`/categories/${BAD_ID}`);
    assert(res.status === 400 || res.status === 500 || res.status === 404,
      `expected 4xx/500, got ${res.status}`);
  });

  await test("returns 200 with category for a valid ID (fetch first from list)", async () => {
    const listRes = await api.get("/categories?limit=1");
    assertStatus(listRes, 200);
    if (listRes.data.length > 0) {
      const first = listRes.data[0];
      const id = first._id || first.id;
      const res = await api.get(`/categories/${id}`);
      assertStatus(res, 200);
      assert(res.data._id === id || res.data.id === id,
        "returned category should match requested ID");
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-14  GET /categories — cats with icon field");
  // ═════════════════════════════════════════════════════════════════════════

  await test("categories have icon field if present", async () => {
    const res = await api.get("/categories");
    assertStatus(res, 200);
    if (res.data.length > 0) {
      const icons = res.data.filter((c) => c.icon !== undefined);
      icons.forEach((c) => {
        assert(typeof c.icon === "string", "icon should be a string");
      });
    }
  });

  return summary("Home Categories API");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
