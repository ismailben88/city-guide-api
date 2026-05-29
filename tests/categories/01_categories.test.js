/**
 * TEST SUITE — Categories CRUD
 *
 * Covers:
 *   GET    /categories         — list (status filter)
 *   GET    /categories/:id     — by id, not found, invalid id
 *   POST   /categories         — create (admin only)
 *   PUT    /categories/:id     — update (admin only)
 *   DELETE /categories/:id     — permanent delete (admin only)
 *   Auth & validation checks
 *
 * Usage:  node tests/categories/01_categories.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

// ── Shared state ───────────────────────────────────────────────────────────────
let user           = null;
let token          = null;
let adminToken     = null;
let testCategoryId = null;
let ts             = Date.now();

async function bootstrap() {
  const u = makeTestUser("categories");
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
  suite("Categories 01-A  GET /categories");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns category list — 200", async () => {
    const res = await api.get("/categories");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("filters by status=active", async () => {
    const res = await api.get("/categories?status=active");
    assertStatus(res, 200);
  });

  await test("filters by status=all", async () => {
    const res = await api.get("/categories?status=all");
    assertStatus(res, 200);
  });

  await test("public access (no auth) — 200", async () => {
    const res = await api.get("/categories");
    assertStatus(res, 200);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Categories 01-B  GET /categories/:id");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns 404 for non-existent ObjectId", async () => {
    const res = await api.get("/categories/000000000000000000000000");
    assertStatus(res, 404);
  });

  await test("returns 4xx for invalid id format", async () => {
    const res = await api.get("/categories/not-a-valid-id");
    assert(res.status >= 400, "should reject invalid ObjectId");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Categories 01-C  POST /categories — create (admin only)");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects create by regular user — 403", async () => {
    const res = await api.post("/categories", { name: "Hack Cat", slug: `hack-${ts}` }, token);
    assertStatus(res, 403);
  });

  await test("rejects create without auth — 401", async () => {
    const res = await api.post("/categories", { name: "No Auth", slug: `noauth-${ts}` });
    assertStatus(res, 401);
  });

  await test("creates category with admin token — 201", async () => {
    if (!adminToken) return console.log("    ⚠ skip: no ADMIN_TOKEN");
    const slug = `test-cat-${ts}`;
    const res  = await api.post("/categories", {
      name: `Test Category ${ts}`,
      slug,
      icon: "test-icon",
    }, adminToken);
    assertStatus(res, 201);
    assert(res.data._id || res.data.id, "should return category id");
    assertEqual(res.data.name, `Test Category ${ts}`, "name");
    assertEqual(res.data.slug, slug, "slug");
    testCategoryId = res.data._id || res.data.id;
  });

  await test("rejects duplicate slug — 4xx", async () => {
    if (!adminToken) return console.log("    ⚠ skip: no ADMIN_TOKEN");
    const res = await api.post("/categories", {
      name: "Duplicate Cat",
      slug: `test-cat-${ts}`,
    }, adminToken);
    assert(res.status >= 400, "should reject duplicate slug");
  });

  await test("rejects missing name — 4xx", async () => {
    if (!adminToken) return console.log("    ⚠ skip: no ADMIN_TOKEN");
    const res = await api.post("/categories", { slug: `noname-${ts}` }, adminToken);
    assert(res.status >= 400, "should reject missing name");
  });

  await test("rejects missing slug — 4xx", async () => {
    if (!adminToken) return console.log("    ⚠ skip: no ADMIN_TOKEN");
    const res = await api.post("/categories", { name: "No Slug" }, adminToken);
    assert(res.status >= 400, "should reject missing slug");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Categories 01-D  GET /categories/:id + PUT /categories/:id");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("fetches created category by id — 200", async () => {
    if (!testCategoryId) return console.log("    ⚠ skip: no testCategoryId");
    const res = await api.get(`/categories/${testCategoryId}`);
    assertStatus(res, 200);
  });

  await test("rejects update by regular user — 403", async () => {
    if (!testCategoryId) return console.log("    ⚠ skip: no testCategoryId");
    const res = await api.put(`/categories/${testCategoryId}`, { name: "Hack" }, token);
    assertStatus(res, 403);
  });

  await test("updates category with admin — 200", async () => {
    if (!testCategoryId) return console.log("    ⚠ skip: no testCategoryId");
    if (!adminToken)     return console.log("    ⚠ skip: no ADMIN_TOKEN");
    const res = await api.put(`/categories/${testCategoryId}`, {
      name: `Updated Category ${ts}`,
      icon: "updated-icon",
    }, adminToken);
    assertStatus(res, 200);
    assertEqual(res.data.name, `Updated Category ${ts}`, "name updated");
  });

  await test("returns 404 for update on non-existent id", async () => {
    if (!adminToken) return console.log("    ⚠ skip: no ADMIN_TOKEN");
    const res = await api.put("/categories/000000000000000000000000", { name: "Ghost" }, adminToken);
    assertStatus(res, 404);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Categories 01-E  DELETE /categories/:id (admin only)");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects delete by regular user — 403", async () => {
    if (!testCategoryId) return console.log("    ⚠ skip: no testCategoryId");
    const res = await api.delete(`/categories/${testCategoryId}`, token);
    assertStatus(res, 403);
  });

  await test("admin deletes category — 200", async () => {
    if (!testCategoryId) return console.log("    ⚠ skip: no testCategoryId");
    if (!adminToken)     return console.log("    ⚠ skip: no ADMIN_TOKEN");
    const res = await api.delete(`/categories/${testCategoryId}`, adminToken);
    assertStatus(res, 200);
  });

  await test("confirm category is deleted — 404", async () => {
    if (!testCategoryId) return console.log("    ⚠ skip: no testCategoryId");
    const res = await api.get(`/categories/${testCategoryId}`);
    assertStatus(res, 404);
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  return summary("Suite — Categories CRUD");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
