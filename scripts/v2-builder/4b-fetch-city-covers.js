#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
//  4b-fetch-city-covers.js — Fetches hero image + description per city
//
//  Strategy:
//    1. Wikipedia REST summary for city name → returns originalimage + extract
//    2. If no image, search Wikimedia Commons for "{city} Morocco"
//
//  Output: cache/city-covers.json — { [cityKey]: { image, description } }
// ─────────────────────────────────────────────────────────────────────────────
"use strict";

const fs   = require("fs");
const path = require("path");
const CITIES = require("./data/cities-45");

const CACHE_DIR = path.resolve(__dirname, "cache");
const OUT_FILE  = path.join(CACHE_DIR, "city-covers.json");
const REFRESH   = process.argv.includes("--refresh");

const covers = REFRESH ? {} : (fs.existsSync(OUT_FILE)
  ? JSON.parse(fs.readFileSync(OUT_FILE, "utf8")) : {});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchWikiSummary(title, attempt = 0) {
  try {
    const enc = encodeURIComponent(title.replace(/\s/g, "_"));
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${enc}`, {
      headers: { "User-Agent": "CityGuideV2/1.0", Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (res.status >= 500 || res.status === 429) {
      if (attempt < 3) { await sleep(3000 + attempt * 3000); return fetchWikiSummary(title, attempt+1); }
      return null;
    }
    if (res.status === 404 || !res.ok) return null;
    return await res.json();
  } catch {
    if (attempt < 3) { await sleep(3000 + attempt * 3000); return fetchWikiSummary(title, attempt+1); }
    return null;
  }
}

async function commonsImageForCity(cityName, attempt = 0) {
  try {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", `${cityName} Morocco panorama`);
    url.searchParams.set("gsrnamespace", "6");
    url.searchParams.set("gsrlimit", "3");
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url|size|mime");
    url.searchParams.set("iiurlwidth", "1600");

    const res = await fetch(url, {
      headers: { "User-Agent": "CityGuideV2/1.0" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data.query?.pages || {};
    for (const p of Object.values(pages)) {
      const info = p.imageinfo?.[0];
      if (!info) continue;
      if ((info.width || 0) < 800) continue;
      return info.thumburl || info.url;
    }
    return null;
  } catch {
    return null;
  }
}

function truncate(text, max = 400) {
  if (!text) return "";
  const clean = text.replace(/\n/g, " ").trim();
  if (clean.length <= max) return clean;
  const sents = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  let out = "";
  for (const s of sents) { if ((out + s).length > max) break; out += s; }
  return out.trim();
}

// City-specific Wikipedia title hints for ambiguous names
const TITLE_HINTS = {
  "ait-benhaddou": ["Aït Benhaddou"],
  "mhamid":        ["M'Hamid El Ghizlane"],
  "ksar-el-kebir": ["Ksar el-Kebir"],
  "al-hoceima":    ["Al Hoceima"],
  "sidi-ifni":     ["Sidi Ifni"],
  "el-jadida":     ["El Jadida"],
  "beni-mellal":   ["Beni Mellal"],
  "imlil":         ["Imlil, Morocco"],
  "akchour":       ["Akchour"],
  "saidia":        ["Saidia"],
  "fes":           ["Fez, Morocco"],
};

async function fetchCover(city) {
  if (covers[city.key]?.image) return;
  const titles = TITLE_HINTS[city.key] || [city.name];
  let image = null, description = "";

  for (const title of titles) {
    const summary = await fetchWikiSummary(title);
    await sleep(800);
    if (!summary) continue;
    if (summary.type === "disambiguation") continue;
    image = summary.originalimage?.source || summary.thumbnail?.source || null;
    description = truncate(summary.extract || "");
    if (image || description) break;
  }

  // Fallback to Commons search
  if (!image) {
    image = await commonsImageForCity(city.name);
    await sleep(800);
  }

  covers[city.key] = { image: image || "", description };
  fs.writeFileSync(OUT_FILE, JSON.stringify(covers, null, 2));
  console.log(`  ${image ? "✓" : "○"} ${city.name.padEnd(20)} ${image ? "image+desc" : "(no image found)"}`);
}

async function main() {
  console.log("\n  ▶ Fetching city covers (image + description)…\n");
  for (let i = 0; i < CITIES.length; i++) {
    const c = CITIES[i];
    process.stdout.write(`  [${String(i+1).padStart(2)}/${CITIES.length}]`);
    await fetchCover(c);
  }
  const withImage = Object.values(covers).filter(c => c.image).length;
  const withDesc  = Object.values(covers).filter(c => c.description).length;
  console.log(`\n  ✅ ${withImage}/${CITIES.length} cities with cover image, ${withDesc} with description`);
  console.log(`  Saved: ${OUT_FILE}\n`);
}

main().catch(e => { console.error("✗ Fatal:", e); process.exit(1); });
