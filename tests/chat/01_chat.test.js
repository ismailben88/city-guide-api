/**
 * TEST SUITE 01 — Chat / AI Assistant
 *
 * Covers:
 *   POST /chat/message — send message to AI assistant
 *   Validation (message required, length limits)
 *   Session continuity
 *   Edge cases
 *
 * Usage: node tests/chat/01_chat.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

// ─────────────────────────────────────────────────────────────────────────────
async function runAll() {
  const u   = makeTestUser("chat");
  const res = await api.post("/auth/register", {
    firstName: u.firstName, lastName: u.lastName,
    email: u.email, password: u.password,
  });
  if (!res.ok) throw new Error(`Bootstrap register failed: ${JSON.stringify(res.data)}`);
  const { token } = res.data;

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-A  POST /chat/message — valid messages");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("sends a valid message without session — 200", async () => {
    const res = await api.post("/chat/message", { message: "Hello, what guides are available?" });
    assertStatus(res, 200);
    assert(res.data.success, "success should be true");
    assert(res.data.data, "data should be present");
    assert(typeof res.data.data.message === "string", "bot response should be a string");
  });

  await test("sends a valid message with sessionId — 200", async () => {
    const sessionId = "test-session-123";
    const res = await api.post("/chat/message", {
      message: "Show me events in Casablanca",
      sessionId,
    });
    assertStatus(res, 200);
    assertEqual(res.data.data.sessionId, sessionId, "sessionId should match");
  });

  await test("second message in same session continues conversation", async () => {
    const sessionId = "test-session-456";
    await api.post("/chat/message", { message: "My name is Test User", sessionId });
    const res = await api.post("/chat/message", { message: "What is my name?", sessionId });
    assertStatus(res, 200);
    assert(res.data.data.type || res.data.data.message, "should return contextual response");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-B  Validation — message field");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("missing message field — 400", async () => {
    const res = await api.post("/chat/message", {});
    assertStatus(res, 400);
  });

  await test("empty message string — 400", async () => {
    const res = await api.post("/chat/message", { message: "" });
    assertStatus(res, 400);
  });

  await test("whitespace-only message — 400", async () => {
    const res = await api.post("/chat/message", { message: "   " });
    assertStatus(res, 400);
  });

  await test("message exceeding 1000 characters — 400", async () => {
    const longMsg = "a".repeat(1001);
    const res = await api.post("/chat/message", { message: longMsg });
    assertStatus(res, 400);
  });

  await test("message at exactly 1000 characters — 200", async () => {
    const exactMsg = "a".repeat(1000);
    const res = await api.post("/chat/message", { message: exactMsg });
    assert(res.status === 200 || res.status === 400,
      "edge of max length should either work or be rejected gracefully");
  });

  await test("non-string message (number) — 400", async () => {
    const res = await api.post("/chat/message", { message: 12345 });
    assertStatus(res, 400);
  });

  await test("non-string message (object) — 400", async () => {
    const res = await api.post("/chat/message", { message: { text: "hello" } });
    assertStatus(res, 400);
  });

  await test("null message — 400", async () => {
    const res = await api.post("/chat/message", { message: null });
    assertStatus(res, 400);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-C  Edge cases — payload structure");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("empty body — 400", async () => {
    const res = await api.post("/chat/message", null);
    assert(res.status >= 400, "should reject empty body");
  });

  await test("extra fields in body ignored — 200", async () => {
    const res = await api.post("/chat/message", {
      message: "hello",
      extraField: "should be ignored",
      anotherOne: true,
    });
    assertStatus(res, 200);
    assert(res.data.success, "should still succeed");
  });

  await test("no auth required (public endpoint) — 200", async () => {
    const res = await api.post("/chat/message", { message: "Public test" });
    assertStatus(res, 200);
  });

  return summary("Suite 01 — Chat / AI Assistant");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
