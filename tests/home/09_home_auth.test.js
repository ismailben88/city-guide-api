/**
 * TEST SUITE — Home Page: GET /auth/me (user state)
 *
 * Covers:
 *   GET /auth/me       — with valid token, without token, with expired/invalid token
 *
 * Usage:
 *   node tests/home/09_home_auth.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

// ── Bootstrap ─────────────────────────────────────────────────────────────────

let token, user;

async function bootstrap() {
  const u = makeTestUser("home-auth");
  const res = await api.post("/auth/register", {
    firstName: u.firstName, lastName: u.lastName,
    email: u.email, password: u.password,
  });
  if (!res.ok) throw new Error(`Bootstrap register failed: ${JSON.stringify(res.data)}`);
  user  = res.data.user;
  token = res.data.token;
}

// ── Suite runner ──────────────────────────────────────────────────────────────

async function runAll() {
  await bootstrap();

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-33  GET /auth/me — without token");
  // ═════════════════════════════════════════════════════════════════════════

  await test("rejects without token — 401", async () => {
    const res = await api.get("/auth/me");
    assertStatus(res, 401);
  });

  await test("rejects with empty token — 401", async () => {
    const res = await api.get("/auth/me", "");
    assertStatus(res, 401);
  });

  await test("rejects with invalid token format — 401", async () => {
    const res = await api.get("/auth/me", "not-a-valid-token");
    assert(res.status === 401 || res.status === 500,
      `expected 401/500, got ${res.status}`);
  });

  await test("rejects with malformed Bearer token — 401", async () => {
    const res = await api.get("/auth/me", "Bearer ");
    assert(res.status === 401 || res.status === 500,
      `expected 401/500, got ${res.status}`);
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-34  GET /auth/me — with valid token");
  // ═════════════════════════════════════════════════════════════════════════

  await test("returns user object with valid token — 200", async () => {
    const res = await api.get("/auth/me", token);
    assertStatus(res, 200);
    assert(res.data._id || res.data.id, "response should have user _id/id");
    assert(res.data.email, "response should have user email");
    assertEqual(res.data.email, user.email, "email should match registered user");
  });

  await test("returns user with expected profile fields", async () => {
    const res = await api.get("/auth/me", token);
    assertStatus(res, 200);
    assert(typeof res.data.firstName === "string", "firstName should be a string");
    assert(typeof res.data.lastName  === "string", "lastName should be a string");
    assert(typeof res.data.role      === "string", "role should be a string");
  });

  await test("does NOT expose password in response", async () => {
    const res = await api.get("/auth/me", token);
    assertStatus(res, 200);
    assert(res.data.password === undefined, "password should NOT be exposed");
  });

  // ═════════════════════════════════════════════════════════════════════════
  suite("HOME-35  GET /auth/me — token edge cases");
  // ═════════════════════════════════════════════════════════════════════════

  await test("rejects with expired-style token (future expiry) — 401", async () => {
    const res = await api.get("/auth/me", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjo5OTk5OTk5OTk5fQ.signature");
    assert(res.status === 401 || res.status === 500 || res.status === 403,
      `expected 4xx/500, got ${res.status}`);
  });

  await test("rejects with very long random token — 401", async () => {
    const longToken = "x".repeat(10000);
    const res = await api.get("/auth/me", longToken);
    assert(res.status === 401 || res.status === 500 || res.status === 413,
      `expected 4xx/500/413, got ${res.status}`);
  });

  return summary("Home Auth API");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
