/**
 * TEST SUITE 06 — Auth Extended (Social, Refresh, Logout)
 *
 * Covers:
 *   POST /auth/google     — Google social auth
 *   POST /auth/facebook   — Facebook social auth
 *   POST /auth/refresh    — Token refresh
 *   POST /auth/logout     — Logout
 *   Edge cases & idempotency
 *
 * Usage: node tests/profile/06_auth_extended.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

// ─────────────────────────────────────────────────────────────────────────────
async function runAll() {
  const u = makeTestUser("extauth");
  const regRes = await api.post("/auth/register", {
    firstName: u.firstName, lastName: u.lastName,
    email: u.email, password: u.password,
  });
  if (!regRes.ok) throw new Error(`Bootstrap register failed: ${JSON.stringify(regRes.data)}`);
  const { token, user } = regRes.data;

  // ═══════════════════════════════════════════════════════════════════════════
  suite("06-A  POST /auth/google — Google social auth");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("authenticates with valid googleId+email — 200", async () => {
    const res = await api.post("/auth/google", {
      googleId: "google-test-id-001",
      email: "googleuser@cityguide.test",
      name: "Google User",
      avatar: "https://example.com/avatar.png",
    });
    assertStatus(res, 200);
    assert(res.data.token, "should return auth token");
    assert(res.data.user, "should return user data");
  });

  await test("missing googleId returns 400", async () => {
    const res = await api.post("/auth/google", {
      email: "noid@cityguide.test",
      name: "No ID",
    });
    assertStatus(res, 400);
  });

  await test("missing email returns 400", async () => {
    const res = await api.post("/auth/google", {
      googleId: "no-email-id",
      name: "No Email",
    });
    assertStatus(res, 400);
  });

  await test("same googleId returns same user (idempotent) — 200", async () => {
    const res1 = await api.post("/auth/google", {
      googleId: "google-test-id-002",
      email: "dup@cityguide.test",
      name: "Dup User",
    });
    const userId1 = res1.data.user._id || res1.data.user.id;

    const res2 = await api.post("/auth/google", {
      googleId: "google-test-id-002",
      email: "dup@cityguide.test",
      name: "Dup User Updated",
    });
    const userId2 = res2.data.user._id || res2.data.user.id;
    assertEqual(userId1, userId2, "same googleId should return same user");
  });

  await test("empty body returns 400", async () => {
    const res = await api.post("/auth/google", {});
    assertStatus(res, 400);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("06-B  POST /auth/facebook — Facebook social auth");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("authenticates with valid facebookId+email — 200", async () => {
    const res = await api.post("/auth/facebook", {
      facebookId: "fb-test-id-001",
      email: "fbuser@cityguide.test",
      name: "Facebook User",
      avatar: "https://example.com/fb-avatar.png",
    });
    assertStatus(res, 200);
    assert(res.data.token, "should return auth token");
    assert(res.data.user, "should return user data");
  });

  await test("missing facebookId returns 400", async () => {
    const res = await api.post("/auth/facebook", {
      email: "nofbid@cityguide.test",
      name: "No FB ID",
    });
    assertStatus(res, 400);
  });

  await test("missing email returns 400", async () => {
    const res = await api.post("/auth/facebook", {
      facebookId: "no-email-fb",
      name: "No Email",
    });
    assertStatus(res, 400);
  });

  await test("same facebookId returns same user (idempotent) — 200", async () => {
    const res1 = await api.post("/auth/facebook", {
      facebookId: "fb-test-id-002",
      email: "fbdup@cityguide.test",
      name: "FB Dup",
    });
    const userId1 = res1.data.user._id || res1.data.user.id;

    const res2 = await api.post("/auth/facebook", {
      facebookId: "fb-test-id-002",
      email: "fbdup@cityguide.test",
      name: "FB Dup Updated",
    });
    const userId2 = res2.data.user._id || res2.data.user.id;
    assertEqual(userId1, userId2, "same facebookId should return same user");
  });

  await test("empty body returns 400", async () => {
    const res = await api.post("/auth/facebook", {});
    assertStatus(res, 400);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("06-C  POST /auth/logout");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("logout returns success — 200", async () => {
    const res = await api.post("/auth/logout");
    assertStatus(res, 200);
    assert(res.data.message || res.data.success, "should return logout message");
  });

  await test("logout does not require auth — 200", async () => {
    const res = await api.post("/auth/logout");
    assertStatus(res, 200);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("06-D  POST /auth/refresh — Token refresh");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("missing refreshToken returns 400", async () => {
    const res = await api.post("/auth/refresh", {});
    assertStatus(res, 400);
  });

  await test("empty body returns 400", async () => {
    const res = await api.post("/auth/refresh", null);
    assert(res.status >= 400, "should reject empty body");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("06-E  Edge cases — unusual auth scenarios");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("Google auth with empty string googleId — 400", async () => {
    const res = await api.post("/auth/google", {
      googleId: "",
      email: "empty@cityguide.test",
    });
    assert(res.status >= 400, "should reject empty googleId");
  });

  await test("Facebook auth with empty string facebookId — 400", async () => {
    const res = await api.post("/auth/facebook", {
      facebookId: "",
      email: "empty@cityguide.test",
    });
    assert(res.status >= 400, "should reject empty facebookId");
  });

  await test("Google auth with non-existent fake ID creates new user — 200", async () => {
    const res = await api.post("/auth/google", {
      googleId: "brand-new-google-id-" + Date.now(),
      email: "brandnewgoogle@cityguide.test",
      name: "Brand New",
    });
    assertStatus(res, 200);
    assert(res.data.token, "should create account and return token");
  });

  return summary("Suite 06 — Auth Extended");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
