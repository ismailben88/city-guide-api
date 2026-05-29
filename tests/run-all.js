/**
 * Master Test Runner — City Guide Backend
 *
 * Runs all test suites sequentially and prints a combined report.
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
  // ── Profile System ───────────────────────────────────────────────────────
  { name: "01 — Authentication",              module: "./profile/01_auth.test"              },
  { name: "02 — Profile CRUD",                module: "./profile/02_profile_crud.test"      },
  { name: "03 — Password & Security",         module: "./profile/03_password_security.test" },
  { name: "04 — Notification Prefs",          module: "./profile/04_notifications.test"     },
  { name: "05 — Authorization",               module: "./profile/05_authorization.test"     },
  { name: "06 — Auth Extended",               module: "./profile/06_auth_extended.test"     },
  // ── Places ───────────────────────────────────────────────────────────────
  { name: "07 — Places CRUD",                 module: "./places/01_places_crud.test"        },
  { name: "08 — Places Search & Discovery",   module: "./places/02_places_search.test"      },
  // ── Events ───────────────────────────────────────────────────────────────
  { name: "09 — Events CRUD",                 module: "./events/01_events_crud.test"        },
  // ── Cities ───────────────────────────────────────────────────────────────
  { name: "10 — Cities CRUD",                 module: "./cities/01_cities.test"             },
  // ── Categories ───────────────────────────────────────────────────────────
  { name: "11 — Categories CRUD",             module: "./categories/01_categories.test"     },
  // ── Comments ─────────────────────────────────────────────────────────────
  { name: "12 — Comments CRUD",               module: "./comments/01_comments.test"         },
  // ── Favorites ────────────────────────────────────────────────────────────
  { name: "13 — Favorites CRUD",              module: "./favorites/01_favorites.test"       },
  // ── Search ───────────────────────────────────────────────────────────────
  { name: "14 — Cross-Resource Search",       module: "./search/01_search.test"             },
  // ── Media ────────────────────────────────────────────────────────────────
  { name: "15 — Media Upload",                module: "./media/01_media.test"               },
  // ── Scores ───────────────────────────────────────────────────────────────
  { name: "16 — Scores & Ratings",            module: "./scores/01_scores.test"             },
  // ── Notifications API ────────────────────────────────────────────────────
  { name: "17 — Notifications API",           module: "./notifications/01_notifications_api.test" },
  // ── Contact ──────────────────────────────────────────────────────────────
  { name: "18 — Contact Form",                module: "./contact/01_contact.test"           },
  // ── Chat ─────────────────────────────────────────────────────────────────
  { name: "19 — Chat / AI Assistant",         module: "./chat/01_chat.test"                 },
  // ── Businesses ───────────────────────────────────────────────────────────
  { name: "20 — Businesses",                  module: "./businesses/01_businesses.test"     },
  // ── Admin ────────────────────────────────────────────────────────────────
  { name: "21 — Admin Dashboard",             module: "./admin/01_admin.test"               },
  { name: "22 — Admin Extended",              module: "./admin/02_admin_extended.test"      },
  { name: "23 — Admin Reports",               module: "./admin/03_admin_reports.test"       },
  // ── Home Page ────────────────────────────────────────────────────────────
  { name: "24 — Home Places",                 module: "./home/04_home_places.test"          },
  { name: "25 — Home Categories",             module: "./home/05_home_categories.test"      },
  { name: "26 — Home Cities",                 module: "./home/06_home_cities.test"          },
  { name: "27 — Home Events",                 module: "./home/07_home_events.test"          },
  { name: "28 — Home Guides",                 module: "./home/08_home_guides.test"          },
  { name: "29 — Home Auth",                   module: "./home/09_home_auth.test"            },
];

async function main() {
  console.log("\n\x1b[1m\x1b[36m══════════════════════════════════════════════════════\x1b[0m");
  console.log("\x1b[1m\x1b[36m  City Guide — Backend Integration Test Suite\x1b[0m");
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
