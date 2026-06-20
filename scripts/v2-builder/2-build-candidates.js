#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
//  2-build-candidates.js — Caps + prioritizes raw OSM into final candidate set
//
//  Why: OSM returns 1000-3000 places per city. We need to cap to ~80-150 per
//  city (user requested volume max). This script picks the best candidates.
//
//  Priority within a (city, category) group:
//    1. has wikidata QID (best — Wikipedia article exists)
//    2. has wikipedia tag
//    3. has website + phone (verified businesses)
//    4. has website
//    5. has phone
//    6. has name longer than 4 chars (filter generics)
//    7. by random
//
//  Caps:
//    - max 25 per category per city (most categories)
//    - max 8 for "restaurants" "cafes" "hotels" "riads" (too generic to spam)
//    - target overall ~100-200 places per city
//
//  Output: cache/candidates.json
// ─────────────────────────────────────────────────────────────────────────────
"use strict";

const fs   = require("fs");
const path = require("path");
const CITIES = require("./data/cities-45");

const CACHE_DIR  = path.resolve(__dirname, "cache");
const OUT_FILE   = path.join(CACHE_DIR, "candidates.json");

// Caps per category type
const CAP_DEFAULT  = 25;
const CAPS = {
  restaurants: 30, cafes: 25, hotels: 20, riads: 15,
  "moroccan-cuisine": 15, "fine-dining": 10, seafood: 10,
  "rooftop-cafes": 10, "traditional-cafes": 10, "specialty-coffee": 10,
  "luxury-hotels": 10, "boutique-hotels": 10, "eco-lodges": 8,
  "luxury-riads": 10, "heritage-riads": 10, "guesthouse-riads": 10,
  medinas: 12, "palaces-kasbahs": 12, "roman-ruins": 8, "historical-sites": 15,
  "art-museums": 8, "history-museums": 8, "craft-museums": 6,
  beaches: 10, "atlantic-beaches": 8, "med-beaches": 6, "surf-spots": 6,
  mountains: 12, waterfalls: 6, "national-parks": 10,
  "desert-camps": 8, "camel-trekking": 5, "sand-dunes": 5,
  souks: 8, "berber-crafts": 8, "argan-products": 8,
  hammams: 6, "luxury-spas": 6, "yoga-retreats": 5,
  "bars-lounges": 8, "live-music": 5, clubs: 5,
  "hiking-trekking": 8, kitesurfing: 5, golf: 5,
  "coworking-spaces": 5, "startup-hubs": 3, "business-centers": 5,
  "city-tours": 5, "desert-tours": 5, "food-tours": 5,
  "sunset-spots": 8, "rooftop-views": 5, "street-photography": 3,
  "theme-parks": 5, "kids-activities": 8, "family-beaches": 5,
  mosques: 12, mausoleums: 8, medersas: 6,
  "contemporary-art": 6, "artisan-workshops": 8, "street-art": 3,
  "street-food-stalls": 8, "food-markets": 8, bakeries: 8,
  shopping: 10, wellness: 8, nightlife: 6, sports: 8, coworking: 5,
  tours: 5, photography: 5, family: 5, "religious-sites": 8,
  "art-galleries": 6, "local-food": 12, desert: 5, nature: 10,
};

function priorityScore(p) {
  let score = 0;
  if (p.wikidata)              score += 1000;
  if (p.wikipedia)             score += 800;
  if (p.website && p.phone)    score += 500;
  else if (p.website)          score += 300;
  else if (p.phone)            score += 200;
  if (p.stars)                 score += 100;
  if (p.name.length >= 6)      score += 30;
  if (p.address)               score += 20;
  if (p.opening_hours)         score += 10;
  if (p.name_fr || p.name_ar)  score += 50;
  // Penalize very generic names that look like ATMs/shops
  if (/^(atm|pharmacie|station|caf[eé]|h[oô]tel)$/i.test(p.name)) score -= 200;
  return score;
}

function isGarbageName(name) {
  if (!name || name.length < 3) return true;
  if (/^\d+$/.test(name)) return true;
  if (/^(test|none|null|n\/a|tbd)$/i.test(name)) return true;
  return false;
}

function dedupe(places) {
  const byNorm = new Map();
  for (const p of places) {
    const norm = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const existing = byNorm.get(norm);
    if (!existing) { byNorm.set(norm, p); continue; }
    // Keep the one with more data
    if (priorityScore(p) > priorityScore(existing)) byNorm.set(norm, p);
  }
  return [...byNorm.values()];
}

function main() {
  const allCandidates = [];
  const stats = { cities: 0, raw: 0, kept: 0 };
  const breakdown = {};

  for (const city of CITIES) {
    const cachePath = path.join(CACHE_DIR, `osm-${city.key}.json`);
    if (!fs.existsSync(cachePath)) {
      console.log(`   ⚠ ${city.name.padEnd(20)} no cache — run 1-fetch-osm.js first`);
      continue;
    }
    stats.cities++;
    const data = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    stats.raw += data.places.length;

    // Group by category, filter garbage, dedupe, sort, cap
    const grouped = {};
    for (const p of data.places) {
      if (isGarbageName(p.name)) continue;
      (grouped[p.category] = grouped[p.category] || []).push(p);
    }

    const cityKept = [];
    for (const [cat, items] of Object.entries(grouped)) {
      const deduped = dedupe(items).sort((a, b) => priorityScore(b) - priorityScore(a));
      const cap = CAPS[cat] || CAP_DEFAULT;
      const top = deduped.slice(0, cap);
      cityKept.push(...top);
    }

    stats.kept += cityKept.length;
    console.log(`   ${city.name.padEnd(20)} ${String(data.places.length).padStart(5)} raw → ${String(cityKept.length).padStart(4)} kept`);

    for (const p of cityKept) {
      breakdown[p.category] = (breakdown[p.category] || 0) + 1;
    }
    allCandidates.push(...cityKept);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify({
    built_at: new Date().toISOString(),
    cities: stats.cities,
    raw_total: stats.raw,
    kept_total: stats.kept,
    breakdown,
    candidates: allCandidates,
  }, null, 2));

  console.log("\n  ══════════════════════════════════════════════════════════");
  console.log(`  ✅ ${stats.cities} cities · ${stats.raw} raw → ${stats.kept} candidates`);
  console.log("\n  Top 20 categories by volume:");
  const sortedCats = Object.entries(breakdown).sort((a,b) => b[1]-a[1]);
  for (const [cat, n] of sortedCats.slice(0, 20)) {
    console.log(`    ${cat.padEnd(25)} ${n}`);
  }
  console.log(`\n  Saved: ${OUT_FILE}`);
  console.log("  Next: node backend/scripts/v2-builder/3-enrich-wiki.js");
  console.log("  ══════════════════════════════════════════════════════════\n");
}

main();
