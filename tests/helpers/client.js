/**
 * Lightweight HTTP test client — no external dependencies.
 * Requires Node 18+ (native fetch).
 */

const BASE = process.env.API_URL || "http://localhost:5000/api/v1";

// ── Core request ──────────────────────────────────────────────────────────────

async function request(method, path, { body, token, form } = {}) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let reqBody;
  if (form) {
    reqBody = form; // FormData — browser/node FormData, no Content-Type header
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    reqBody = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, { method, headers, body: reqBody });

  let data;
  const ct = res.headers.get("content-type") || "";
  try { data = ct.includes("json") ? await res.json() : await res.text(); }
  catch { data = null; }

  return { status: res.status, ok: res.ok, data };
}

const api = {
  get:    (path, token)        => request("GET",    path, { token }),
  post:   (path, body, token)  => request("POST",   path, { body, token }),
  put:    (path, body, token)  => request("PUT",    path, { body, token }),
  patch:  (path, body, token)  => request("PATCH",  path, { body, token }),
  delete: (path, token)        => request("DELETE",  path, { token }),
  upload: (path, form, token)  => request("POST",   path, { form, token }),
};

// ── Assertion helpers ─────────────────────────────────────────────────────────

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

function assertEqual(actual, expected, label = "") {
  if (actual !== expected)
    throw new Error(`${label ? label + ": " : ""}expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assertStatus(res, expected) {
  if (res.status !== expected)
    throw new Error(
      `Expected HTTP ${expected}, got ${res.status}. Body: ${JSON.stringify(res.data)?.slice(0, 200)}`
    );
}

// ── Simple test runner ────────────────────────────────────────────────────────

let _passed = 0;
let _failed = 0;
const _failures = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    _passed++;
  } catch (err) {
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    \x1b[33m→ ${err.message}\x1b[0m`);
    _failed++;
    _failures.push({ name, error: err.message });
  }
}

function suite(name) {
  console.log(`\n\x1b[1m${name}\x1b[0m`);
}

function summary(suiteName) {
  const total = _passed + _failed;
  const color = _failed ? "\x1b[31m" : "\x1b[32m";
  console.log(
    `\n${color}${suiteName}: ${_passed}/${total} passed${_failed ? `, ${_failed} failed` : ""}\x1b[0m`
  );
  return { passed: _passed, failed: _failed, failures: _failures };
}

// ── Unique test user factory ──────────────────────────────────────────────────

function makeTestUser(tag = "") {
  const ts = Date.now();
  return {
    firstName: "Test",
    lastName:  "User",
    email:     `testuser_${tag}_${ts}@cityguide.test`,
    password:  "TestPass1!",
  };
}

module.exports = { api, assert, assertEqual, assertStatus, test, suite, summary, makeTestUser, BASE };
