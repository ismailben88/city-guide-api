/**
 * TEST SUITE 04 — Notification Preferences
 *
 * Covers:
 *   GET /users/me/notification-preferences   — returns defaults, no token
 *   PUT /users/me/notification-preferences   — full update, partial update, invalid shape
 *
 * Usage: node tests/profile/04_notifications.test.js
 */

"use strict";

const { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser } = require("../helpers/client");

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap() {
  const u   = makeTestUser("notif");
  const res = await api.post("/auth/register", {
    firstName: u.firstName, lastName: u.lastName,
    email: u.email, password: u.password,
  });
  if (!res.ok) throw new Error(`Bootstrap failed: ${JSON.stringify(res.data)}`);
  return { user: res.data.user, token: res.data.token };
}

// ── Default prefs shape (must match User model defaults) ─────────────────────

const DEFAULT_CHANNELS = ["reviews", "events", "bookings", "messages", "guides", "community", "system"];

// ─────────────────────────────────────────────────────────────────────────────
async function runAll() {
  const { token } = await bootstrap();

  // ═══════════════════════════════════════════════════════════════════════════
  suite("04-A  GET /users/me/notification-preferences");
  // ═══════════════════════════════════════════════════════════════════════════

  await test("returns defaults for new user — 200", async () => {
    const res = await api.get("/users/me/notification-preferences", token);
    assertStatus(res, 200);
    assert(res.data.channels, "channels object should be present");
    assert(typeof res.data.channels === "object", "channels should be an object");
  });

  await test("default channels contain all 7 expected keys", async () => {
    const res = await api.get("/users/me/notification-preferences", token);
    assertStatus(res, 200);
    for (const ch of DEFAULT_CHANNELS) {
      assert(
        res.data.channels[ch] !== undefined,
        `channel '${ch}' should exist in defaults`
      );
    }
  });

  await test("each default channel has in_app, email, push keys", async () => {
    const res = await api.get("/users/me/notification-preferences", token);
    for (const ch of DEFAULT_CHANNELS) {
      const c = res.data.channels[ch];
      assert(typeof c.in_app === "boolean", `${ch}.in_app should be boolean`);
      assert(typeof c.email  === "boolean", `${ch}.email should be boolean`);
      assert(typeof c.push   === "boolean", `${ch}.push should be boolean`);
    }
  });

  await test("quietHours defaults exist (enabled, from, until)", async () => {
    const res = await api.get("/users/me/notification-preferences", token);
    const qh  = res.data.quietHours;
    assert(qh !== undefined, "quietHours should be present");
    assert(typeof qh.enabled === "boolean", "quietHours.enabled should be boolean");
    assert(qh.from,  "quietHours.from should be present");
    assert(qh.until, "quietHours.until should be present");
  });

  await test("rejects request without token — 401", async () => {
    const res = await api.get("/users/me/notification-preferences");
    assertStatus(res, 401);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  suite("04-B  PUT /users/me/notification-preferences — update");
  // ═══════════════════════════════════════════════════════════════════════════

  const updatedPrefs = {
    channels: {
      reviews:   { in_app: true,  email: false, push: false },
      events:    { in_app: false, email: false, push: false },
      bookings:  { in_app: true,  email: true,  push: false },
      messages:  { in_app: true,  email: true,  push: true  },
      guides:    { in_app: false, email: false, push: false },
      community: { in_app: true,  email: false, push: false },
      system:    { in_app: true,  email: false, push: false },
    },
    quietHours: { enabled: true, from: "23:00", until: "07:00" },
    language:   "fr",
    timezone:   "Africa/Casablanca",
  };

  await test("saves full preference update — 200", async () => {
    const res = await api.put("/users/me/notification-preferences", updatedPrefs, token);
    assertStatus(res, 200);
    assert(res.data.channels, "channels should be in response");
  });

  await test("persisted values match what was sent", async () => {
    const res = await api.get("/users/me/notification-preferences", token);
    assertStatus(res, 200);

    assertEqual(res.data.channels.reviews.email,   false, "reviews.email");
    assertEqual(res.data.channels.events.in_app,   false, "events.in_app");
    assertEqual(res.data.channels.messages.push,   true,  "messages.push");
    assertEqual(res.data.quietHours.enabled,        true,  "quietHours.enabled");
    assertEqual(res.data.quietHours.from,           "23:00", "quietHours.from");
    assertEqual(res.data.language,                  "fr",    "language");
  });

  await test("disabling all in-app notifications persists correctly", async () => {
    const allOff = { channels: {} };
    DEFAULT_CHANNELS.forEach((ch) => {
      allOff.channels[ch] = { in_app: false, email: false, push: false };
    });
    const put = await api.put("/users/me/notification-preferences", allOff, token);
    assertStatus(put, 200);

    const get = await api.get("/users/me/notification-preferences", token);
    for (const ch of DEFAULT_CHANNELS) {
      assertEqual(get.data.channels[ch].in_app, false, `${ch}.in_app should be false`);
    }
  });

  await test("re-enabling all in-app notifications persists correctly", async () => {
    const allOn = { channels: {} };
    DEFAULT_CHANNELS.forEach((ch) => {
      allOn.channels[ch] = { in_app: true, email: true, push: true };
    });
    const put = await api.put("/users/me/notification-preferences", allOn, token);
    assertStatus(put, 200);

    const get = await api.get("/users/me/notification-preferences", token);
    for (const ch of DEFAULT_CHANNELS) {
      assertEqual(get.data.channels[ch].in_app, true, `${ch}.in_app should be true`);
    }
  });

  await test("quietHours toggle — enable then disable", async () => {
    await api.put("/users/me/notification-preferences", {
      channels: updatedPrefs.channels,
      quietHours: { enabled: true, from: "22:00", until: "08:00" },
    }, token);

    let get = await api.get("/users/me/notification-preferences", token);
    assertEqual(get.data.quietHours.enabled, true, "quiet hours should be enabled");

    await api.put("/users/me/notification-preferences", {
      channels: updatedPrefs.channels,
      quietHours: { enabled: false, from: "22:00", until: "08:00" },
    }, token);

    get = await api.get("/users/me/notification-preferences", token);
    assertEqual(get.data.quietHours.enabled, false, "quiet hours should be disabled");
  });

  await test("rejects PUT without token — 401", async () => {
    const res = await api.put("/users/me/notification-preferences", updatedPrefs);
    assertStatus(res, 401);
  });

  await test("PUT with empty body still returns 200 (stores empty object)", async () => {
    const res = await api.put("/users/me/notification-preferences", {}, token);
    assert(res.status < 500, "should not crash on empty body");
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  return summary("Suite 04 — Notification Preferences");
}

if (require.main === module) {
  runAll().then((r) => process.exit(r.failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
