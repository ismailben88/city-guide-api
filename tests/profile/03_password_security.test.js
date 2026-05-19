/**
 * TEST SUITE 03 — Password & Account Security
 *
 * Covers:
 *   PATCH /users/me/password    — success, wrong current, too short, missing fields
 *   DELETE /users/me            — soft-deactivates account, subsequent login blocked
 *   POST  /auth/login           — blocked after deactivation (isActive: false → 403)
 *   GET   /auth/me              — blocked after deactivation
 *
 * Usage: node tests/profile/03_password_security.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

// ── Bootstrap: register two users ────────────────────────────────────────────
// User A: used for password-change tests (NOT deactivated)
// User B: used for account-deletion tests (WILL be deactivated at end)

async function bootstrap(tag) {
  const u   = makeTestUser(tag);
  const res = await api.post("/auth/register", {
    firstName: u.firstName,
    lastName:  u.lastName,
    email:     u.email,
    password:  u.password,
  });
  if (!res.ok) throw new Error(`Bootstrap failed for ${tag}: ${JSON.stringify(res.data)}`);
  return { user: res.data.user, token: res.data.token, creds: u };
}

// ─────────────────────────────────────────────────────────────────────────────
async function runAll() {
  const A = await bootstrap("pw_main");   // password tests
  const B = await bootstrap("pw_delete"); // deletion tests

  // ═══════════════════════════════════════════════════════════════════════════
  suite("03-A  PATCH /users/me/password — change password");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects request without token — 401", async () => {
    const res = await api.patch("/users/me/password", {
      currentPassword: A.creds.password,
      newPassword:     "NewPass99!",
    });
    assertStatus(res, 401);
  });

  await test("rejects missing currentPassword field — 400", async () => {
    const res = await api.patch("/users/me/password", { newPassword: "NewPass99!" }, A.token);
    assertStatus(res, 400);
  });

  await test("rejects missing newPassword field — 400", async () => {
    const res = await api.patch("/users/me/password", { currentPassword: A.creds.password }, A.token);
    assertStatus(res, 400);
  });

  await test("rejects wrong currentPassword — 401", async () => {
    const res = await api.patch("/users/me/password", {
      currentPassword: "WrongOldPass!",
      newPassword:     "NewPass99!",
    }, A.token);
    assertStatus(res, 401);
  });

  await test("rejects newPassword shorter than 8 characters — 400", async () => {
    const res = await api.patch("/users/me/password", {
      currentPassword: A.creds.password,
      newPassword:     "Short1",
    }, A.token);
    assertStatus(res, 400);
  });

  const NEW_PASSWORD = "ChangedPass42!";

  await test("changes password successfully with correct inputs — 200", async () => {
    const res = await api.patch("/users/me/password", {
      currentPassword: A.creds.password,
      newPassword:     NEW_PASSWORD,
    }, A.token);
    assertStatus(res, 200);
    assert(res.data.message, "success message should be returned");
  });

  await test("old password no longer works after change — 401", async () => {
    const res = await api.post("/auth/login", { email: A.creds.email, password: A.creds.password });
    assertStatus(res, 401);
  });

  await test("new password works for login after change — 200", async () => {
    const res = await api.post("/auth/login", { email: A.creds.email, password: NEW_PASSWORD });
    assertStatus(res, 200);
    assert(res.data.token, "token should be returned with new password");
    // update A's token for further use
    A.token = res.data.token;
  });

  await test("can change password again (second rotation) — 200", async () => {
    const thirdPass = "ThirdPass99@";
    const res = await api.patch("/users/me/password", {
      currentPassword: NEW_PASSWORD,
      newPassword:     thirdPass,
    }, A.token);
    assertStatus(res, 200);
    // verify login with third password
    const login = await api.post("/auth/login", { email: A.creds.email, password: thirdPass });
    assertStatus(login, 200);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("03-B  DELETE /users/me — account self-deactivation");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("deactivates own account — 200", async () => {
    const res = await api.delete("/users/me", B.token);
    assertStatus(res, 200);
    assert(res.data.message, "success message should be returned");
  });

  await test("login is blocked after deactivation — 403", async () => {
    const res = await api.post("/auth/login", { email: B.creds.email, password: B.creds.password });
    assertStatus(res, 403);
  });

  await test("accessing /auth/me with old token is blocked — 403", async () => {
    const res = await api.get("/auth/me", B.token);
    assertStatus(res, 403);
  });

  await test("accessing /users/:id with old token returns 403", async () => {
    const id = B.user.id || B.user._id;
    const res = await api.get(`/users/${id}`, B.token);
    assertStatus(res, 403);
  });

  await test("DELETE /users/me without token — 401", async () => {
    const res = await api.delete("/users/me");
    assertStatus(res, 401);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("03-C  Token integrity checks");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("tampered JWT payload is rejected — 401", async () => {
    // Split a valid token and tamper with the payload segment
    const parts = A.token.split(".");
    if (parts.length !== 3) { throw new Error("Token format unexpected"); }
    const tamperedPayload = Buffer.from(JSON.stringify({ id: "000000000000000000000000", iat: 1 })).toString("base64url");
    const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    const res = await api.get("/auth/me", tampered);
    assertStatus(res, 401);
  });

  await test("expired/garbage token is rejected — 401", async () => {
    const fake = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZha2UiLCJpYXQiOjF9.INVALID_SIGNATURE";
    const res  = await api.get("/auth/me", fake);
    assertStatus(res, 401);
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  return summary("Suite 03 — Password & Security");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
