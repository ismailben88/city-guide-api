/**
 * Master Test Runner — User Profile System
 *
 * Runs all profile test suites sequentially and prints a combined report.
 *
 * Prerequisites:
 *   - Backend running on http://localhost:5000  (or set API_URL env var)
 *   - Node 18+ (native fetch)
 *   - MongoDB seeded (any state — tests register their own temp users)
 *
 * Usage:
 *   node tests/run-all.js
 *   API_URL=http://localhost:5000/api/v1 node tests/run-all.js
 *   ADMIN_TOKEN=<jwt> node tests/run-all.js   (enables admin-only test cases)
 */

"use strict";

const { BASE } = require("./helpers/client");

const SUITES = [
  { name: "01 — Authentication",         module: "./profile/01_auth.test"         },
  { name: "02 — Profile CRUD",           module: "./profile/02_profile_crud.test" },
  { name: "03 — Password & Security",    module: "./profile/03_password_security.test" },
  { name: "04 — Notification Prefs",     module: "./profile/04_notifications.test" },
  { name: "05 — Authorization",          module: "./profile/05_authorization.test" },
];

async function main() {
  console.log("\n\x1b[1m\x1b[36m══════════════════════════════════════════════════════\x1b[0m");
  console.log("\x1b[1m\x1b[36m  City Guide — User Profile Test Suite\x1b[0m");
  console.log(`\x1b[1m\x1b[36m  API: ${BASE}\x1b[0m`);
  console.log("\x1b[1m\x1b[36m══════════════════════════════════════════════════════\x1b[0m");

  // Verify server is reachable before running anything
  try {
    const res = await fetch(`${BASE.replace("/api/v1", "")}/api/v1/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    console.log("\x1b[32m✓ Server reachable\x1b[0m\n");
  } catch {
    // Try auth/login as fallback health check
    try {
      await fetch(`${BASE}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      console.log("\x1b[32m✓ Server reachable\x1b[0m\n");
    } catch {
      console.error("\x1b[31m✗ Cannot reach server at " + BASE + "\x1b[0m");
      console.error("  Make sure the backend is running: cd backend && npm run dev");
      process.exit(1);
    }
  }

  let totalPassed = 0;
  let totalFailed = 0;
  const allFailures = [];

  for (const suite of SUITES) {
    try {
      const mod    = require(suite.module);
      const result = await mod.runAll();
      totalPassed += result.passed;
      totalFailed += result.failed;
      if (result.failures?.length) {
        allFailures.push(...result.failures.map((f) => ({ suite: suite.name, ...f })));
      }
    } catch (err) {
      console.error(`\n\x1b[31m✗ Suite "${suite.name}" crashed: ${err.message}\x1b[0m`);
      totalFailed++;
      allFailures.push({ suite: suite.name, name: "suite-level crash", error: err.message });
    }
  }

  // ── Final report ──────────────────────────────────────────────────────────
  const total = totalPassed + totalFailed;
  console.log("\n\x1b[1m\x1b[36m══════════════════════════════════════════════════════\x1b[0m");
  console.log("\x1b[1m  FINAL REPORT\x1b[0m");
  console.log("\x1b[1m\x1b[36m══════════════════════════════════════════════════════\x1b[0m");
  console.log(`  Total tests : ${total}`);
  console.log(`  \x1b[32mPassed      : ${totalPassed}\x1b[0m`);
  if (totalFailed) {
    console.log(`  \x1b[31mFailed      : ${totalFailed}\x1b[0m`);
    console.log("\n  Failed tests:");
    for (const f of allFailures) {
      console.log(`    \x1b[31m✗\x1b[0m [${f.suite}] ${f.name}`);
      console.log(`      \x1b[33m→ ${f.error}\x1b[0m`);
    }
  } else {
    console.log("  \x1b[32mAll tests passed!\x1b[0m");
  }
  console.log("\x1b[1m\x1b[36m══════════════════════════════════════════════════════\x1b[0m\n");

  process.exit(totalFailed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
