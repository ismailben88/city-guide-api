#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
//  4-fetch-images.js — Fills missing images using Wikimedia Commons + curated
//
//  Strategy (in order):
//    1. Wiki-enriched places already have images from 3-enrich-wiki — keep
//    2. Try Wikimedia Commons SEARCH by "place_name city_name Morocco"
//    3. Build per-(city,category) image pools from Commons category search
//    4. For places with no image, assign one from the (city,category) pool
//       round-robin, then (Morocco,category) pool as ultimate fallback
//
//  Output: cache/images-cache.json (per-place image map)
//          cache/image-pools.json   (per-city-category pools)
// ─────────────────────────────────────────────────────────────────────────────
"use strict";

const fs   = require("fs");
const path = require("path");
const CITIES = require("./data/cities-45");
const POOL_QUERIES = require("./data/image-pool-queries");

const CACHE_DIR  = path.resolve(__dirname, "cache");
const IMG_FILE   = path.join(CACHE_DIR, "images-cache.json");
const POOL_FILE  = path.join(CACHE_DIR, "image-pools.json");
const CAND_FILE  = path.join(CACHE_DIR, "candidates.json");
const WIKI_FILE  = path.join(CACHE_DIR, "wiki-cache.json");

const ARGS = process.argv.slice(2);
const REFRESH = ARGS.includes("--refresh");

const imgCache  = REFRESH ? {} : (fs.existsSync(IMG_FILE)  ? JSON.parse(fs.readFileSync(IMG_FILE,  "utf8")) : {});
const poolCache = REFRESH ? {} : (fs.existsSync(POOL_FILE) ? JSON.parse(fs.readFileSync(POOL_FILE, "utf8")) : {});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let saveTimer = null;
function saveDebounced() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFileSync(IMG_FILE,  JSON.stringify(imgCache,  null, 2));
    fs.writeFileSync(POOL_FILE, JSON.stringify(poolCache, null, 2));
  }, 2000);
}

// ── Commons search: returns array of full image URLs ────────────────────────
async function commonsSearch(query, limit = 8, attempt = 0) {
  try {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", `${query} filetype:bitmap|drawing -fileres:0`);
    url.searchParams.set("gsrnamespace", "6"); // File namespace
    url.searchParams.set("gsrlimit", String(limit));
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url|size|mime");
    url.searchParams.set("iiurlwidth", "1024");

    const res = await fetch(url, {
      headers: { "User-Agent": "CityGuideV2/1.0", "Accept": "application/json" },
      signal: AbortSignal.timeout(20000),
    });

    if (res.status === 429 || res.status >= 500) {
      if (attempt < 3) {
        await sleep(3000 + attempt * 3000);
        return commonsSearch(query, limit, attempt + 1);
      }
      return [];
    }
    if (!res.ok) return [];

    const data = await res.json();
    const pages = data.query?.pages || {};
    const urls = [];
    for (const p of Object.values(pages)) {
      const info = p.imageinfo?.[0];
      if (!info) continue;
      const mime = info.mime || "";
      if (!mime.startsWith("image/")) continue;
      const w = info.width || 0;
      if (w < 600) continue;  // skip tiny images
      const src = info.thumburl || info.url;
      if (src) urls.push(src);
    }
    return urls;
  } catch {
    if (attempt < 3) {
      await sleep(3000 + attempt * 3000);
      return commonsSearch(query, limit, attempt + 1);
    }
    return [];
  }
}

// ── Build a pool key like "marrakech::restaurants" ──────────────────────────
function poolKey(city, category) {
  return `${city}::${category}`;
}

async function ensurePool(cityKey, cityName, category) {
  const key = poolKey(cityKey, category);
  if (poolCache[key]) return poolCache[key];

  const queries = POOL_QUERIES.byCategory[category] || POOL_QUERIES.fallback;
  let allUrls = [];
  for (const tmpl of queries.slice(0, 2)) {  // up to 2 query templates per pool
    const q = tmpl.replace(/\{CITY\}/g, cityName);
    const urls = await commonsSearch(q, 6);
    allUrls.push(...urls);
    await sleep(800);
    if (allUrls.length >= 8) break;
  }
  // Dedupe + cap
  allUrls = [...new Set(allUrls)].slice(0, 8);

  poolCache[key] = allUrls;
  saveDebounced();
  return allUrls;
}

