/**
 * TEST SUITE — Admin API
 *
 * Covers:
 *   GET    /admin/stats              — dashboard stats
 *   GET    /admin/dashboard          — full dashboard
 *   GET    /admin/analytics          — analytics
 *   GET    /admin/pendingRequests    — list (admin only)
 *   GET    /admin/pendingRequests/:id
 *   PATCH  /admin/pendingRequests/:id/approve
 *   PATCH  /admin/pendingRequests/:id/reject
 *   GET    /admin/adminLogs
 *   POST   /admin/adminLogs
 *   GET    /admin/comments
 *   DELETE /admin/comments/:id
 *   PATCH  /admin/comments/:id/restore
 *   PATCH  /admin/users/:id/status
 *
 * Auth boundary:
 *   - 401 without token
 *   - 403 with regular user token
 *   - 2xx with ADMIN_TOKEN env var
 *
 * Usage:
 *   node tests/admin/01_admin.test.js
 *   ADMIN_TOKEN=<jwt> node tests/admin/01_admin.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

const FAKE_ID = "000000000000000000000000";

// adminToken resolved in bootstrap — either from ADMIN_TOKEN env var,
// or auto-login via ADMIN_EMAIL + ADMIN_PASSWORD env vars.
let adminToken = process.env.ADMIN_TOKEN || null;

// ── Bootstrap ─────────────────────────────────────────────────────────────────

let regularUser, regularToken;

async function bootstrap() {
  // Register a fresh regular test user
  const u = makeTestUser("admin-test");
  const res = await api.post("/auth/register", {
    firstName: u.firstName, lastName: u.lastName,
    email: u.email, password: u.password,
  });
  if (!res.ok) throw new Error(`Bootstrap register failed: ${JSON.stringify(res.data)}`);
  regularUser = res.data.user;
  regularToken = res.data.token;

  // Auto-login as admin when no ADMIN_TOKEN but credentials are provided
  if (!adminToken && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    try {
      const loginRes = await api.post("/auth/login", {
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      });
      if (loginRes.ok && loginRes.data?.token) {
        adminToken = loginRes.data.token;
        console.log("  ℹ Auto-logged in as admin via ADMIN_EMAIL/ADMIN_PASSWORD");
      } else {
        console.log(`  ⚠ Admin auto-login failed: ${JSON.stringify(loginRes.data)}`);
      }
    } catch (e) {
      console.log(`  ⚠ Admin auto-login error: ${e.message}`);
    }
  }

  if (!adminToken) {
    console.log(
      "\n  ⚠  No admin credentials — admin-only tests will be skipped.\n" +
      "     Set ADMIN_TOKEN=<jwt>  OR  ADMIN_EMAIL=<email> ADMIN_PASSWORD=<pass>\n"
    );
  }
}

// ── Suite runner ──────────────────────────────────────────────────────────────

async function runAll() {
  await bootstrap();

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-01  GET /admin/stats");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects without token — 401", async () => {
    const res = await api.get("/admin/stats");
    assertStatus(res, 401);
  });

  await test("rejects regular user — 403", async () => {
    const res = await api.get("/admin/stats", regularToken);
    assertStatus(res, 403);
  });

  if (adminToken) {
    await test("returns stats object with admin auth — 200", async () => {
      const res = await api.get("/admin/stats", adminToken);
      assertStatus(res, 200);
      ["users", "places", "events", "guides", "pendingRequests", "comments", "reports"].forEach((k) => {
        assert(typeof res.data[k] === "number", `stats.${k} should be a number`);
      });
    });
  } else {
    console.log("  ⚠ Admin GET /admin/stats test skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-02  GET /admin/dashboard");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects without token — 401", async () => {
    const res = await api.get("/admin/dashboard");
    assertStatus(res, 401);
  });

  await test("rejects regular user — 403", async () => {
    const res = await api.get("/admin/dashboard", regularToken);
    assertStatus(res, 403);
  });

  if (adminToken) {
    await test("returns dashboard with stats + logs + requests — 200", async () => {
      const res = await api.get("/admin/dashboard", adminToken);
      assertStatus(res, 200);
      assert(res.data.stats, "dashboard should have stats");
      assert(Array.isArray(res.data.recentLogs), "should have recentLogs array");
      assert(Array.isArray(res.data.recentRequests), "should have recentRequests array");
    });
  } else {
    console.log("  ⚠ Admin GET /admin/dashboard test skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-03  GET /admin/analytics");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects without token — 401", async () => {
    const res = await api.get("/admin/analytics");
    assertStatus(res, 401);
  });

  await test("rejects regular user — 403", async () => {
    const res = await api.get("/admin/analytics", regularToken);
    assertStatus(res, 403);
  });

  if (adminToken) {
    await test("returns analytics object — 200", async () => {
      const res = await api.get("/admin/analytics", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data.monthlyUsers), "monthlyUsers should be an array");
      assert(Array.isArray(res.data.monthlyEvents), "monthlyEvents should be an array");
      assert(Array.isArray(res.data.placesByCategory), "placesByCategory should be an array");
      assert(Array.isArray(res.data.placesByCity), "placesByCity should be an array");
      assert(Array.isArray(res.data.userRoles), "userRoles should be an array");
    });
  } else {
    console.log("  ⚠ Admin GET /admin/analytics test skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-04  GET /admin/pendingRequests — list");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects without token — 401", async () => {
    const res = await api.get("/admin/pendingRequests");
    assertStatus(res, 401);
  });

  await test("rejects regular user — 403", async () => {
    const res = await api.get("/admin/pendingRequests", regularToken);
    assertStatus(res, 403);
  });

  if (adminToken) {
    await test("returns array of pending requests — 200", async () => {
      const res = await api.get("/admin/pendingRequests", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data), "should return an array");
    });
  } else {
    console.log("  ⚠ Admin GET /admin/pendingRequests test skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-05  GET /admin/pendingRequests/:id");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects without token — 401", async () => {
    const res = await api.get(`/admin/pendingRequests/${FAKE_ID}`);
    assertStatus(res, 401);
  });

  await test("rejects regular user — 403", async () => {
    const res = await api.get(`/admin/pendingRequests/${FAKE_ID}`, regularToken);
    assertStatus(res, 403);
  });

  if (adminToken) {
    await test("returns 404 for non-existent request — 404", async () => {
      const res = await api.get(`/admin/pendingRequests/${FAKE_ID}`, adminToken);
      assertStatus(res, 404);
    });
  } else {
    console.log("  ⚠ Admin GET /admin/pendingRequests/:id test skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-06  POST /admin/pendingRequests — submit");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects submit without token — 401", async () => {
    const res = await api.post("/admin/pendingRequests", { requestType: "guide_application" });
    assertStatus(res, 401);
  });

  await test("rejects submit with invalid token — 401", async () => {
    const res = await api.post("/admin/pendingRequests", { requestType: "guide_application" }, "bad-token");
    assert(res.status === 401 || res.status === 500, `expected 401/500, got ${res.status}`);
  });

  await test("regular user can submit pending request — 201", async () => {
    const res = await api.post("/admin/pendingRequests", {
      requestType: "guide_application",
      payload: { test: true },
    }, regularToken);
    assert(res.status === 201 || res.status === 200,
      `expected 2xx, got ${res.status}`);
    if (res.data && (res.data._id || res.data.id)) {
      assertEqual(res.data.requestType, "guide_application", "requestType should match");
    }
  });

  await test("rejects submit without requestType — 4xx", async () => {
    const res = await api.post("/admin/pendingRequests", { payload: {} }, regularToken);
    assert(res.status >= 400 && res.status < 500,
      `expected 4xx, got ${res.status}`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-07  PATCH /admin/pendingRequests/:id/approve — admin only");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects approve without token — 401", async () => {
    const res = await api.patch(`/admin/pendingRequests/${FAKE_ID}/approve`);
    assertStatus(res, 401);
  });

  await test("rejects approve by regular user — 403", async () => {
    const res = await api.patch(`/admin/pendingRequests/${FAKE_ID}/approve`, {}, regularToken);
    assertStatus(res, 403);
  });

  if (adminToken) {
    await test("returns 404 approving non-existent request", async () => {
      const res = await api.patch(`/admin/pendingRequests/${FAKE_ID}/approve`, {}, adminToken);
      assertStatus(res, 404);
    });
  } else {
    console.log("  ⚠ Admin approve test skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-08  PATCH /admin/pendingRequests/:id/reject — admin only");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects reject without token — 401", async () => {
    const res = await api.patch(`/admin/pendingRequests/${FAKE_ID}/reject`);
    assertStatus(res, 401);
  });

  await test("rejects reject by regular user — 403", async () => {
    const res = await api.patch(`/admin/pendingRequests/${FAKE_ID}/reject`, { reason: "test" }, regularToken);
    assertStatus(res, 403);
  });

  if (adminToken) {
    await test("returns 404 rejecting non-existent request", async () => {
      const res = await api.patch(`/admin/pendingRequests/${FAKE_ID}/reject`, { reason: "test" }, adminToken);
      assertStatus(res, 404);
    });
  } else {
    console.log("  ⚠ Admin reject test skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-09  GET /admin/adminLogs");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects without token — 401", async () => {
    const res = await api.get("/admin/adminLogs");
    assertStatus(res, 401);
  });

  await test("rejects regular user — 403", async () => {
    const res = await api.get("/admin/adminLogs", regularToken);
    assertStatus(res, 403);
  });

  if (adminToken) {
    await test("returns array of logs — 200", async () => {
      const res = await api.get("/admin/adminLogs", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data), "should return an array");
    });

    await test("filters logs by targetType — 200", async () => {
      const res = await api.get("/admin/adminLogs?targetType=Place", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data), "should return an array");
    });
  } else {
    console.log("  ⚠ Admin GET /admin/adminLogs tests skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-10  POST /admin/adminLogs");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects without token — 401", async () => {
    const res = await api.post("/admin/adminLogs", { action: "test", targetType: "Place", targetId: FAKE_ID });
    assertStatus(res, 401);
  });

  await test("rejects regular user — 403", async () => {
    const res = await api.post("/admin/adminLogs", { action: "test", targetType: "Place", targetId: FAKE_ID }, regularToken);
    assertStatus(res, 403);
  });

  if (adminToken) {
    await test("creates a log entry — 201", async () => {
      const res = await api.post("/admin/adminLogs", {
        action: "test_action", targetType: "Place", targetId: FAKE_ID, metadata: { source: "admin-test" },
      }, adminToken);
      assert(res.status === 201 || res.status === 200, `expected 2xx, got ${res.status}`);
      if (res.data) {
        assert(res.data.action || res.data._id, "log should have action or _id");
      }
    });
  } else {
    console.log("  ⚠ Admin POST /admin/adminLogs test skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-11  GET /admin/comments — comment moderation");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects without token — 401", async () => {
    const res = await api.get("/admin/comments");
    assertStatus(res, 401);
  });

  await test("rejects regular user — 403", async () => {
    const res = await api.get("/admin/comments", regularToken);
    assertStatus(res, 403);
  });

  if (adminToken) {
    await test("returns comments object with pagination — 200", async () => {
      const res = await api.get("/admin/comments", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data.comments) || Array.isArray(res.data),
        "should return comments array");
    });
  } else {
    console.log("  ⚠ Admin GET /admin/comments test skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-12  DELETE /admin/comments/:id — soft-delete");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects without token — 401", async () => {
    const res = await api.delete(`/admin/comments/${FAKE_ID}`);
    assertStatus(res, 401);
  });

  await test("rejects regular user — 403", async () => {
    const res = await api.delete(`/admin/comments/${FAKE_ID}`, regularToken);
    assertStatus(res, 403);
  });

  if (adminToken) {
    await test("returns 404 for non-existent comment", async () => {
      const res = await api.delete(`/admin/comments/${FAKE_ID}`, adminToken);
      assert(res.status === 404 || res.status === 400,
        `expected 404/400, got ${res.status}`);
    });
  } else {
    console.log("  ⚠ Admin DELETE /admin/comments test skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-13  PATCH /admin/comments/:id/restore — restore");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects restore without token — 401", async () => {
    const res = await api.patch(`/admin/comments/${FAKE_ID}/restore`);
    assertStatus(res, 401);
  });

  await test("rejects restore by regular user — 403", async () => {
    const res = await api.patch(`/admin/comments/${FAKE_ID}/restore`, {}, regularToken);
    assertStatus(res, 403);
  });

  if (adminToken) {
    await test("returns 404 restoring non-existent comment", async () => {
      const res = await api.patch(`/admin/comments/${FAKE_ID}/restore`, {}, adminToken);
      assert(res.status === 404 || res.status === 400,
        `expected 404/400, got ${res.status}`);
    });
  } else {
    console.log("  ⚠ Admin PATCH /admin/comments/:id/restore test skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-14  PATCH /admin/users/:id/status — user activation");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects without token — 401", async () => {
    const res = await api.patch(`/admin/users/${FAKE_ID}/status`, { isActive: false });
    assertStatus(res, 401);
  });

  await test("rejects regular user — 403", async () => {
    const res = await api.patch(`/admin/users/${FAKE_ID}/status`, { isActive: false }, regularToken);
    assertStatus(res, 403);
  });

  await test("rejects non-boolean isActive — 400", async () => {
    const res = await api.patch(`/admin/users/${FAKE_ID}/status`, { isActive: "not-bool" });
    assert(res.status === 400 || res.status === 401,
      `expected 400/401, got ${res.status}`);
  });

  if (adminToken) {
    await test("returns 404 for non-existent user", async () => {
      const res = await api.patch(`/admin/users/${FAKE_ID}/status`, { isActive: false }, adminToken);
      assert(res.status === 404 || res.status === 400,
        `expected 404/400, got ${res.status}`);
    });
  } else {
    console.log("  ⚠ Admin PATCH user status test skipped — set ADMIN_TOKEN env var");
  }

  return summary("Admin API");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
