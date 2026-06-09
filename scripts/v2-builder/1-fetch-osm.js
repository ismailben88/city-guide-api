#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
//  1-fetch-osm.js — Fetches POIs from OpenStreetMap (Overpass API) per city
//
//  Output: cache/osm-<city-key>.json (one file per city)
//  Resumable: skips cities already cached. Delete a file to refetch.
//
//  Usage:
//    node backend/scripts/v2-builder/1-fetch-osm.js
//    node backend/scripts/v2-builder/1-fetch-osm.js --only=marrakech,fes
//    node backend/scripts/v2-builder/1-fetch-osm.js --refresh
// ─────────────────────────────────────────────────────────────────────────────
"use strict";

const fs   = require("fs");
const path = require("path");
const CITIES   = require("./data/cities-45");
const { buildOverpassQuery, matchCategory } = require("./data/osm-mapping");

const CACHE_DIR = path.resolve(__dirname, "cache");
const ARGS      = process.argv.slice(2);
const REFRESH   = ARGS.includes("--refresh");
const ONLY      = (ARGS.find(a => a.startsWith("--only=")) || "").replace("--only=", "");
const ONLY_SET  = ONLY ? new Set(ONLY.split(",")) : null;

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpass(query, attempt = 0) {
  const endpoint = OVERPASS_ENDPOINTS[attempt % OVERPASS_ENDPOINTS.length];
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "CityGuideV2/1.0" },
      body: "data=" + encodeURIComponent(query),
      signal: AbortSignal.timeout(120000),
    });
    if (res.status === 429 || res.status >= 500) {
      if (attempt < 5) {
        const wait = 5000 + attempt * 5000;
        console.log(`   ⏳ HTTP ${res.status} — retry in ${wait/1000}s [${endpoint}]`);
        await sleep(wait);
        return overpass(query, attempt + 1);
      }
      return null;
    }
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    if (attempt < 5) {
      const wait = 5000 + attempt * 5000;
      console.log(`   ⏳ ${e.message} — retry in ${wait/1000}s [${endpoint}]`);
      await sleep(wait);
      return overpass(query, attempt + 1);
    }
    return null;
  }
}

function slugify(s) {
  return String(s).toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function pickName(tags) {
  return tags["name:en"] || tags["name"] || tags["name:fr"] || tags["name:ar"] || null;
}

function pickAddress(tags) {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:neighbourhood"] || tags["addr:suburb"],
    tags["addr:city"],
  ].filter(Boolean);
  return parts.join(", ");
}

function processElement(el, cityKey) {
  const tags = el.tags || {};
  const name = pickName(tags);
  if (!name || name.length < 3 || name.length > 120) return null;

  const category = matchCategory(tags);
  if (!category) return null;

  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!lat || !lng) return null;

  return {
    osm_id:    `${el.type}/${el.id}`,
    name,
    name_fr:   tags["name:fr"] || null,
    name_ar:   tags["name:ar"] || null,
    slug:      slugify(`${name}-${cityKey}`).slice(0, 100),
    category,
    city:      cityKey,
    address:   pickAddress(tags),
    location:  { type: "Point", coordinates: [+lng.toFixed(6), +lat.toFixed(6)] },
    osm_tags:  tags,
    wikidata:  tags["wikidata"] || null,
    wikipedia: tags["wikipedia"] || null,
    website:   tags["website"] || tags["contact:website"] || null,
    phone:     tags["phone"] || tags["contact:phone"] || null,
    stars:     tags["stars"] ? parseInt(tags["stars"]) : null,
    opening_hours: tags["opening_hours"] || null,
  };
}

async function fetchCity(city) {
  const cachePath = path.join(CACHE_DIR, `osm-${city.key}.json`);

  if (!REFRESH && fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    console.log(`   ✓ ${city.name.padEnd(20)} (cached ${cached.places.length} places)`);
    return cached.places.length;
  }

  const [lng, lat] = city.location.coordinates;
  const radius = city.key === "merzouga" || city.key === "mhamid" || city.key === "dakhla" ? 50000 : 25000;
  const query = buildOverpassQuery(lat, lng, radius);

  const t0 = Date.now();
  process.stdout.write(`   ▶ ${city.name.padEnd(20)} fetching…`);
  const data = await overpass(query);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  if (!data || !data.elements) {
    console.log(` ✗ failed (${elapsed}s)`);
    return 0;
  }

  const seen = new Set();
  const places = [];
  for (const el of data.elements) {
    const p = processElement(el, city.key);
    if (!p) continue;
    if (seen.has(p.slug)) continue;
    seen.add(p.slug);
    places.push(p);
  }

  fs.writeFileSync(cachePath, JSON.stringify({
    city: city.key,
    fetched_at: new Date().toISOString(),
    raw_count: data.elements.length,
    places,
  }, null, 2));

  console.log(` ✓ ${String(places.length).padStart(4)} places (${data.elements.length} raw) in ${elapsed}s`);
  return places.length;
}

async function main() {
  const targets = ONLY_SET
    ? CITIES.filter(c => ONLY_SET.has(c.key))
    : CITIES;

  console.log("\n  ╔══════════════════════════════════════════════════════════╗");
  console.log("  ║  OSM Overpass Fetcher — City Guide V2                    ║");
  console.log("  ║  Source: OpenStreetMap via Overpass API (free, no key)   ║");
  console.log(`  ║  Cities: ${String(targets.length).padEnd(48)}║`);
  console.log("  ╚══════════════════════════════════════════════════════════╝\n");

  let totalPlaces = 0;
  const t0 = Date.now();

  for (let i = 0; i < targets.length; i++) {
    const city = targets[i];
    console.log(`  [${String(i+1).padStart(2)}/${targets.length}]`);
    const count = await fetchCity(city);
    totalPlaces += count;
    await sleep(1500);
  }

  const elapsed = ((Date.now() - t0) / 1000 / 60).toFixed(1);
  console.log("\n  ══════════════════════════════════════════════════════════");
  console.log(`  ✅ DONE — ${totalPlaces} places across ${targets.length} cities in ${elapsed}min`);
  console.log("  Next: node backend/scripts/v2-builder/2-enrich-wiki.js");
  console.log("  ══════════════════════════════════════════════════════════\n");
}

main().catch(e => { console.error("✗ Fatal:", e); process.exit(1); });
