/**
 * TEST SUITE 01 — Scores & Ratings
 *
 * Covers:
 *   GET  /scores                  — list scores
 *   GET  /scores/analytics        — aggregation stats
 *   POST /scores                  — submit/upsert score
 *   DELETE /scores/:id            — delete score
 *   Upsert behavior, validation, auth boundaries
 *
 * Usage: node tests/scores/01_scores.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

async function bootstrap() {
  const u   = makeTestUser("scores");
  const res = await api.post("/auth/register", {
    firstName: u.firstName, lastName: u.lastName,
    email: u.email, password: u.password,
  });
  if (!res.ok) throw new Error(`Bootstrap register failed: ${JSON.stringify(res.data)}`);
  return { user: res.data.user, token: res.data.token, creds: u };
}

// ─────────────────────────────────────────────────────────────────────────────
async function runAll() {
  const { user, token } = await bootstrap();
  const userB = await bootstrap();

  const testTargetId = "000000000000000000000000";
  const testTargetType = "Place";

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-A  GET /scores");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns empty array when no scores exist — 200", async () => {
    const res = await api.get(`/scores?targetId=${testTargetId}&targetType=${testTargetType}`, token);
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
    assertEqual(res.data.length, 0, "should be empty initially");
  });

  await test("returns 401 without token", async () => {
    const res = await api.get(`/scores?targetId=${testTargetId}&targetType=${testTargetType}`);
    assertStatus(res, 401);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-B  POST /scores — submit & upsert");
  // ═══════════════════════════════════════════════════════════════════════════

  let scoreId = null;

  await test("submits a new score — 201", async () => {
    const res = await api.post("/scores", {
      targetId: testTargetId,
      targetType: testTargetType,
      score: 4,
    }, token);
    assertStatus(res, 201);
    scoreId = res.data._id || res.data.id;
    assert(scoreId, "should return score id");
    assertEqual(res.data.score, 4, "score should be 4");
  });

  await test("upserts score for same user+target (overwrite) — 201", async () => {
    const res = await api.post("/scores", {
      targetId: testTargetId,
      targetType: testTargetType,
      score: 5,
    }, token);
    assertStatus(res, 201);
    assertEqual(res.data.score, 5, "score should be updated to 5");
  });

  await test("upsert does not create duplicate entries", async () => {
    const res = await api.get(`/scores?targetId=${testTargetId}&targetType=${testTargetType}`, token);
    assertStatus(res, 200);
    const userScores = res.data.filter(s => (s.authorId?._id || s.authorId) === (user._id || user.id));
    assertEqual(userScores.length, 1, "should only be one score per user per target");
  });

  await test("second user can submit different score — 201", async () => {
    const res = await api.post("/scores", {
      targetId: testTargetId,
      targetType: testTargetType,
      score: 3,
    }, userB.token);
    assertStatus(res, 201);
  });

  await test("rejects score < 1 — 400", async () => {
    const res = await api.post("/scores", {
      targetId: testTargetId,
      targetType: testTargetType,
      score: 0,
    }, token);
    assert(res.status >= 400, "should reject score of 0");
  });

  await test("rejects score > 5 — 400", async () => {
    const res = await api.post("/scores", {
      targetId: testTargetId,
      targetType: testTargetType,
      score: 6,
    }, token);
    assert(res.status >= 400, "should reject score of 6");
  });

  await test("rejects missing targetId — 400", async () => {
    const res = await api.post("/scores", {
      targetType: testTargetType,
      score: 3,
    }, token);
    assert(res.status >= 400, "should reject missing targetId");
  });

  await test("returns 401 without token", async () => {
    const res = await api.post("/scores", {
      targetId: testTargetId,
      targetType: testTargetType,
      score: 4,
    });
    assertStatus(res, 401);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-C  GET /scores/analytics");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns analytics with correct stats — 200", async () => {
    const res = await api.get(`/scores/analytics?targetId=${testTargetId}&targetType=${testTargetType}`, token);
    assertStatus(res, 200);
    assert(res.data.distribution, "should have distribution array");
    assert(typeof res.data.average === "number", "average should be a number");
    assert(typeof res.data.total === "number", "total should be a number");
    assert(res.data.total > 0, "total should be > 0 after adding scores");
    // 2 users: scores 5 and 3 → average should be 4.0
    assertEqual(res.data.average, 4, `expected average 4, got ${res.data.average}`);
    assertEqual(res.data.total, 2, "total should be 2");
  });

  await test("analytics with invalid targetId — 400", async () => {
    const res = await api.get("/scores/analytics?targetId=invalid&targetType=Place", token);
    assert(res.status >= 400, "should reject invalid targetId");
  });

  await test("analytics with non-existent targetId — returns empty stats", async () => {
    const res = await api.get("/scores/analytics?targetId=000000000000000000000001&targetType=Place", token);
    assertStatus(res, 200);
    assertEqual(res.data.total, 0, "total should be 0 for non-existent target");
    assertEqual(res.data.average, 0, "average should be 0 for non-existent target");
  });

  await test("analytics returns 401 without token", async () => {
    const res = await api.get(`/scores/analytics?targetId=${testTargetId}&targetType=${testTargetType}`);
    assertStatus(res, 401);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-D  DELETE /scores/:id");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("deletes an existing score — 200", async () => {
    const res = await api.delete(`/scores/${scoreId}`, token);
    assertStatus(res, 200);
  });

  await test("deleting again returns 404", async () => {
    const res = await api.delete(`/scores/${scoreId}`, token);
    assert(res.status >= 400, "should return error on second delete");
  });

  await test("returns 401 without token", async () => {
    const res = await api.delete(`/scores/${scoreId}`);
    assertStatus(res, 401);
  });

  await test("DELETE with non-existent ObjectId — 4xx", async () => {
    const res = await api.delete("/scores/000000000000000000000000", token);
    assert(res.status >= 400, "should handle non-existent id");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-E  Edge cases");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("score with negative value — 400", async () => {
    const res = await api.post("/scores", {
      targetId: testTargetId,
      targetType: testTargetType,
      score: -1,
    }, token);
    assert(res.status >= 400, "should reject negative score");
  });

  await test("invalid ObjectId in score submission — 4xx", async () => {
    const res = await api.post("/scores", {
      targetId: "not-a-valid-id",
      targetType: testTargetType,
      score: 4,
    }, token);
    assert(res.status >= 400, "should reject invalid targetId format");
  });

  return summary("Suite 01 — Scores & Ratings");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