async function findImageForPlace(place, cityName) {
  if (imgCache[place.slug]) return imgCache[place.slug];

  // Try direct search by place name + city
  let url = null;
  if (place.name && place.name.length > 5) {
    const query = `${place.name} ${cityName}`;
    const results = await commonsSearch(query, 3);
    if (results.length) url = results[0];
    await sleep(800);
  }

  imgCache[place.slug] = url;
  saveDebounced();
  return url;
}

async function main() {
  if (!fs.existsSync(CAND_FILE)) {
    console.error("✗ candidates.json not found. Run 2-build-candidates.js first.");
    process.exit(1);
  }
  const cand = JSON.parse(fs.readFileSync(CAND_FILE, "utf8"));
  const wiki = fs.existsSync(WIKI_FILE) ? JSON.parse(fs.readFileSync(WIKI_FILE, "utf8")) : {};
  const cityNameByKey = Object.fromEntries(CITIES.map(c => [c.key, c.name]));

  console.log("\n  ╔══════════════════════════════════════════════════════════╗");
  console.log("  ║  Image Fetcher — Commons search + pools                  ║");
  console.log(`  ║  Candidates: ${String(cand.candidates.length).padEnd(43)}║`);
  console.log("  ╚══════════════════════════════════════════════════════════╝\n");

  // Phase 1: Build pools per (city, category) for candidates without images
  const needsPool = new Map();  // poolKey → cityName
  for (const p of cand.candidates) {
    const hasWiki = wiki[p.slug]?.image;
    if (hasWiki) continue;
    const k = poolKey(p.city, p.category);
    if (!poolCache[k]) needsPool.set(k, [p.city, cityNameByKey[p.city] || p.city, p.category]);
  }

  console.log(`  Phase 1: Building ${needsPool.size} image pools…`);
  let poolDone = 0;
  for (const [k, [cityKey, cityName, category]] of needsPool) {
    await ensurePool(cityKey, cityName, category);
    poolDone++;
    if (poolDone % 20 === 0) {
      console.log(`    [${poolDone}/${needsPool.size}] pools built`);
    }
  }
  // Save pools immediately
  fs.writeFileSync(POOL_FILE, JSON.stringify(poolCache, null, 2));
  console.log(`  ✓ ${poolDone} pools built\n`);

  // Phase 2: Direct search for landmark-like places without image
  const LANDMARK_CATS = new Set([
    "medinas","palaces-kasbahs","roman-ruins","historical-sites","mausoleums",
    "mosques","medersas","art-museums","history-museums","craft-museums",
    "national-parks","beaches","atlantic-beaches","waterfalls","mountains",
    "sunset-spots","sand-dunes","contemporary-art",
  ]);
  const directTargets = cand.candidates.filter(p => {
    if (wiki[p.slug]?.image) return false;
    if (!LANDMARK_CATS.has(p.category)) return false;
    if (p.wikidata || p.wikipedia) return false; // would have been caught by enrich
    return true;
  });

  console.log(`  Phase 2: Direct Commons search for ${directTargets.length} landmark candidates…`);
  let directOk = 0;
  for (let i = 0; i < directTargets.length; i++) {
    const p = directTargets[i];
    const url = await findImageForPlace(p, cityNameByKey[p.city] || p.city);
    if (url) directOk++;
    if ((i+1) % 25 === 0) console.log(`    [${i+1}/${directTargets.length}] hit:${directOk}`);
  }

  fs.writeFileSync(IMG_FILE,  JSON.stringify(imgCache,  null, 2));
  fs.writeFileSync(POOL_FILE, JSON.stringify(poolCache, null, 2));

  console.log("\n  ══════════════════════════════════════════════════════════");
  console.log(`  ✅ Pools: ${Object.keys(poolCache).length}`);
  console.log(`  ✅ Direct hits: ${directOk}/${directTargets.length}`);
  console.log("  Next: node backend/scripts/v2-builder/5-build-final.js");
  console.log("  ══════════════════════════════════════════════════════════\n");
}

main().catch(e => {
  console.error("✗ Fatal:", e);
  fs.writeFileSync(IMG_FILE,  JSON.stringify(imgCache,  null, 2));
  fs.writeFileSync(POOL_FILE, JSON.stringify(poolCache, null, 2));
  process.exit(1);
});
