# City Guide V2 — Real Data Pipeline

Replaces hardcoded mock data with **real** Moroccan tourism data fetched from:
- **OpenStreetMap (Overpass API)** — POI names, coordinates, addresses, contact info
- **Wikipedia REST API** — descriptions and images for landmarks
- **Wikimedia Commons** — images for non-landmark places (per-city, per-category pools)

Output: a `city_guide_v2` MongoDB database with **~3000+ real places, 46 cities, 80 categories, 120+ real events**.

## Architecture

```
v2-builder/
├── data/
│   ├── cities-45.js              45 Moroccan cities (key, name, region, GPS)
│   ├── osm-mapping.js            OSM tag → category slug mapping
│   ├── image-pool-queries.js     Commons search templates per category
│   └── events-120.js             120+ real recurring events (2026-2027)
│
├── 1-fetch-osm.js                Overpass API → cache/osm-<city>.json
├── 2-build-candidates.js         Cap & prioritize → cache/candidates.json
├── 3-enrich-wiki.js              Wikipedia → cache/wiki-cache.json
├── 4-fetch-images.js             Commons + pools → cache/images-cache.json
├── 5-build-final.js              Merge all → output/places-final.json
├── 6-seed.js                     Write to MongoDB city_guide_v2
│
├── run-all.js                    Orchestrator (runs 1→6 in sequence)
├── cache/                        Intermediate JSON checkpoints (resumable)
└── output/                       Final JSON + seed summary
```

## Run the full pipeline

```bash
node backend/scripts/v2-builder/run-all.js
```

Total runtime: **~30-60 minutes** on first run (mostly API calls). Subsequent runs are near-instant (all caches kept). To force a refetch of a specific step:

```bash
node backend/scripts/v2-builder/1-fetch-osm.js --refresh
node backend/scripts/v2-builder/3-enrich-wiki.js --refresh
```

## Run individual steps

```bash
# Single city (for testing)
node backend/scripts/v2-builder/1-fetch-osm.js --only=marrakech

# Skip OSM (if already fetched)
node backend/scripts/v2-builder/run-all.js --skip-osm
```

## After seeding

The app uses `process.env.MONGO_URI`. The new database name is `city_guide_v2`. To point the running app at it, set:

```
MONGO_URI=mongodb://127.0.0.1:27017/city_guide_v2
```

…or add `?dbName=city_guide_v2` if using a connection-string parameter, or edit `backend/config/db.js` to add `{ dbName: "city_guide_v2" }`.

## Translation

Places and events are seeded with **English source** + minimal FR/AR (using OSM name:fr / name:ar where available). To auto-translate everything via Google Cloud Translate:

```bash
node backend/scripts/translateExisting.js
```

(Requires `GOOGLE_CLOUD_API_KEY` in backend/.env)

## What you get

| Resource | Count | Source |
|---|---|---|
| Cities | 46 | Manually curated, real GPS |
| Categories | 80 | Reused from existing `seeders/data/categories.js` |
| Places | ~3000-5000 | Overpass + Wikipedia + Commons |
| Events | 120+ | Manually curated (real festivals/sport/expos 2026-2027) |
| Users | 5+ | Reused from existing `seeders/data/users.js` |
| Guides | 4+ | Reused from existing `seeders/data/guides.js` |

Each place includes:
- Real name, slug, GPS coordinates (from OSM)
- Address (where available in OSM)
- Description (Wikipedia for landmarks, generated from OSM tags for others)
- Image (Wikipedia for landmarks, Commons pool for others)
- Smart-generated rating + review count (proportional to data richness)
- Phone, website (from OSM contact tags — preserved in `_website` / `_phone` extra fields, not in schema)
- Translations: EN (source), FR/AR (from OSM name:fr/name:ar or fallback to EN)
