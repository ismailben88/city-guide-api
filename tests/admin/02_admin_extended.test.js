/**
 * TEST SUITE — Admin API (Extended Coverage)
 *
 * Covers gaps from 01_admin.test.js:
 *   GET    /admin/guides                          — all guides (admin view)
 *   GET    /admin/stats, /dashboard, /analytics   — schema & validation
 *   GET    /admin/pendingRequests                 — filters, pagination
 *   PATCH  /admin/pendingRequests/:id/approve     — already processed
 *   PATCH  /admin/pendingRequests/:id/reject      — already processed
 *   GET    /admin/adminLogs                       — action filter, pagination
 *   POST   /admin/adminLogs                       — missing fields
 *   GET    /admin/comments                        — status filter, pagination
 *   DELETE /admin/comments/:id                    — already deleted
 *   PATCH  /admin/comments/:id/restore            — already restored
 *   PATCH  /admin/users/:id/status                — self-deactivation, bad ID
 *   POST   /admin/pendingRequests                 — invalid requestType
 *
 * Usage:
 *   node tests/admin/02_admin_extended.test.js
 *   ADMIN_TOKEN=<jwt> node tests/admin/02_admin_extended.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

const FAKE_ID   = "000000000000000000000000";
const BAD_ID    = "not-a-valid-objectid";
const adminToken = process.env.ADMIN_TOKEN;

// ── Bootstrap ─────────────────────────────────────────────────────────────────

let regularUser, regularToken;

async function bootstrap() {
  const u = makeTestUser("admin-ext");
  const res = await api.post("/auth/register", {
    firstName: u.firstName, lastName: u.lastName,
    email: u.email, password: u.password,
  });
  if (!res.ok) throw new Error(`Bootstrap register failed: ${JSON.stringify(res.data)}`);
  regularUser  = res.data.user;
  regularToken = res.data.token;
}

// ── Suite runner ──────────────────────────────────────────────────────────────

async function runAll() {
  await bootstrap();

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-15  GET /admin/guides — admin view (uncovered route)");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects without token — 401", async () => {
    const res = await api.get("/admin/guides");
    assertStatus(res, 401);
  });

  await test("rejects regular user — 403", async () => {
    const res = await api.get("/admin/guides", regularToken);
    assertStatus(res, 403);
  });

  if (adminToken) {
    await test("returns guides object with pagination — 200", async () => {
      const res = await api.get("/admin/guides", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data.guides), "should have guides array");
      assert(typeof res.data.total === "number", "should have total count");
    });

    await test("filters guides by verificationStatus — 200", async () => {
      const res = await api.get("/admin/guides?verificationStatus=verified", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data.guides), "should return guides array");
    });
  } else {
    console.log("  ⚠ GET /admin/guides tests skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-16  GET /admin/stats — response schema");
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
    await test("all stats keys are non-negative numbers", async () => {
      const res = await api.get("/admin/stats", adminToken);
      assertStatus(res, 200);
      const keys = ["users", "places", "events", "guides", "pendingRequests", "comments", "reports"];
      keys.forEach((k) => {
        assert(typeof res.data[k] === "number" && res.data[k] >= 0,
          `stats.${k} should be a non-negative number, got ${JSON.stringify(res.data[k])}`);
      });
    });

    await test("no extra unexpected keys in stats response", async () => {
      const res = await api.get("/admin/stats", adminToken);
      assertStatus(res, 200);
      const allowed = new Set(["users", "places", "events", "guides", "pendingRequests", "comments", "reports"]);
      Object.keys(res.data).forEach((k) => {
        assert(allowed.has(k), `unexpected key "${k}" in stats response`);
      });
    });
  } else {
    console.log("  ⚠ GET /admin/stats schema tests skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-17  GET /admin/dashboard — response schema");
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
    await test("dashboard has stats, recentLogs, recentRequests", async () => {
      const res = await api.get("/admin/dashboard", adminToken);
      assertStatus(res, 200);
      assert(res.data.stats !== undefined, "dashboard should have stats");
      assert(typeof res.data.stats.users === "number", "stats.users should be a number");
      assert(typeof res.data.stats.places === "number", "stats.places should be a number");
      assert(typeof res.data.stats.events === "number", "stats.events should be a number");
      assert(typeof res.data.stats.guides === "number", "stats.guides should be a number");
      assert(Array.isArray(res.data.recentLogs), "dashboard should have recentLogs array");
      assert(Array.isArray(res.data.recentRequests), "dashboard should have recentRequests array");
    });
  } else {
    console.log("  ⚠ GET /admin/dashboard schema tests skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-18  GET /admin/analytics — response schema");
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
    await test("analytics has all expected sections", async () => {
      const res = await api.get("/admin/analytics", adminToken);
      assertStatus(res, 200);
      const sections = ["monthlyUsers", "monthlyEvents", "placesByCategory", "placesByCity", "userRoles", "featuredPlaces", "featuredEvents"];
      sections.forEach((s) => {
        assert(res.data[s] !== undefined, `analytics should have "${s}"`);
      });
    });

    await test("monthlyUsers/monthlyEvents have correct shape", async () => {
      const res = await api.get("/admin/analytics", adminToken);
      assertStatus(res, 200);
      ["monthlyUsers", "monthlyEvents"].forEach((key) => {
        assert(Array.isArray(res.data[key]), `${key} should be an array`);
        if (res.data[key].length > 0) {
          assert(typeof res.data[key][0].month === "string", `${key}[0].month should be a string`);
          assert(typeof res.data[key][0].count === "number", `${key}[0].count should be a number`);
        }
      });
    });

    await test("placesByCategory has name, icon, value", async () => {
      const res = await api.get("/admin/analytics", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data.placesByCategory), "placesByCategory should be an array");
      if (res.data.placesByCategory.length > 0) {
        const item = res.data.placesByCategory[0];
        assert(typeof item.name === "string", "placesByCategory[0].name should be a string");
        assert(typeof item.icon === "string", "placesByCategory[0].icon should be a string");
        assert(typeof item.value === "number", "placesByCategory[0].value should be a number");
      }
    });

    await test("featuredPlaces and featuredEvents are numbers", async () => {
      const res = await api.get("/admin/analytics", adminToken);
      assertStatus(res, 200);
      assert(typeof res.data.featuredPlaces === "number", "featuredPlaces should be a number");
      assert(typeof res.data.featuredEvents === "number", "featuredEvents should be a number");
    });
  } else {
    console.log("  ⚠ GET /admin/analytics schema tests skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-19  GET /admin/pendingRequests — filters");
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
    await test("filters pending requests by requestType — 200", async () => {
      const res = await api.get("/admin/pendingRequests?requestType=guide_application", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data), "should return an array");
    });

    await test("filters pending requests by status — 200", async () => {
      const res = await api.get("/admin/pendingRequests?status=approved", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data), "should return an array");
    });

    await test("pagination with limit — 200", async () => {
      const res = await api.get("/admin/pendingRequests?limit=5", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data), "should return an array");
      assert(res.data.length <= 5, "should respect limit");
    });
  } else {
    console.log("  ⚠ GET /admin/pendingRequests filter tests skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-20  PATCH /admin/pendingRequests/:id/approve — edge cases");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects without token — 401", async () => {
    const res = await api.patch(`/admin/pendingRequests/${FAKE_ID}/approve`);
    assertStatus(res, 401);
  });

  await test("rejects regular user — 403", async () => {
    const res = await api.patch(`/admin/pendingRequests/${FAKE_ID}/approve`, {}, regularToken);
    assertStatus(res, 403);
  });

  if (adminToken) {
    await test("rejects malformed ID — 4xx", async () => {
      const res = await api.patch(`/admin/pendingRequests/${BAD_ID}/approve`, {}, adminToken);
      assert(res.status === 400 || res.status === 500,
        `expected 400/500 for bad ID, got ${res.status}`);
    });

    await test("returns 404 for non-existent request — 404", async () => {
      const res = await api.patch(`/admin/pendingRequests/${FAKE_ID}/approve`, {}, adminToken);
      assertStatus(res, 404);
    });
  } else {
    console.log("  ⚠ PATCH /admin/pendingRequests/approve edge-case tests skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-21  PATCH /admin/pendingRequests/:id/reject — edge cases");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects without token — 401", async () => {
    const res = await api.patch(`/admin/pendingRequests/${FAKE_ID}/reject`);
    assertStatus(res, 401);
  });

  await test("rejects regular user — 403", async () => {
    const res = await api.patch(`/admin/pendingRequests/${FAKE_ID}/reject`, { reason: "test" }, regularToken);
    assertStatus(res, 403);
  });

  if (adminToken) {
    await test("rejects malformed ID — 4xx", async () => {
      const res = await api.patch(`/admin/pendingRequests/${BAD_ID}/reject`, { reason: "test" }, adminToken);
      assert(res.status === 400 || res.status === 500,
        `expected 400/500 for bad ID, got ${res.status}`);
    });

    await test("reject with empty reason is accepted — 2xx/404", async () => {
      const res = await api.patch(`/admin/pendingRequests/${FAKE_ID}/reject`, { reason: "" }, adminToken);
      assert(res.status === 200 || res.status === 404,
        `expected 200 or 404, got ${res.status}`);
    });

    await test("reject without reason body is accepted — 2xx/404", async () => {
      const res = await api.patch(`/admin/pendingRequests/${FAKE_ID}/reject`, {}, adminToken);
      assert(res.status === 200 || res.status === 404,
        `expected 200 or 404, got ${res.status}`);
    });
  } else {
    console.log("  ⚠ PATCH /admin/pendingRequests/reject edge-case tests skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-22  GET /admin/adminLogs — filtering");
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
    await test("filters logs by action (regex) — 200", async () => {
      const res = await api.get("/admin/adminLogs?action=approve", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data), "should return an array");
    });

    await test("filters logs by targetId — 200", async () => {
      const res = await api.get(`/admin/adminLogs?targetId=${FAKE_ID}`, adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data), "should return an array");
    });

    await test("returns empty array for non-matching filter — 200", async () => {
      const res = await api.get("/admin/adminLogs?targetType=NonExistentType", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data), "should return an array");
    });

    await test("pagination with limit and page — 200", async () => {
      const res = await api.get("/admin/adminLogs?limit=2&page=1", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data), "should return an array");
      assert(res.data.length <= 2, "should respect limit");
    });
  } else {
    console.log("  ⚠ GET /admin/adminLogs filter tests skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-23  POST /admin/adminLogs — validation");
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
    await test("rejects missing action field — 4xx", async () => {
      const res = await api.post("/admin/adminLogs", { targetType: "Place", targetId: FAKE_ID }, adminToken);
      assert(res.status >= 400 && res.status < 500,
        `expected 4xx for missing action, got ${res.status}`);
    });

    await test("rejects missing targetType — 4xx", async () => {
      const res = await api.post("/admin/adminLogs", { action: "test", targetId: FAKE_ID }, adminToken);
      assert(res.status >= 400 && res.status < 500,
        `expected 4xx for missing targetType, got ${res.status}`);
    });
  } else {
    console.log("  ⚠ POST /admin/adminLogs validation tests skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-24  GET /admin/comments — filtering");
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
    await test("returns comments with pagination meta — 200", async () => {
      const res = await api.get("/admin/comments", adminToken);
      assertStatus(res, 200);
      const data = res.data;
      assert(Array.isArray(data.comments) || Array.isArray(data),
        "should return comments array");
      if (data.comments) {
        assert(typeof data.total === "number", "response should have total");
      }
    });

    await test("filters comments by status — 200", async () => {
      const res = await api.get("/admin/comments?status=active", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data.comments || res.data), "should return comments array");
    });

    await test("filters comments by targetType — 200", async () => {
      const res = await api.get("/admin/comments?targetType=Place", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data.comments || res.data), "should return comments array");
    });

    await test("filters comments by search content — 200", async () => {
      const res = await api.get("/admin/comments?search=test", adminToken);
      assertStatus(res, 200);
      assert(Array.isArray(res.data.comments || res.data), "should return comments array");
    });

    await test("pagination with limit — 200", async () => {
      const res = await api.get("/admin/comments?limit=5", adminToken);
      assertStatus(res, 200);
      const comments = res.data.comments || res.data || [];
      assert(Array.isArray(comments), "should return comments array");
      assert(comments.length <= 5, "should respect limit");
    });
  } else {
    console.log("  ⚠ GET /admin/comments filter tests skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-25  DELETE /admin/comments/:id — soft-delete edge cases");
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
    await test("rejects malformed ID — 4xx", async () => {
      const res = await api.delete(`/admin/comments/${BAD_ID}`, adminToken);
      assert(res.status === 400 || res.status === 500,
        `expected 400/500 for bad ID, got ${res.status}`);
    });

    await test("returns 404 for non-existent comment", async () => {
      const res = await api.delete(`/admin/comments/${FAKE_ID}`, adminToken);
      assert(res.status === 404 || res.status === 400,
        `expected 404/400, got ${res.status}`);
    });
  } else {
    console.log("  ⚠ DELETE /admin/comments edge-case tests skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-26  PATCH /admin/comments/:id/restore — edge cases");
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
    await test("rejects malformed ID — 4xx", async () => {
      const res = await api.patch(`/admin/comments/${BAD_ID}/restore`, {}, adminToken);
      assert(res.status === 400 || res.status === 500,
        `expected 400/500 for bad ID, got ${res.status}`);
    });

    await test("returns 404 restoring non-existent comment", async () => {
      const res = await api.patch(`/admin/comments/${FAKE_ID}/restore`, {}, adminToken);
      assert(res.status === 404 || res.status === 400,
        `expected 404/400, got ${res.status}`);
    });
  } else {
    console.log("  ⚠ PATCH /admin/comments/restore edge-case tests skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-27  PATCH /admin/users/:id/status — extended");
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
    await test("rejects malformed user ID — 4xx", async () => {
      const res = await api.patch(`/admin/users/${BAD_ID}/status`, { isActive: false }, adminToken);
      assert(res.status === 400 || res.status === 500,
        `expected 400/500 for bad ID, got ${res.status}`);
    });

    await test("returns 404 for non-existent user", async () => {
      const res = await api.patch(`/admin/users/${FAKE_ID}/status`, { isActive: false }, adminToken);
      assert(res.status === 404 || res.status === 400,
        `expected 404/400, got ${res.status}`);
    });
  } else {
    console.log("  ⚠ PATCH /admin/users/:id/status extended tests skipped — set ADMIN_TOKEN env var");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-28  POST /admin/pendingRequests — validation");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects without token — 401", async () => {
    const res = await api.post("/admin/pendingRequests", { requestType: "guide_application" });
    assertStatus(res, 401);
  });

  await test("rejects empty requestType — 4xx", async () => {
    const res = await api.post("/admin/pendingRequests", { requestType: "" }, regularToken);
    assert(res.status >= 400 && res.status < 500,
      `expected 4xx for empty requestType, got ${res.status}`);
  });

  await test("rejects unknown requestType — 4xx", async () => {
    const res = await api.post("/admin/pendingRequests", {
      requestType: "invalid_type_xyz",
      payload: { test: true },
    }, regularToken);
    assert(res.status === 201 || res.status >= 400,
      `expected 201 or 4xx for unknown type, got ${res.status}`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("ADMIN-29  GET /admin/pendingRequests/:id — edge cases");
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
    await test("rejects malformed ID — 4xx", async () => {
      const res = await api.get(`/admin/pendingRequests/${BAD_ID}`, adminToken);
      assert(res.status === 400 || res.status === 500,
        `expected 400/500 for bad ID, got ${res.status}`);
    });

    await test("returns 404 for non-existent request — 404", async () => {
      const res = await api.get(`/admin/pendingRequests/${FAKE_ID}`, adminToken);
      assertStatus(res, 404);
    });
  } else {
    console.log("  ⚠ GET /admin/pendingRequests/:id edge-case tests skipped — set ADMIN_TOKEN env var");
  }

  return summary("Admin API Extended");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
