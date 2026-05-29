/**
 * TEST SUITE 01 — Contact Form
 *
 * Covers:
 *   POST /contact — submit contact message
 *   Field validation (name, email, subject, message)
 *   Email format validation
 *   Edge cases (XSS, long strings, missing fields)
 *
 * Usage: node tests/contact/01_contact.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

// ─────────────────────────────────────────────────────────────────────────────
async function runAll() {
  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-A  POST /contact — valid submission");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("submits valid contact message — 201", async () => {
    const res = await api.post("/contact", {
      name: "John Doe",
      email: "john@example.com",
      subject: "Test Subject",
      message: "This is a test message from the contact form.",
    });
    assertStatus(res, 201);
    assert(res.data.success || res.data.message, "should return success response");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-B  Field validation — missing required fields");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("missing name — 400", async () => {
    const res = await api.post("/contact", {
      email: "john@example.com",
      subject: "Test",
      message: "Test message",
    });
    assertStatus(res, 400);
  });

  await test("missing email — 400", async () => {
    const res = await api.post("/contact", {
      name: "John Doe",
      subject: "Test",
      message: "Test message",
    });
    assertStatus(res, 400);
  });

  await test("missing subject — 400", async () => {
    const res = await api.post("/contact", {
      name: "John Doe",
      email: "john@example.com",
      message: "Test message",
    });
    assertStatus(res, 400);
  });

  await test("missing message — 400", async () => {
    const res = await api.post("/contact", {
      name: "John Doe",
      email: "john@example.com",
      subject: "Test",
    });
    assertStatus(res, 400);
  });

  await test("empty body — 400", async () => {
    const res = await api.post("/contact", {});
    assertStatus(res, 400);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-C  Email format validation");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("invalid email (no @) — 400", async () => {
    const res = await api.post("/contact", {
      name: "John Doe",
      email: "notanemail",
      subject: "Test",
      message: "Test message",
    });
    assertStatus(res, 400);
  });

  await test("invalid email (no domain) — 400", async () => {
    const res = await api.post("/contact", {
      name: "John Doe",
      email: "user@",
      subject: "Test",
      message: "Test message",
    });
    assertStatus(res, 400);
  });

  await test("invalid email (no TLD) — 400", async () => {
    const res = await api.post("/contact", {
      name: "John Doe",
      email: "user@domain",
      subject: "Test",
      message: "Test message",
    });
    assertStatus(res, 400);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-D  Edge cases — XSS, long strings, special chars");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("XSS in message field — should be accepted/escaped", async () => {
    const res = await api.post("/contact", {
      name: "Hacker",
      email: "hacker@example.com",
      subject: "XSS Test",
      message: "<script>alert('xss')</script>",
    });
    // Should accept or sanitize — either way, no crash
    assert(res.status === 201 || res.status === 400, "XSS input should not crash server");
  });

  await test("HTML in message field", async () => {
    const res = await api.post("/contact", {
      name: "HTML User",
      email: "html@example.com",
      subject: "HTML Test",
      message: "<b>bold</b><i>italic</i>",
    });
    assert(res.status === 201 || res.status === 400, "HTML input should not crash server");
  });

  await test("very long name field (500+ chars)", async () => {
    const longName = "A".repeat(500);
    const res = await api.post("/contact", {
      name: longName,
      email: "long@example.com",
      subject: "Long Name Test",
      message: "Testing long name field.",
    });
    // Should either truncate or reject — but not crash
    assert(res.status === 201 || res.status === 400 || res.status === 413,
      "long name should not crash server");
  });

  await test("special unicode characters in message", async () => {
    const res = await api.post("/contact", {
      name: "José",
      email: "jose@example.com",
      subject: "Unicode Test",
      message: "Café résumé ñoño 🎉 中文 عربي",
    });
    assert(res.status === 201 || res.status === 400, "unicode should not crash server");
  });

  await test("very long message field (5000+ chars)", async () => {
    const longMsg = "Line of text.\n".repeat(400); // ~5200 chars
    const res = await api.post("/contact", {
      name: "Long Message",
      email: "longmsg@example.com",
      subject: "Long Message Test",
      message: longMsg,
    });
    assert(res.status === 201 || res.status === 400 || res.status === 413,
      "long message should not crash server");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("01-E  No auth required (public endpoint)");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("works without authentication token — 201", async () => {
    const res = await api.post("/contact", {
      name: "Public User",
      email: "public@example.com",
      subject: "Public Test",
      message: "This message is sent without auth.",
    });
    assert(res.status === 201, "public endpoint should accept submissions without auth");
  });

  return summary("Suite 01 — Contact Form");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
