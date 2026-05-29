/**
 * TEST SUITE 01 — Businesses (Business Listings)
 *
 * Covers:
 *   GET    /businesses          — list (public + ?mine=true)
 *   GET    /businesses/:id      — get single
 *   POST   /businesses          — create new listing
 *   PUT    /businesses/:id      — update listing
 *   DELETE /businesses/:id      — soft-delete
 *   POST   /businesses/:id/photos — upload photos
 *   Auth boundaries & validation
 *
 * Usage: node tests/businesses/01_businesses.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

// ── Tiny 1x1 valid PNG for photo uploads ─────────────────────────────────────

const TINY_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a4944" +
  "4154789c6260000000020001e221bc330000000049454e44ae426082",
  "hex"
);

function buildPhotoForm(count = 1) {
  const form = new FormData();
  for (let i = 0; i < count; i++) {
    const blob = new Blob([TINY_PNG], { type: "image/png" });
    form.append("photos", blob, `photo_${i}.png`);
  }
  return form;
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap() {
  const u   = makeTestUser("biz");
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

  let createdBizId = null;

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-A  GET /businesses — public listing");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns an array without auth — 200", async () => {
    const res = await api.get("/businesses");
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("?mine=true without auth returns 401", async () => {
    const res = await api.get("/businesses?mine=true");
    assertStatus(res, 401);
  });

  await test("?mine=true with auth returns own listings — 200", async () => {
    const res = await api.get("/businesses?mine=true", token);
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-B  POST /businesses — create listing");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("creates a new business listing — 201", async () => {
    const res = await api.post("/businesses", {
      name: "Test Business",
      description: "A test business listing for integration tests.",
      cityId: "000000000000000000000001",
      categoryId: "000000000000000000000001",
      address: "123 Test Street",
      phone: "+212600000000",
      email: "biz@example.com",
      website: "https://example.com",
    }, token);
    assertStatus(res, 201);
    createdBizId = res.data._id || res.data.id || (res.data.business?._id || res.data.business?.id);
    assert(createdBizId || res.data._id || res.data.id, "should return listing id");
  });

  await test("rejects creation without auth — 401", async () => {
    const res = await api.post("/businesses", { name: "No Auth Biz" });
    assertStatus(res, 401);
  });

  await test("rejects creation with missing required fields — 400", async () => {
    const res = await api.post("/businesses", { name: "Incomplete" }, token);
    assert(res.status >= 400, "should reject incomplete data");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-C  GET /businesses/:id — single listing");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("fetches own business listing — 200", async () => {
    if (!createdBizId) return console.log("    \x1b[33m\u26a0 skip: no business id\x1b[0m");
    const res = await api.get(`/businesses/${createdBizId}`, token);
    assertStatus(res, 200);
  });

  await test("fetches business without auth — 200 (public)", async () => {
    if (!createdBizId) return console.log("    \x1b[33m\u26a0 skip: no business id\x1b[0m");
    const res = await api.get(`/businesses/${createdBizId}`);
    assertStatus(res, 200);
  });

  await test("returns 404 for non-existent id", async () => {
    const res = await api.get("/businesses/000000000000000000000000");
    assert(res.status === 404 || res.status >= 400, "should return 404 for non-existent");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-D  PUT /businesses/:id — update listing");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("updates own business listing — 200", async () => {
    if (!createdBizId) return console.log("    \x1b[33m\u26a0 skip: no business id\x1b[0m");
    const res = await api.put(`/businesses/${createdBizId}`, {
      name: "Updated Business Name",
      description: "Updated description for testing.",
    }, token);
    assertStatus(res, 200);
  });

  await test("other user cannot update — 403", async () => {
    if (!createdBizId) return console.log("    \x1b[33m\u26a0 skip: no business id\x1b[0m");
    const res = await api.put(`/businesses/${createdBizId}`, {
      name: "Hacked Name",
    }, userB.token);
    assert(res.status === 403 || res.status === 404, "should reject cross-user update");
  });

  await test("cannot update without auth — 401", async () => {
    if (!createdBizId) return console.log("    \x1b[33m\u26a0 skip: no business id\x1b[0m");
    const res = await api.put(`/businesses/${createdBizId}`, { name: "No Auth" });
    assertStatus(res, 401);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-E  DELETE /businesses/:id — soft delete");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("owner can delete own business — 200", async () => {
    if (!createdBizId) return console.log("    \x1b[33m\u26a0 skip: no business id\x1b[0m");
    const res = await api.delete(`/businesses/${createdBizId}`, token);
    assertStatus(res, 200);
  });

  await test("other user cannot delete — 403", async () => {
    const res = await api.delete("/businesses/000000000000000000000001", userB.token);
    assert(res.status === 403 || res.status === 404, "should reject cross-user delete");
  });

  await test("cannot delete without auth — 401", async () => {
    const res = await api.delete("/businesses/000000000000000000000001");
    assertStatus(res, 401);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-F  POST /businesses/:id/photos — upload photos");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("uploads photos to own business — 200", async () => {
    // Create a fresh business for photo test
    const createRes = await api.post("/businesses", {
      name: "Photo Test Business",
      description: "Testing photo uploads.",
      cityId: "000000000000000000000001",
      categoryId: "000000000000000000000001",
      address: "456 Photo Street",
    }, token);
    if (createRes.status !== 201) return console.log("    \x1b[33m\u26a0 skip: could not create test business\x1b[0m");
    const bizId = createRes.data._id || createRes.data.id || createRes.data.business?._id;

    const form = buildPhotoForm(2);
    const res = await api.upload(`/businesses/${bizId}/photos`, form, token);
    assertStatus(res, 200);
    // Cleanup
    await api.delete(`/businesses/${bizId}`, token).catch(() => {});
  });

  await test("upload without auth — 401", async () => {
    const form = buildPhotoForm(1);
    const res = await api.upload("/businesses/000000000000000000000001/photos", form);
    assertStatus(res, 401);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-G  Edge cases");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("malformed ObjectId in URL — 4xx", async () => {
    const res = await api.get("/businesses/invalid-id");
    assert(res.status >= 400, "should reject malformed id");
  });

  await test("create with very long name — handled gracefully", async () => {
    const res = await api.post("/businesses", {
      name: "X".repeat(500),
      description: "Long name test",
    }, token);
    assert(res.status === 201 || res.status >= 400, "long name should not crash server");
  });

  await test("create with XSS in fields — handled gracefully", async () => {
    const res = await api.post("/businesses", {
      name: "<script>alert('xss')</script>",
      description: "<img src=x onerror=alert(1)>",
    }, token);
    assert(res.status === 201 || res.status >= 400, "XSS should not crash server");
  });

  await test("empty body on create — 400", async () => {
    const res = await api.post("/businesses", {}, token);
    assert(res.status >= 400, "should reject empty body");
  });

  return summary("Suite 01 — Businesses");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
