/**
 * TEST SUITE 01 — Media Upload & Approval Lifecycle
 *
 * Covers:
 *   GET   /media                  — list (public)
 *   POST  /media                  — upload (auth required)
 *   PATCH /media/:id/approve      — admin only
 *   PATCH /media/:id/reject       — admin only
 *   DELETE /media/:id             — admin only
 *   Edge cases & full lifecycle
 *
 * Usage: node tests/media/01_media.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

// ── Tiny 1x1 valid PNG ─────────────────────────────────────────────────────────

const TINY_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a4944" +
  "4154789c6260000000020001e221bc330000000049454e44ae426082",
  "hex"
);

function buildImageForm(parentId = "000000000000000000000000", parentType = "Place", caption = "") {
  const form = new FormData();
  const blob = new Blob([TINY_PNG], { type: "image/png" });
  form.append("file", blob, "media.png");
  form.append("parentType", parentType);
  form.append("parentId", parentId);
  if (caption) form.append("caption", caption);
  return form;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap() {
  const u   = makeTestUser("media");
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
  const adminToken = process.env.ADMIN_TOKEN || null;

  let uploadedMediaId = null;
  const testParentId = "000000000000000000000000";

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-A  GET /media");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns a list (possibly empty) without token — 200", async () => {
    const res = await api.get("/media?parentType=Place&parentId=" + testParentId);
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("returns a list with token — 200", async () => {
    const res = await api.get("/media?parentType=Place&parentId=" + testParentId, token);
    assertStatus(res, 200);
    assert(Array.isArray(res.data), "should return an array");
  });

  await test("returns empty array when no media exists", async () => {
    const res = await api.get("/media?parentType=Place&parentId=" + testParentId);
    assertStatus(res, 200);
    assertEqual(res.data.length, 0, "should be empty array");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-B  POST /media — upload");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("uploads image with valid data — 201", async () => {
    const form = buildImageForm(testParentId, "Place", "Test caption");
    const res  = await api.upload("/media", form, token);
    assertStatus(res, 201);
    assert(res.data._id || res.data.id, "should return media id");
    assertEqual(res.data.parentType, "Place", "parentType");
    assertEqual(res.data.parentId, testParentId, "parentId");
    assertEqual(res.data.caption, "Test caption", "caption");
    uploadedMediaId = res.data._id || res.data.id;
  });

  await test("rejects upload without file — 400", async () => {
    const emptyForm = new FormData();
    emptyForm.append("parentType", "Place");
    emptyForm.append("parentId", testParentId);
    const res = await api.upload("/media", emptyForm, token);
    assertStatus(res, 400);
  });

  await test("rejects upload without auth — 401", async () => {
    const form = buildImageForm(testParentId);
    const res  = await api.upload("/media", form);
    assertStatus(res, 401);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-C  PATCH /media/:id/approve — admin only");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects approve without auth — 401", async () => {
    if (!uploadedMediaId) return console.log("    \x1b[33m\u26a0 skip: no media to approve\x1b[0m");
    const res = await api.patch(`/media/${uploadedMediaId}/approve`);
    assertStatus(res, 401);
  });

  await test("regular user cannot approve media — 403", async () => {
    if (!uploadedMediaId) return console.log("    \x1b[33m\u26a0 skip: no media to approve\x1b[0m");
    const res = await api.patch(`/media/${uploadedMediaId}/approve`, {}, token);
    assertStatus(res, 403);
  });

  if (adminToken) {
    await test("[ADMIN] approves media — 200", async () => {
      if (!uploadedMediaId) return console.log("    \x1b[33m\u26a0 skip: no media to approve\x1b[0m");
      const res = await api.patch(`/media/${uploadedMediaId}/approve`, {}, adminToken);
      assertStatus(res, 200);
      assertEqual(res.data.status || res.data.approved, "approved", "status should be approved");
    });
  } else {
    console.log("  \x1b[33m\u26a0 Admin tests skipped (01-C) — set ADMIN_TOKEN env var\x1b[0m");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-D  PATCH /media/:id/reject — admin only");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects reject without auth — 401", async () => {
    if (!uploadedMediaId) return console.log("    \x1b[33m\u26a0 skip: no media id\x1b[0m");
    const res = await api.patch(`/media/${uploadedMediaId}/reject`);
    assertStatus(res, 401);
  });

  await test("regular user cannot reject media — 403", async () => {
    if (!uploadedMediaId) return console.log("    \x1b[33m\u26a0 skip: no media id\x1b[0m");
    const res = await api.patch(`/media/${uploadedMediaId}/reject`, {}, token);
    assertStatus(res, 403);
  });

  if (adminToken) {
    await test("[ADMIN] rejects media — 200", async () => {
      if (!uploadedMediaId) return console.log("    \x1b[33m\u26a0 skip: no media id\x1b[0m");
      const res = await api.patch(`/media/${uploadedMediaId}/reject`, {}, adminToken);
      assertStatus(res, 200);
      assertEqual(res.data.status || res.data.approved, "rejected", "status should be rejected");
    });
  } else {
    console.log("  \x1b[33m\u26a0 Admin tests skipped (01-D) — set ADMIN_TOKEN env var\x1b[0m");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-E  DELETE /media/:id — admin only");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("rejects delete without auth — 401", async () => {
    if (!uploadedMediaId) return console.log("    \x1b[33m\u26a0 skip: no media id\x1b[0m");
    const res = await api.delete(`/media/${uploadedMediaId}`);
    assertStatus(res, 401);
  });

  await test("regular user cannot delete media — 403", async () => {
    if (!uploadedMediaId) return console.log("    \x1b[33m\u26a0 skip: no media id\x1b[0m");
    const res = await api.delete(`/media/${uploadedMediaId}`, token);
    assertStatus(res, 403);
  });

  if (adminToken) {
    await test("[ADMIN] deletes media — 200", async () => {
      if (!uploadedMediaId) return console.log("    \x1b[33m\u26a0 skip: no media id\x1b[0m");
      const res = await api.delete(`/media/${uploadedMediaId}`, adminToken);
      assertStatus(res, 200);
      assert(res.data.message, "should return confirmation message");
    });
  } else {
    console.log("  \x1b[33m\u26a0 Admin tests skipped (01-E) — set ADMIN_TOKEN env var\x1b[0m");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-F  Edge cases");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("GET /media/:id returns 404 for non-existent ObjectId", async () => {
    const res = await api.get("/media/000000000000000000000000");
    assertStatus(res, 404);
  });

  await test("GET /media/:id returns 4xx for invalid id format", async () => {
    const res = await api.get("/media/not-a-valid-id");
    assert(res.status >= 400, "should reject malformed ObjectId");
  });

  await test("PATCH /media/:id/approve returns 404 for non-existent id", async () => {
    if (!adminToken) return console.log("    \x1b[33m\u26a0 skip: no ADMIN_TOKEN\x1b[0m");
    const res = await api.patch("/media/000000000000000000000000/approve", {}, adminToken);
    assertStatus(res, 404);
  });

  await test("PATCH /media/:id/reject returns 404 for non-existent id", async () => {
    if (!adminToken) return console.log("    \x1b[33m\u26a0 skip: no ADMIN_TOKEN\x1b[0m");
    const res = await api.patch("/media/000000000000000000000000/reject", {}, adminToken);
    assertStatus(res, 404);
  });

  await test("DELETE /media/:id returns 404 for non-existent id", async () => {
    if (!adminToken) return console.log("    \x1b[33m\u26a0 skip: no ADMIN_TOKEN\x1b[0m");
    const res = await api.delete("/media/000000000000000000000000", adminToken);
    assertStatus(res, 404);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-G  Full lifecycle — upload → approve → list → reject");
  // ═══════════════════════════════════════════════════════════════════════════

  if (adminToken) {
    let lifecycleMediaId = null;

    await test("[LIFECYCLE] guest uploads media — 201", async () => {
      const form = buildImageForm(testParentId, "Place", "Lifecycle test");
      const res  = await api.upload("/media", form, token);
      assertStatus(res, 201);
      lifecycleMediaId = res.data._id || res.data.id;
    });

    await test("[LIFECYCLE] admin approves — 200", async () => {
      const res = await api.patch(`/media/${lifecycleMediaId}/approve`, {}, adminToken);
      assertStatus(res, 200);
    });

    await test("[LIFECYCLE] media appears in GET list", async () => {
      const res = await api.get("/media?parentType=Place&parentId=" + testParentId);
      assertStatus(res, 200);
      const found = res.data.find(m => (m._id || m.id) === lifecycleMediaId);
      assert(found, "approved media should be visible in GET list");
    });

    await test("[LIFECYCLE] admin rejects — 200", async () => {
      const res = await api.patch(`/media/${lifecycleMediaId}/reject`, {}, adminToken);
      assertStatus(res, 200);
    });

    await test("[LIFECYCLE] admin deletes — 200", async () => {
      const res = await api.delete(`/media/${lifecycleMediaId}`, adminToken);
      assertStatus(res, 200);
    });
  } else {
    console.log("  \x1b[33m\u26a0 Lifecycle tests skipped (01-G) — set ADMIN_TOKEN env var\x1b[0m");
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  return summary("Suite 01 — Media");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
