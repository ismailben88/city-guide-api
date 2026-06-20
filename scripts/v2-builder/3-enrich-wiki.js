#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
//  2-enrich-wiki.js — Enriches OSM places with Wikipedia descriptions+images
//
//  Strategy:
//    1. For places with osm tags wikidata or wikipedia → fetch direct
//    2. For "landmark-like" places (medinas, palaces, mausoleums, mosques,
//       museums, ruins, parks, beaches, dunes, waterfalls) without wikidata
//       → try Wikipedia search by name+city
//    3. Cache each result individually (resumable)
//
//  Output: cache/wiki-cache.json
//  Usage:
//    node backend/scripts/v2-builder/2-enrich-wiki.js
//    node backend/scripts/v2-builder/2-enrich-wiki.js --refresh
// ─────────────────────────────────────────────────────────────────────────────
"use strict";

const fs   = require("fs");
const path = require("path");
const CITIES = require("./data/cities-45");

const CACHE_DIR = path.resolve(__dirname, "cache");
const CACHE_FILE = path.join(CACHE_DIR, "wiki-cache.json");
const ARGS = process.argv.slice(2);
const REFRESH = ARGS.includes("--refresh");

const LANDMARK_CATEGORIES = new Set([
  "medinas", "palaces-kasbahs", "roman-ruins", "historical-sites",
  "mausoleums", "mosques", "medersas",
  "art-museums", "history-museums", "craft-museums",
  "national-parks", "beaches", "atlantic-beaches", "med-beaches",
  "waterfalls", "mountains", "sand-dunes", "sunset-spots",
  "contemporary-art",
]);

const cache = REFRESH ? {} : (fs.existsSync(CACHE_FILE)
  ? JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) : {});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let saveTimer = null;
function saveCacheDebounced() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  }, 2000);
}

