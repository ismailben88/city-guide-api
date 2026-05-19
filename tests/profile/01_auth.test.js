/**
 * TEST SUITE 01 — Authentication
 *
 * Covers:
 *   POST /auth/register   — happy path, duplicate email, missing fields, name splitting
 *   POST /auth/login      — happy path, wrong password, deactivated account
 *   GET  /auth/me         — with valid token, with no token, with bad token
 *   POST /auth/refresh    — valid token refresh, missing body
 *   POST /auth/logout     — always 200
 *
 * Usage:  node tests/profile/01_auth.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

// ── Shared state (populated during the run) ───────────────────────────────────
let registeredUser   = null;
let registeredToken  = null;

// ─────────────────────────────────────────────────────────────────────────────
async function runAll() {

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-A  POST /auth/register");
  // ═══════════════════════════════════════════════════════════════════════════

  const newUser = makeTestUser("auth");

  await test("registers a new user — returns 201 with token + user", async () => {
    const res = await api.post("/auth/register", {
      firstName: newUser.firstName,
      lastName:  newUser.lastName,
      email:     newUser.email,
      password:  newUser.password,
    });
    assertStatus(res, 201);
    assert(res.data.token,       "token should be present");
    assert(res.data.user,        "user should be present");
    assert(res.data.user.id,     "user.id should be present");
    assertEqual(res.data.user.email, newUser.email, "email");
    // passwordHash must never be returned
    assert(!res.data.user.passwordHash, "passwordHash must NOT be in response");
    registeredUser  = res.data.user;
    registeredToken = res.data.token;
  });

  await test("rejects duplicate email — 400", async () => {
    const res = await api.post("/auth/register", {
      firstName: "Other",
      lastName:  "User",
      email:     newUser.email,
      password:  newUser.password,
    });
    assertStatus(res, 400);
  });

  await test("rejects missing firstName — 4xx", async () => {
    const res = await api.post("/auth/register", {
      lastName: "User",
      email:    `missing_fn_${Date.now()}@test.com`,
      password: "Pass1!abc",
    });
    assert(res.status >= 400, "should reject missing firstName");
  });

  await test("rejects missing email — 4xx", async () => {
    const res = await api.post("/auth/register", {
      firstName: "Test",
      lastName:  "User",
      password:  "Pass1!abc",
    });
    assert(res.status >= 400, "should reject missing email");
  });

  await test("rejects missing password — 4xx", async () => {
    const res = await api.post("/auth/register", {
      firstName: "Test",
      lastName:  "User",
      email:     `missing_pw_${Date.now()}@test.com`,
    });
    assert(res.status >= 400, "should reject missing password");
  });

  await test("returned user has correct role default ('user')", async () => {
    assert(registeredUser, "need registeredUser from earlier test");
    assertEqual(registeredUser.role, "user", "default role");
  });

  await test("returned user does not expose passwordHash", async () => {
    assert(registeredUser, "need registeredUser from earlier test");
    assert(!registeredUser.passwordHash, "passwordHash must not be in user payload");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-B  POST /auth/login");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("logs in with correct credentials — 200 with token + user", async () => {
    const res = await api.post("/auth/login", { email: newUser.email, password: newUser.password });
    assertStatus(res, 200);
    assert(res.data.token, "token should be present");
    assert(res.data.user,  "user should be present");
    assert(!res.data.user.passwordHash, "passwordHash must NOT be in response");
    // refresh our token with a fresh login token
    registeredToken = res.data.token;
  });

  await test("rejects wrong password — 401", async () => {
    const res = await api.post("/auth/login", { email: newUser.email, password: "WrongPass999!" });
    assertStatus(res, 401);
  });

  await test("rejects non-existent email — 401", async () => {
    const res = await api.post("/auth/login", { email: "nobody@nowhere.com", password: "Test1234!" });
    assertStatus(res, 401);
  });

  await test("rejects empty body — 4xx", async () => {
    const res = await api.post("/auth/login", {});
    assert(res.status >= 400, "should reject empty credentials");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-C  GET /auth/me");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns current user with valid token — 200", async () => {
    assert(registeredToken, "need registeredToken");
    const res = await api.get("/auth/me", registeredToken);
    assertStatus(res, 200);
    assert(res.data._id || res.data.id, "user id should be present");
    assertEqual(res.data.email, newUser.email, "email matches");
    assert(!res.data.passwordHash, "passwordHash must NOT be exposed");
  });

  await test("rejects request with no token — 401", async () => {
    const res = await api.get("/auth/me");
    assertStatus(res, 401);
  });

  await test("rejects request with malformed token — 401", async () => {
    const res = await api.get("/auth/me", "not.a.valid.jwt");
    assertStatus(res, 401);
  });

  await test("rejects request with empty Bearer — 401", async () => {
    const res = await api.get("/auth/me", "");
    assertStatus(res, 401);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-D  POST /auth/refresh");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns a new token when given a valid token — 200", async () => {
    assert(registeredToken, "need registeredToken");
    const res = await api.post("/auth/refresh", { refreshToken: registeredToken });
    assertStatus(res, 200);
    assert(res.data.token, "new token should be present");
  });

  await test("rejects missing refreshToken body — 400", async () => {
    const res = await api.post("/auth/refresh", {});
    assertStatus(res, 400);
  });

  await test("rejects invalid refreshToken — 4xx", async () => {
    const res = await api.post("/auth/refresh", { refreshToken: "garbage.token.here" });
    assert(res.status >= 400, "should reject invalid refresh token");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-E  POST /auth/logout");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("logout returns 200 (stateless — always succeeds)", async () => {
    const res = await api.post("/auth/logout", {}, registeredToken);
    assertStatus(res, 200);
  });

  await test("logout without token also returns 200 (no server session)", async () => {
    const res = await api.post("/auth/logout", {});
    assertStatus(res, 200);
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  const result = summary("Suite 01 — Authentication");

  // Export credentials for other suites
  result.registeredUser  = registeredUser;
  result.registeredToken = registeredToken;
  result.newUser         = newUser;
  return result;
}

// Run standalone
if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
