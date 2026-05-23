/**
 * RUN ALL home page test suites sequentially.
 *
 * Usage:
 *   node tests/home/run-all.js
 */

"use strict";

async function main() {
  const suites = [
    require("./04_home_places"),
    require("./05_home_categories"),
    require("./06_home_cities"),
    require("./07_home_events"),
    require("./08_home_guides"),
    require("./09_home_auth"),
  ];

  const results = [];
  for (const mod of suites) {
    try {
      const r = await mod.runAll();
      results.push(r);
    } catch (err) {
      console.error(`\n  ✗ Suite runner threw: ${err.message}`);
      results.push({ passed: 0, failed: 1, failures: [{ name: "suite-error", error: err.message }] });
    }
  }

  const totalPassed = results.reduce((s, r) => s + r.passed, 0);
  const totalFailed = results.reduce((s, r) => s + r.failed, 0);
  const totalTests  = totalPassed + totalFailed;

  console.log(`\n\x1b[1m══════════════════════════════════════════\x1b[0m`);
  console.log(`\x1b[1m  HOME PAGE API: ${totalPassed}/${totalTests} passed${totalFailed ? `, ${totalFailed} failed` : ""}\x1b[0m`);
  console.log(`\x1b[1m══════════════════════════════════════════\x1b[0m`);

  if (totalFailed) {
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
