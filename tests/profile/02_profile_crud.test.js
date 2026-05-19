/**
 * TEST SUITE 02 — User Profile CRUD
 *
 * Covers:
 *   GET  /users/:id          — fetch own profile, fetch other user, fetch non-existent
 *   PUT  /users/:id          — update allowed fields, blocked protected fields
 *   POST /users/:id/avatar   — upload avatar (multipart), wrong field name
 *   GET  /auth/me            — verify profile reflects latest updates
 *
 * Note: avatar upload requires the `form-data` shim shown below or Node 18+ FormData.
 *
 * Usage: node tests/profile/02_profile_crud.test.js
 */

"use strict";

const fs   = require("fs");
const path = require("path");
const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

// ── Bootstrap: register a fresh user ─────────────────────────────────────────

async function bootstrap() {
  const u   = makeTestUser("crud");
  const res = await api.post("/auth/register", {
    firstName: u.firstName,
    lastName:  u.lastName,
    email:     u.email,
    password:  u.password,
  });
  if (!res.ok) throw new Error(`Bootstrap register failed: ${JSON.stringify(res.data)}`);
  return { user: res.data.user, token: res.data.token, creds: u };
}

// ── Helper: build a minimal FormData for avatar upload ───────────────────────
// Node 18+ has a native FormData + Blob but no "file from disk" shortcut.
// We create a small 1×1 PNG in memory (valid image bytes).

const TINY_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a4944" +
  "4154789c6260000000020001e221bc330000000049454e44ae426082",
  "hex"
);

function buildAvatarForm(filename = "avatar.png") {
  const form = new FormData();
  const blob = new Blob([TINY_PNG], { type: "image/png" });
  form.append("avatar", blob, filename);
  return form;
}

// ─────────────────────────────────────────────────────────────────────────────
async function runAll() {
  const { user, token } = await bootstrap();
  const userId = user.id || user._id;

  // ═══════════════════════════════════════════════════════════════════════════
  suite("02-A  GET /users/:id");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("fetches own profile — 200 with user data", async () => {
    const res = await api.get(`/users/${userId}`, token);
    assertStatus(res, 200);
    assert(res.data.email, "email should be present");
    assert(!res.data.passwordHash, "passwordHash must NOT be returned");
    assertEqual(res.data.email, user.email, "email matches registered value");
  });

  await test("rejects unauthenticated request — 401", async () => {
    const res = await api.get(`/users/${userId}`);
    assertStatus(res, 401);
  });

  await test("returns 404 for non-existent user ID", async () => {
    const fakeId = "000000000000000000000000";
    const res = await api.get(`/users/${fakeId}`, token);
    assertStatus(res, 404);
  });

  await test("returns 4xx for malformed ID format", async () => {
    const res = await api.get("/users/not-a-valid-id", token);
    assert(res.status >= 400, "should reject malformed ObjectId");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("02-B  PUT /users/:id — update profile fields");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("updates bio, phone, city — 200 with updated data", async () => {
    const res = await api.put(`/users/${userId}`, {
      bio:   "I love exploring city guide!",
      phone: "+212600000000",
      city:  "Casablanca",
    }, token);
    assertStatus(res, 200);
    assertEqual(res.data.bio,   "I love exploring city guide!", "bio");
    assertEqual(res.data.phone, "+212600000000",                "phone");
    assertEqual(res.data.city,  "Casablanca",                   "city");
  });

  await test("updates social links — whatsapp, instagram, website", async () => {
    const res = await api.put(`/users/${userId}`, {
      whatsapp:  "+212600000001",
      instagram: "@testuser",
      website:   "https://example.com",
    }, token);
    assertStatus(res, 200);
    assertEqual(res.data.instagram, "@testuser",          "instagram");
    assertEqual(res.data.website,   "https://example.com", "website");
  });

  await test("updates nationality and gender", async () => {
    const res = await api.put(`/users/${userId}`, {
      nationality: "Moroccan",
      gender:      "Male",
    }, token);
    assertStatus(res, 200);
    assertEqual(res.data.nationality, "Moroccan", "nationality");
    assertEqual(res.data.gender,      "Male",     "gender");
  });

  await test("updates date of birth (ISO string)", async () => {
    const res = await api.put(`/users/${userId}`, { dob: "1995-06-15" }, token);
    assertStatus(res, 200);
    assert(res.data.dob, "dob should be present");
  });

  await test("silently strips 'role' from body — role unchanged after update", async () => {
    const resBefore = await api.get(`/users/${userId}`, token);
    const originalRole = resBefore.data.role;

    await api.put(`/users/${userId}`, { role: "admin", bio: "hack attempt" }, token);

    const resAfter = await api.get(`/users/${userId}`, token);
    assertEqual(resAfter.data.role, originalRole, "role must not change via PUT body");
  });

  await test("silently strips 'isVerified' from body", async () => {
    await api.put(`/users/${userId}`, { isVerified: true }, token);
    const res = await api.get(`/users/${userId}`, token);
    assertEqual(res.data.isVerified, false, "isVerified must not be set via PUT");
  });

  await test("silently strips 'isActive' from body", async () => {
    await api.put(`/users/${userId}`, { isActive: false }, token);
    const res = await api.get(`/users/${userId}`, token);
    assertEqual(res.data.isActive, true, "isActive must not be set via PUT");
  });

  await test("silently strips 'passwordHash' from body", async () => {
    // If this leaked through, we could overwrite the hashed password with plain text
    const res = await api.put(`/users/${userId}`, { passwordHash: "plaintext_hack" }, token);
    assertStatus(res, 200);
    // Verify login still works with original password (passwordHash was NOT changed)
    const login = await api.post("/auth/login", { email: user.email, password: "TestPass1!" });
    assertStatus(login, 200);
  });

  await test("rejects unauthenticated update — 401", async () => {
    const res = await api.put(`/users/${userId}`, { bio: "no auth" });
    assertStatus(res, 401);
  });

  await test("returns 404 for non-existent user ID", async () => {
    const res = await api.put("/users/000000000000000000000000", { bio: "ghost" }, token);
    assertStatus(res, 404);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("02-C  GET /auth/me — reflects profile changes");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("/auth/me reflects latest profile update", async () => {
    // Update name
    await api.put(`/users/${userId}`, { firstName: "Updated", lastName: "Name" }, token);
    const me = await api.get("/auth/me", token);
    assertStatus(me, 200);
    assertEqual(me.data.firstName, "Updated", "firstName updated");
    assertEqual(me.data.lastName,  "Name",    "lastName updated");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("02-D  POST /users/:id/avatar — avatar upload");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("uploads avatar (valid PNG) — 200 with avatarUrl", async () => {
    const form = buildAvatarForm("test_avatar.png");
    const res  = await api.upload(`/users/${userId}/avatar`, form, token);
    assertStatus(res, 200);
    assert(res.data.avatarUrl, "avatarUrl should be returned");
    assert(typeof res.data.avatarUrl === "string", "avatarUrl should be a string");
    assert(res.data.avatarUrl.startsWith("http"), "avatarUrl should be an absolute URL");
  });

  await test("rejects avatar upload with no file — 400", async () => {
    const emptyForm = new FormData();
    const res = await api.upload(`/users/${userId}/avatar`, emptyForm, token);
    assertStatus(res, 400);
  });

  await test("rejects avatar upload without auth — 401", async () => {
    const form = buildAvatarForm();
    const res  = await api.upload(`/users/${userId}/avatar`, form);
    assertStatus(res, 401);
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  return summary("Suite 02 — Profile CRUD");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
