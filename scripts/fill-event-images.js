#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
//  fill-event-images.js
//
//  Fills `coverImage` for every Event currently missing one.
//
//  Strategy:
//    1. Build a small per-category cache of REAL Wikipedia/Wikimedia URLs by
//       querying the Wikipedia REST API (`summary/<topic>`) for a curated list
//       of Moroccan & generic topics. We keep only entries that actually
//       return an `originalimage.source` — so every URL in the cache is
//       guaranteed to exist (no guessed filenames).
//    2. For each event without coverImage:
//         · resolve its category (concert/music/festival/etc.)
//         · pick a deterministic image from that category's cache using a
//           stable hash of the event _id
//
//  USAGE:
//    node backend/scripts/fill-event-images.js              # apply
//    node backend/scripts/fill-event-images.js --dry-run    # preview
//    node backend/scripts/fill-event-images.js --force      # overwrite even if image is already set
// ─────────────────────────────────────────────────────────────────────────────
"use strict";
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const https = require("https");
const { MongoClient } = require("mongodb");

const ARGS    = new Set(process.argv.slice(2));
const DRY_RUN = ARGS.has("--dry-run");
const FORCE   = ARGS.has("--force");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const DB_NAME   = process.env.DB_NAME   || "city_guide_v2";

// ─── Topic seeds per category — names of real Wikipedia articles ────────────
// Each must be a real article slug. The script keeps only those that return
// an `originalimage`. With ~6 candidates per category we get plenty of hits.
const SEEDS = {
  concert:    ["Concert", "Music_festival", "Pop_music", "Rock_concert", "Live_music", "Stage_(theatre)"],
  music:      ["Gnawa_music", "Andalusian_classical_music", "Moroccan_music", "Raï", "Berber_music", "Chaabi_(Morocco)"],
  festival:   ["Festival_of_World_Sacred_Music", "Mawazine", "Marrakech_International_Film_Festival", "Festival_International_Mer_et_Désert", "Timitar", "Gnaoua_World_Music_Festival"],
  exhibition: ["Art_exhibition", "Museum", "Mohammed_VI_Museum_of_Modern_and_Contemporary_Art", "Bahia_Palace", "Dar_Si_Said_Museum", "Marrakech_Museum"],
  theatre:    ["Theatre", "Mohammed_V_Theatre", "Casablanca", "Opera", "Stage_(theatre)", "Drama"],
  sport:      ["Marrakech_Marathon", "Football_in_Morocco", "Morocco_national_football_team", "Stade_Mohammed_V", "Surfing", "Marathon_des_Sables"],
  art:        ["Moroccan_art", "Zellige", "Moroccan_calligraphy", "Berber_carpet", "Moroccan_pottery", "Henna"],
  culture:    ["Culture_of_Morocco", "Jemaa_el-Fnaa", "Fes_el_Bali", "Chefchaouen", "Marrakesh", "Medina_quarter"],
  workshop:   ["Pottery", "Leather_crafting", "Moroccan_cuisine", "Weaving", "Tannery", "Handicraft"],
  other:      ["Morocco", "Marrakesh", "Casablanca", "Fes", "Chefchaouen", "Rabat"],
};

// ─── Fetch with redirect support ────────────────────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { "User-Agent": "CityGuide/1.0 (city-guide.app)" },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return fetchJSON(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return resolve(null);
      }
      let buf = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (buf += c));
      res.on("end", () => {
        try { resolve(JSON.parse(buf)); } catch { resolve(null); }
      });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
  });
}

async function fetchWikiImage(slug) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`;
  const data = await fetchJSON(url);
  return data?.originalimage?.source || data?.thumbnail?.source || null;
}

async function buildPoolsFromWiki() {
  console.log("  Building image pools from Wikipedia REST API…\n");
  const pools = {};
  for (const [cat, seeds] of Object.entries(SEEDS)) {
    const urls = [];
    for (const seed of seeds) {
      const img = await fetchWikiImage(seed);
      if (img) urls.push(img);
    }
    pools[cat] = urls;
    console.log(`    ${cat.padEnd(12)} ${urls.length}/${seeds.length} hit(s)`);
  }
  return pools;
}

// ─── Category resolver (mirrors frontend resolveCatKey) ─────────────────────
function resolveCatKey(event) {
  const raw = (event.category || event.categoryName || "").toLowerCase();
  if (raw.includes("concert"))                                                              return "concert";
  if (raw.includes("exposition") || raw.includes("exhibition") || raw.includes("expo"))     return "exhibition";
  if (raw.includes("théâtre") || raw.includes("theatre") || raw.includes("theater"))        return "theatre";
  if (raw.includes("sport") || raw.includes("football") || raw.includes("marathon") || raw.includes("coupe")) return "sport";
  if (raw.includes("festival"))                                                              return "festival";
  if (raw.includes("musique") || raw.includes("music") || raw.includes("mawazine") || raw.includes("jazz"))   return "music";
  if (raw.includes("culture") || raw.includes("culturel"))                                  return "culture";
  if (raw.includes("art") || raw.includes("peint"))                                         return "art";
  if (raw.includes("atelier") || raw.includes("workshop") || raw.includes("poterie"))       return "workshop";
  return "other";
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

function pickImage(event, pools) {
  const key  = resolveCatKey(event);
  let   pool = pools[key]?.length ? pools[key] : pools.other;
  if (!pool?.length) return null;
  const seed = event._id?.toString() || event.title || "x";
  return pool[hashStr(seed) % pool.length];
}

// ─── Main ───────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n  DB: ${DB_NAME}`);
  console.log(`  Mode: ${DRY_RUN ? "dry-run" : "WRITE"}${FORCE ? " (force overwrite)" : ""}\n`);

  const pools = await buildPoolsFromWiki();

  const totalImgs = Object.values(pools).reduce((s, a) => s + a.length, 0);
  if (totalImgs === 0) {
    console.error("\n  ✗ No images fetched from Wikipedia — aborting.");
    process.exit(1);
  }

  console.log(`\n  Connecting to MongoDB…`);
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db  = client.db(DB_NAME);
  const col = db.collection("events");

  const query = FORCE ? {} : { $or: [{ coverImage: { $exists: false } }, { coverImage: "" }, { coverImage: null }] };
  const events = await col.find(query).project({ title: 1, category: 1, categoryName: 1, coverImage: 1 }).toArray();
  console.log(`  ${events.length} event(s) ${FORCE ? "(force mode)" : "without coverImage"}.\n`);

  const stats = {};
  let updated = 0, skipped = 0;

  for (const ev of events) {
    const url = pickImage(ev, pools);
    const ck  = resolveCatKey(ev);
    if (!url) { skipped += 1; continue; }
    stats[ck] = (stats[ck] || 0) + 1;

    if (DRY_RUN) {
      console.log(`  [DRY] ${(ev.title || "").padEnd(56).slice(0, 56)} → ${ck.padEnd(10)} → ${url.slice(0, 70)}…`);
    } else {
      await col.updateOne({ _id: ev._id }, { $set: { coverImage: url } });
      updated += 1;
    }
  }

  console.log(`\n  Distribution:`);
  for (const [k, n] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(12)} ${n}`);
  }

  if (DRY_RUN) {
    console.log(`\n  Dry-run done. Re-run without --dry-run to apply (${events.length - skipped} writes).`);
  } else {
    console.log(`\n  ✓ ${updated} updated · ${skipped} skipped.`);
  }

  await client.close();
})().catch((e) => { console.error(e); process.exit(1); });
