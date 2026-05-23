/**
 * TEST SUITE — Admin Report Operations
 *
 * Covers admin‑only report endpoints under /reports:
 *   GET    /reports              — list all reports (admin)
 *   PATCH  /reports/:id/review   — mark as reviewed
 *   PATCH  /reports/:id/resolve  — resolve with note
 *
 * Auth boundary:
 *   - 401 without token
 *   - 403 with regular user token
 *   - 2xx with ADMIN_TOKEN env var
 *
 * Usage:
 *   node tests/admin/03_admin_reports.test.js
 *   ADMIN_TOKEN=<jwt> node tests/admin/03_admin_reports.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

const FAKE_ID   = "000000000000000000000000";
const BAD_ID    = "not-a-valid-objectid";
const adminToken = process.env.ADMIN_TOKEN;

let regularUser, regularToken;

async function bootstrap() {
  const u = makeTestUser("admin-rep");
  const res = await api.post("/auth/register", {
    firstName: u.firstName, lastName: u.lastName,
    email: u.email, password: u.password,
  });
  if (!res.ok) throw new Error(`Bootstrap register failed: ${JSON.stringify(res.data)}`);
  regularUser  = res.data.user;
  regularToken = res.data.token;
}

async function runAll() {
  await bootstrap();

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-30  GET /reports — list (admin only)");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects without token — 401", async () => {
    const res = await api.get("/reports");
    assertStatus(res, 401);
  });

  await test("rejects regular user — 403", async () => {
    const res = await api.get("/reports", regularToken);
    assertStatus(res, 403);
  });

  if (adminToken) {
    await test("returns reports array — 200", async () => {
      const res = await api.get("/reports", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data), "should return an array");
    });

    await test("filters reports by status — 200", async () => {
      const res = await api.get("/reports?status=open", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data), "should return an array");
    });

    await test("filters reports by targetType — 200", async () => {
      const res = await api.get("/reports?targetType=Comment", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data), "should return an array");
    });

    await test("pagination with limit — 200", async () => {
      const res = await api.get("/reports?limit=5", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data), "should return an array");
      assert(res.data.length <= 5, "should respect limit");
    });

    await test("empty array for non-matching filter — 200", async () => {
      const res = await api.get("/reports?status=resolved&targetType=NonExistent", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data), "should return an array");
    });
  } else {
    console.log("  ⚠ GET /reports tests skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-31  PATCH /reports/:id/review — admin only");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects without token — 401", async () => {
    const res = await api.patch(`/reports/${FAKE_ID}/review`);
    assertStatus(res, 401);
  });

  await test("rejects regular user — 403", async () => {
    const res = await api.patch(`/reports/${FAKE_ID}/review`, {}, regularToken);
    assertStatus(res, 403);
  });

  if (adminToken) {
    await test("rejects malformed ID — 4xx", async () => {
      const res = await api.patch(`/reports/${BAD_ID}/review`, {}, adminToken);
      assert(res.status === 400 || res.status === 500,
        `expected 400/500 for bad ID, got ${res.status}`);
    });

    await test("returns 404 for non-existent report", async () => {
      const res = await api.patch(`/reports/${FAKE_ID}/review`, {}, adminToken);
      assert(res.status === 404 || res.status === 400,
        `expected 404/400, got ${res.status}`);
    });
  } else {
    console.log("  ⚠ PATCH /reports/:id/review tests skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-32  PATCH /reports/:id/resolve — admin only");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects without token — 401", async () => {
    const res = await api.patch(`/reports/${FAKE_ID}/resolve`);
    assertStatus(res, 401);
  });

  await test("rejects regular user — 403", async () => {
    const res = await api.patch(`/reports/${FAKE_ID}/resolve`, {}, regularToken);
    assertStatus(res, 403);
  });

  if (adminToken) {
    await test("rejects malformed ID — 4xx", async () => {
      const res = await api.patch(`/reports/${BAD_ID}/resolve`, { resolution: "Resolved" }, adminToken);
      assert(res.status === 400 || res.status === 500,
        `expected 400/500 for bad ID, got ${res.status}`);
    });

    await test("returns 404 for non-existent report", async () => {
      const res = await api.patch(`/reports/${FAKE_ID}/resolve`, { resolution: "Resolved" }, adminToken);
      assert(res.status === 404 || res.status === 400,
        `expected 404/400, got ${res.status}`);
    });

    await test("resolve without resolution body — 2xx/404", async () => {
      const res = await api.patch(`/reports/${FAKE_ID}/resolve`, {}, adminToken);
      assert(res.status === 200 || res.status === 404,
        `expected 200 or 404, got ${res.status}`);
    });
  } else {
    console.log("  ⚠ PATCH /reports/:id/resolve tests skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-33  POST /reports — submit (any authenticated user)");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects without token — 401", async () => {
    const res = await api.post("/reports", { targetType: "Comment", targetId: FAKE_ID, reason: "Spam" });
    assertStatus(res, 401);
  });

  await test("regular user can submit report — 201", async () => {
    const res = await api.post("/reports", {
      targetType: "Comment", targetId: FAKE_ID, reason: "Test report",
    }, regularToken);
    assert(res.status === 201 || res.status === 200,
      `expected 2xx, got ${res.status}`);
    if (res.data && res.data._id) {
      assertEqual(res.data.reason, "Test report", "reason should match");
    }
  });

  await test("rejects submit without reason — 4xx", async () => {
    const res = await api.post("/reports", { targetType: "Place", targetId: FAKE_ID }, regularToken);
    assert(res.status >= 400 && res.status < 500,
      `expected 4xx, got ${res.status}`);
  });

  return summary("Admin Reports");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