async function fetchWikiSummary(title, attempt = 0) {
  try {
    const enc = encodeURIComponent(title.replace(/\s/g, "_"));
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${enc}`, {
      headers: { "User-Agent": "CityGuideV2/1.0", "Accept": "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 429 || res.status >= 500) {
      if (attempt < 3) {
        await sleep(3000 + attempt * 3000);
        return fetchWikiSummary(title, attempt + 1);
      }
      return null;
    }
    if (res.status === 404) return { _notfound: true };
    if (!res.ok) return null;
    const data = await res.json();
    if (data.type === "disambiguation") return { _disambig: true };
    return data;
  } catch (e) {
    if (attempt < 3) {
      await sleep(3000 + attempt * 3000);
      return fetchWikiSummary(title, attempt + 1);
    }
    return null;
  }
}

async function fetchWikidata(qid, attempt = 0) {
  try {
    const res = await fetch(
      `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`,
      { headers: { "User-Agent": "CityGuideV2/1.0" }, signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const entity = data.entities?.[qid];
    if (!entity) return null;
    return {
      enTitle: entity.sitelinks?.enwiki?.title || null,
      frTitle: entity.sitelinks?.frwiki?.title || null,
      arTitle: entity.sitelinks?.arwiki?.title || null,
    };
  } catch {
    if (attempt < 2) {
      await sleep(3000);
      return fetchWikidata(qid, attempt + 1);
    }
    return null;
  }
}

function truncate(text, max = 600) {
  if (!text) return "";
  const clean = text.replace(/\n/g, " ").trim();
  if (clean.length <= max) return clean;
  const sents = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  let out = "";
  for (const s of sents) {
    if ((out + s).length > max) break;
    out += s;
  }
  return out.trim() || clean.slice(0, max) + "…";
}

const SLEEP = 350; // ms between requests — Wikipedia tolerates ~2 req/sec

async function enrich(place, cityName) {
  const key = place.slug;
  if (cache[key]) return cache[key];

  let result = { tried: [], wiki: null, image: null, desc_en: null };

  // Strategy 1: wikidata QID from OSM (guaranteed hit)
  if (place.wikidata) {
    result.tried.push(`wikidata:${place.wikidata}`);
    const wd = await fetchWikidata(place.wikidata);
    if (wd?.enTitle) {
      const summary = await fetchWikiSummary(wd.enTitle);
      if (summary && !summary._notfound && !summary._disambig) {
        result.wiki = wd.enTitle;
        result.image = summary.originalimage?.source || summary.thumbnail?.source || null;
        result.desc_en = truncate(summary.extract);
        if (wd.frTitle) result.wiki_fr = wd.frTitle;
        if (wd.arTitle) result.wiki_ar = wd.arTitle;
      }
      await sleep(SLEEP);
    }
  }

  // Strategy 2: wikipedia tag from OSM (format: "lang:Title")
  if (!result.wiki && place.wikipedia) {
    const m = place.wikipedia.match(/^([a-z]+):(.+)$/);
    if (m) {
      const [, lang, title] = m;
      result.tried.push(`wikipedia:${lang}:${title}`);
      if (lang === "en") {
        const s = await fetchWikiSummary(title);
        if (s && !s._notfound && !s._disambig) {
          result.wiki = title;
          result.image = s.originalimage?.source || s.thumbnail?.source || null;
          result.desc_en = truncate(s.extract);
        }
      } else {
        result.wiki = title;
      }
      await sleep(SLEEP);
    }
  }

  // Strategy 3: ONLY ONE search query per landmark (was 2 — too slow)
  if (!result.wiki && LANDMARK_CATEGORIES.has(place.category)) {
    // Skip too-generic names that won't match Wikipedia
    if (place.name.length >= 5 && !/^(mosque|hotel|cafe|riad|restaurant)$/i.test(place.name)) {
      const q = `${place.name} ${cityName}`;
      result.tried.push(`search:${q}`);
      const s = await fetchWikiSummary(q);
      if (s && !s._notfound && !s._disambig && s.extract) {
        result.wiki = s.title;
        result.image = s.originalimage?.source || s.thumbnail?.source || null;
        result.desc_en = truncate(s.extract);
      }
      await sleep(SLEEP);
    }
  }

  cache[key] = result;
  saveCacheDebounced();
  return result;
}

async function main() {
  // Load candidates (capped/prioritized) from step 2
  const candPath = path.join(CACHE_DIR, "candidates.json");
  if (!fs.existsSync(candPath)) {
    console.error("✗ candidates.json not found. Run 2-build-candidates.js first.");
    process.exit(1);
  }
  const cityNameByKey = Object.fromEntries(CITIES.map(c => [c.key, c.name]));
  const cand = JSON.parse(fs.readFileSync(candPath, "utf8"));
  const allPlaces = cand.candidates.map(p => ({ ...p, _cityName: cityNameByKey[p.city] || p.city }));

  console.log("\n  ╔══════════════════════════════════════════════════════════╗");
  console.log("  ║  Wikipedia Enricher — City Guide V2                      ║");
  console.log(`  ║  Total candidates: ${String(allPlaces.length).padEnd(37)}║`);
  console.log("  ╚══════════════════════════════════════════════════════════╝\n");

  // Filter: only enrich those with wikidata/wikipedia OR landmark categories
  const targets = allPlaces.filter(p =>
    p.wikidata || p.wikipedia || LANDMARK_CATEGORIES.has(p.category)
  );
  console.log(`  Will enrich ${targets.length} candidates (skip the rest).\n`);

  let ok = 0, withImg = 0, t0 = Date.now();
  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    const r = await enrich(p, p._cityName);
    if (r.wiki) ok++;
    if (r.image) withImg++;

    if ((i + 1) % 25 === 0 || i + 1 === targets.length) {
      const pct = ((i+1)/targets.length*100).toFixed(1);
      const elapsed = ((Date.now()-t0)/60000).toFixed(1);
      console.log(`  [${i+1}/${targets.length}] ${pct}%  wiki:${ok} img:${withImg}  (${elapsed}min)`);
    }
  }

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  const elapsed = ((Date.now()-t0)/60000).toFixed(1);

  console.log("\n  ══════════════════════════════════════════════════════════");
  console.log(`  ✅ DONE — ${ok}/${targets.length} got Wikipedia (${withImg} with image) in ${elapsed}min`);
  console.log("  Next: node backend/scripts/v2-builder/3-fetch-images.js");
  console.log("  ══════════════════════════════════════════════════════════\n");
}

main().catch(e => {
  console.error("✗ Fatal:", e);
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  process.exit(1);
});
