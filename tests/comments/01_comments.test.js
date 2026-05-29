/**
 * TEST SUITE — Comments CRUD, Likes & Replies
 *
 * Covers:
 *   GET    /comments              — list (by targetId + targetType, parentCommentId)
 *   POST   /comments              — create (auth required)
 *   PUT    /comments/:id          — update own comment (auth)
 *   DELETE /comments/:id          — soft delete own comment (auth)
 *   PATCH  /comments/:id          — toggle like (delta: 1 / -1)
 *   Get replies (parentCommentId filter)
 *   Auth, validation, not found
 *
 * Usage:  node tests/comments/01_comments.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

// ── Shared state ───────────────────────────────────────────────────────────────
let token        = null;
let user         = null;
let testCommentId = null;
let testPlaceId   = null;
let testCityId    = null;
let testCategoryId = null;
let ts            = Date.now();

async function bootstrap() {
  // Register user A (commenter)
  const u = makeTestUser("comments");
  const res = await api.post("/auth/register", {
    firstName: u.firstName,
    lastName:  u.lastName,
    email:     u.email,
    password:  u.password,
  });
  if (!res.ok) throw new Error(`Bootstrap failed: ${JSON.stringify(res.data)}`);
  user  = res.data.user;
  token = res.data.token;

  // Fetch existing city + category
  const citiesRes = await api.get("/cities");
  if (citiesRes.ok && Array.isArray(citiesRes.data) && citiesRes.data.length > 0) {
    testCityId = citiesRes.data[0]._id || citiesRes.data[0].id;
  }
  const catRes = await api.get("/categories");
  if (catRes.ok && Array.isArray(catRes.data) && catRes.data.length > 0) {
    testCategoryId = catRes.data[0]._id || catRes.data[0].id;
  }

  // Create a place to comment on
  if (testCityId && testCategoryId) {
    const slug = `comment-place-${ts}`;
    const pRes = await api.post("/places", {
      name:       "Comment Target Place",
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
  suite("Comments 01-A  GET /comments");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns comments for a target — 200", async () => {
    if (!testPlaceId) return console.log("    ⚠ skip: no testPlaceId");
    const res = await api.get(`/comments?targetId=${testPlaceId}&targetType=Place`);
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("returns empty array for non-existent target", async () => {
    const res = await api.get("/comments?targetId=000000000000000000000000&targetType=Place");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("returns empty array for unknown targetType", async () => {
    const res = await api.get(`/comments?targetId=${testPlaceId || "000000000000000000000000"}&targetType=Unknown`);
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("public access (no auth) — 200", async () => {
    if (!testPlaceId) return console.log("    ⚠ skip: no testPlaceId");
    const res = await api.get(`/comments?targetId=${testPlaceId}&targetType=Place`);
    assertStatus(res, 200);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Comments 01-B  POST /comments — create");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("creates a comment — 201", async () => {
    if (!testPlaceId) return console.log("    ⚠ skip: no testPlaceId");
    const res = await api.post("/comments", {
      targetId:   testPlaceId,
      targetType: "Place",
      content:    `Great place! ${ts}`,
      rating:     4,
    }, token);
    assertStatus(res, 201);
    assert(res.data._id || res.data.id, "should return comment id");
    assertEqual(res.data.content, `Great place! ${ts}`, "content");
    assertEqual(res.data.targetType, "Place", "targetType");
    testCommentId = res.data._id || res.data.id;
  });

  await test("rejects missing targetId — 4xx", async () => {
    const res = await api.post("/comments", {
      targetType: "Place",
      content:    "Missing target",
    }, token);
    assert(res.status >= 400, "should reject missing targetId");
  });

  await test("rejects missing content — 4xx", async () => {
    if (!testPlaceId) return console.log("    ⚠ skip: no testPlaceId");
    const res = await api.post("/comments", {
      targetId:   testPlaceId,
      targetType: "Place",
    }, token);
    assert(res.status >= 400, "should reject missing content");
  });

  await test("rejects create without auth — 401", async () => {
    if (!testPlaceId) return console.log("    ⚠ skip: no testPlaceId");
    const res = await api.post("/comments", {
      targetId:   testPlaceId,
      targetType: "Place",
      content:    "No auth comment",
    });
    assertStatus(res, 401);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Comments 01-C  PUT /comments/:id — update");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("updates own comment — 200", async () => {
    if (!testCommentId) return console.log("    ⚠ skip: no testCommentId");
    const res = await api.put(`/comments/${testCommentId}`, {
      content: `Updated content ${ts}`,
    }, token);
    assertStatus(res, 200);
    assertEqual(res.data.content, `Updated content ${ts}`, "content updated");
  });

  await test("rejects update by different user — 404 or 403", async () => {
    if (!testCommentId) return console.log("    ⚠ skip: no testCommentId");
    // Register a different user
    const u2     = makeTestUser("comments2");
    const r2     = await api.post("/auth/register", {
      firstName: u2.firstName,
      lastName:  u2.lastName,
      email:     u2.email,
      password:  u2.password,
    });
    if (!r2.ok) return console.log("    ⚠ skip: could not register second user");
    const res = await api.put(`/comments/${testCommentId}`, {
      content: "Hacked content",
    }, r2.data.token);
    assert(res.status === 404 || res.status === 403, "should reject unauthorized update");
  });

  await test("returns 404 for update on non-existent id", async () => {
    const res = await api.put("/comments/000000000000000000000000", { content: "Ghost" }, token);
    assertStatus(res, 404);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Comments 01-D  PATCH /comments/:id — like / unlike");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("likes a comment (delta=1) — 200", async () => {
    if (!testCommentId) return console.log("    ⚠ skip: no testCommentId");
    const res = await api.patch(`/comments/${testCommentId}`, { delta: 1 }, token);
    assertStatus(res, 200);
    assert(res.data.likeCount !== undefined, "should return likeCount");
    assert(res.data.likeCount >= 1, "likeCount should be at least 1");
  });

  await test("unlikes a comment (delta=-1) — 200", async () => {
    if (!testCommentId) return console.log("    ⚠ skip: no testCommentId");
    const res = await api.patch(`/comments/${testCommentId}`, { delta: -1 }, token);
    assertStatus(res, 200);
    assert(res.data.likeCount >= 0, "likeCount should be non-negative");
  });

  await test("like without auth — 401", async () => {
    if (!testCommentId) return console.log("    ⚠ skip: no testCommentId");
    const res = await api.patch(`/comments/${testCommentId}`, { delta: 1 });
    assertStatus(res, 401);
  });

  await test("like on non-existent comment — 404", async () => {
    const res = await api.patch("/comments/000000000000000000000000", { delta: 1 }, token);
    assertStatus(res, 404);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Comments 01-E  Get replies (parentCommentId filter)");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("creates a reply to the test comment — 201", async () => {
    if (!testPlaceId || !testCommentId) return console.log("    ⚠ skip: missing dependencies");
    const res = await api.post("/comments", {
      targetId:        testPlaceId,
      targetType:      "Place",
      content:         `This is a reply ${ts}`,
      parentCommentId: testCommentId,
    }, token);
    assertStatus(res, 201);
    assert(res.data._id || res.data.id, "reply should have id");
    assertEqual(res.data.parentCommentId, testCommentId, "parentCommentId matches");
  });

  await test("filters top-level comments (no parent)", async () => {
    if (!testPlaceId) return console.log("    ⚠ skip: no testPlaceId");
    const res = await api.get(`/comments?targetId=${testPlaceId}&targetType=Place`);
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return array");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("Comments 01-F  DELETE /comments/:id — soft delete");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects delete without auth — 401", async () => {
    if (!testCommentId) return console.log("    ⚠ skip: no testCommentId");
    const res = await api.delete(`/comments/${testCommentId}`);
    assertStatus(res, 401);
  });

  await test("deletes own comment — 200", async () => {
    if (!testCommentId) return console.log("    ⚠ skip: no testCommentId");
    const res = await api.delete(`/comments/${testCommentId}`, token);
    assertStatus(res, 200);
  });

  await test("rejects delete of already deleted comment — 404", async () => {
    if (!testCommentId) return console.log("    ⚠ skip: no testCommentId");
    const res = await api.delete(`/comments/${testCommentId}`, token);
    assert(res.status === 404 || res.status === 400, "should reject double delete");
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  return summary("Suite — Comments CRUD");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
