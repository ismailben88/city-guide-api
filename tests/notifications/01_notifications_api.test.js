/**
 * TEST SUITE 01 — Notifications API
 *
 * Covers:
 *   GET    /notifications              — list user's notifications
 *   GET    /notifications/count        — unread badge count
 *   POST   /notifications              — admin: create notification
 *   PATCH  /notifications/:id          — mark one as read
 *   PATCH  /notifications/read-all     — mark all as read
 *   DELETE /notifications/:id          — delete one notification
 *   DELETE /notifications              — delete all read notifications
 *   Edge cases & ownership boundary
 *
 * Usage: node tests/notifications/01_notifications_api.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

async function bootstrap() {
  const u   = makeTestUser("notif");
  const res = await api.post("/auth/register", {
    firstName: u.firstName, lastName: u.lastName,
    email: u.email, password: u.password,
  });
  if (!res.ok) throw new Error(`Bootstrap register failed: ${JSON.stringify(res.data)}`);
  return { user: res.data.user, token: res.data.token, creds: u };
}

async function runAll() {
  const { user, token } = await bootstrap();
  const userB = await bootstrap(); // second user for ownership tests
  const adminToken = process.env.ADMIN_TOKEN || null;

  let createdNotifId = null;

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-A  GET /notifications");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns an array (possibly empty) for authenticated user — 200", async () => {
    const res = await api.get("/notifications", token);
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("returns 401 without token", async () => {
    const res = await api.get("/notifications");
    assertStatus(res, 401);
  });

  await test("returns empty array for new user with no notifications", async () => {
    const res = await api.get("/notifications", token);
    assertStatus(res, 200);
    assertEqual(res.data.length, 0, "should be empty");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-B  GET /notifications/count");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns count 0 for new user — 200", async () => {
    const res = await api.get("/notifications/count", token);
    assertStatus(res, 200);
    assert(typeof res.data.count === "number", "count should be a number");
    assertEqual(res.data.count, 0, "should be 0 for new user");
  });

  await test("returns 401 without token", async () => {
    const res = await api.get("/notifications/count");
    assertStatus(res, 401);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-C  PATCH /notifications/read-all");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("marks all as read — 200", async () => {
    const res = await api.patch("/notifications/read-all", {}, token);
    assertStatus(res, 200);
    assert(res.data.message || res.data.success, "should return success message");
  });

  await test("returns 401 without token", async () => {
    const res = await api.patch("/notifications/read-all", {});
    assertStatus(res, 401);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-D  DELETE /notifications — delete all read");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("delete all read notifications — 200", async () => {
    const res = await api.delete("/notifications", token);
    assertStatus(res, 200);
    assert(res.data.message || res.data.success, "should return success message");
  });

  await test("returns 401 without token", async () => {
    const res = await api.delete("/notifications");
    assertStatus(res, 401);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-E  Admin notification CRUD (requires ADMIN_TOKEN)");
  // ═══════════════════════════════════════════════════════════════════════════

  if (adminToken) {
    await test("[ADMIN] POST /notifications creates a notification — 201", async () => {
      const res = await api.post("/notifications", {
        userId: user._id || user.id,
        type: "system",
        title: "Test Notification",
        message: "This is a test notification",
      }, adminToken);
      assertStatus(res, 201);
      createdNotifId = res.data._id || res.data.id;
      assert(createdNotifId, "should return notification id");
    });

    await test("[ADMIN] notification appears in user's GET list", async () => {
      const res = await api.get("/notifications", token);
      assertStatus(res, 200);
      const found = res.data.find(n => (n._id || n.id) === createdNotifId);
      assert(found, "notification should be visible to the user");
      assertEqual(found.title, "Test Notification", "title matches");
    });

    await test("[ADMIN] GET /notifications/count reflects unread — count > 0", async () => {
      const res = await api.get("/notifications/count", token);
      assertStatus(res, 200);
      assert(res.data.count > 0, "unread count should be > 0");
    });

    await test("[ADMIN] PATCH /notifications/:id marks as read", async () => {
      const res = await api.patch(`/notifications/${createdNotifId}`, {}, token);
      assertStatus(res, 200);
    });

    await test("[ADMIN] DELETE /notifications/:id deletes one notification", async () => {
      const res = await api.delete(`/notifications/${createdNotifId}`, token);
      assertStatus(res, 200);
    });

    await test("[ADMIN] notification removed from list after delete", async () => {
      const res = await api.get("/notifications", token);
      assertStatus(res, 200);
      const found = res.data.find(n => (n._id || n.id) === createdNotifId);
      assert(!found, "deleted notification should not appear");
    });
  } else {
    console.log("  \x1b[33m\u26a0 Admin notification CRUD tests skipped — set ADMIN_TOKEN env var\x1b[0m");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-F  Edge cases");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("PATCH /notifications/:id with non-existent id — 404", async () => {
    const res = await api.patch("/notifications/000000000000000000000000", {}, token);
    assert(res.status === 404 || res.status === 400, "should return 404 or 400 for non-existent id");
  });

  await test("PATCH /notifications/:id with invalid ObjectId — 4xx", async () => {
    const res = await api.patch("/notifications/invalid-id-format", {}, token);
    assert(res.status >= 400, "should reject malformed ObjectId");
  });

  await test("DELETE /notifications/:id with non-existent id — 404", async () => {
    const res = await api.delete("/notifications/000000000000000000000000", token);
    assert(res.status === 404 || res.status === 400, "should handle non-existent id");
  });

  await test("POST /notifications without admin token — 403", async () => {
    const res = await api.post("/notifications", {
      userId: user._id || user.id,
      type: "system",
      title: "Should Fail",
      message: "This should be rejected",
    }, token);
    assertStatus(res, 403);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-G  Ownership boundary — user B cannot access user A's notifications");
  // ═══════════════════════════════════════════════════════════════════════════

  if (adminToken) {
    let notifForA = null;

    await test("[SETUP] admin creates notification for user A", async () => {
      const res = await api.post("/notifications", {
        userId: user._id || user.id,
        type: "system",
        title: "For User A Only",
        message: "Ownership test",
      }, adminToken);
      assertStatus(res, 201);
      notifForA = res.data._id || res.data.id;
    });

    await test("user B cannot see user A's notification in GET list", async () => {
      const res = await api.get("/notifications", userB.token);
      assertStatus(res, 200);
      const found = res.data.find(n => (n._id || n.id) === notifForA);
      assert(!found, "user B should not see user A's notification");
    });

    await test("user B cannot mark user A's notification as read — 404 or 403", async () => {
      const res = await api.patch(`/notifications/${notifForA}`, {}, userB.token);
      assert(res.status === 403 || res.status === 404 || res.status === 400,
        "user B should not be able to read user A's notification");
    });

    await test("user B cannot delete user A's notification — 404 or 403", async () => {
      const res = await api.delete(`/notifications/${notifForA}`, userB.token);
      assert(res.status === 403 || res.status === 404 || res.status === 400,
        "user B should not be able to delete user A's notification");
    });

    // Cleanup
    await api.delete(`/notifications/${notifForA}`, token).catch(() => {});
  } else {
    console.log("  \x1b[33m\u26a0 Ownership boundary tests skipped — set ADMIN_TOKEN env var\x1b[0m");
  }

  return summary("Suite 01 — Notifications API");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
