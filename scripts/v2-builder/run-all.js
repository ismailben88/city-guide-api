#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
//  run-all.js — Orchestrates the full v2 pipeline
//
//  Steps:
//    1. fetch-osm        (Overpass API → osm-<city>.json per city)
//    2. build-candidates (cap & prioritize → candidates.json)
//    3. enrich-wiki      (Wikipedia → wiki-cache.json)
//    4. fetch-images     (Commons + pools → images-cache.json, image-pools.json)
//    5. build-final      (merge all → output/places-final.json)
//    6. seed             (write to MongoDB city_guide_v2)
//
//  Each step is resumable (caches stay on disk).
//  Pass --skip-osm to skip step 1 if you already fetched.
// ─────────────────────────────────────────────────────────────────────────────
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const args = process.argv.slice(2);
const SKIP = new Set(args.filter(a => a.startsWith("--skip-")).map(a => a.replace("--skip-", "")));

const STEPS = [
  { id: "osm",        file: "1-fetch-osm.js",          label: "Fetch OSM (Overpass)" },
  { id: "cand",       file: "2-build-candidates.js",   label: "Build candidates (cap + prioritize)" },
  { id: "wiki",       file: "3-enrich-wiki.js",        label: "Enrich with Wikipedia" },
  { id: "images",     file: "4-fetch-images.js",       label: "Fetch images (Commons + pools)" },
  { id: "covers",     file: "4b-fetch-city-covers.js", label: "Fetch city cover images" },
  { id: "final",      file: "5-build-final.js",        label: "Build final places JSON" },
  { id: "seed",       file: "6-seed.js",               label: "Seed MongoDB city_guide_v2" },
];

const t0 = Date.now();
console.log("\n  ╔══════════════════════════════════════════════════════════╗");
console.log("  ║  City Guide V2 — Full Pipeline                           ║");
console.log("  ╚══════════════════════════════════════════════════════════╝\n");

for (const step of STEPS) {
  if (SKIP.has(step.id)) {
    console.log(`  ⏭  SKIP ${step.label}`);
    continue;
  }
  console.log(`\n  ▶ ${step.label}`);
  console.log(`    (${step.file})`);
  const tStep = Date.now();
  const r = spawnSync("node", [path.resolve(__dirname, step.file)], {
    stdio: "inherit",
  });
  const elapsed = ((Date.now() - tStep) / 1000 / 60).toFixed(1);
  if (r.status !== 0) {
    console.error(`\n  ✗ FAILED at step ${step.id} (exit ${r.status}). Aborting.`);
    process.exit(r.status || 1);
  }
  console.log(`  ✓ ${step.label} done in ${elapsed}min`);
}

const total = ((Date.now() - t0) / 1000 / 60).toFixed(1);
console.log(`\n  🎉 Pipeline finished in ${total}min`);
console.log("     Database: city_guide_v2");
console.log("     Connect: change DB_NAME in app to 'city_guide_v2'\n");
