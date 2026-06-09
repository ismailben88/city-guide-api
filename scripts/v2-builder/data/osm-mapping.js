// ─────────────────────────────────────────────────────────────────────────────
//  osm-mapping.js — Maps OpenStreetMap tags to our category slugs
//
//  Each rule: { osmKey, osmValue, category, extraTag? }
//  Order matters: first match wins. More specific rules first.
//
//  Categories without OSM equivalents (e.g. "Photography Spots") get populated
//  from curated/landmark sources only — they are intentionally absent here.
// ─────────────────────────────────────────────────────────────────────────────

const RULES = [
  // ── Religious sites (most specific first) ─────────────────────────────────
  { osm: { amenity: "place_of_worship", religion: "muslim" },        category: "mosques" },
  { osm: { historic: "ruins", site_type: "mosque" },                  category: "mosques" },
  { osm: { historic: "tomb" },                                        category: "mausoleums" },
  { osm: { amenity: "monastery" },                                    category: "mausoleums" },

  // ── Historical (kasbahs, palaces, medinas) ────────────────────────────────
  { osm: { historic: "castle" },                                      category: "palaces-kasbahs" },
  { osm: { historic: "fort" },                                        category: "palaces-kasbahs" },
  { osm: { historic: "city_gate" },                                   category: "medinas" },
  { osm: { historic: "wayside_shrine" },                              category: "mausoleums" },
  { osm: { historic: "archaeological_site" },                         category: "roman-ruins" },
  { osm: { historic: "ruins" },                                       category: "roman-ruins" },
  { osm: { historic: "monument" },                                    category: "historical-sites" },
  { osm: { historic: "memorial" },                                    category: "historical-sites" },
  { osm: { place: "city_block", historic: "yes" },                    category: "medinas" },

  // ── Museums & culture ─────────────────────────────────────────────────────
  { osm: { tourism: "museum", museum: "art" },                        category: "art-museums" },
  { osm: { tourism: "museum", museum: "history" },                    category: "history-museums" },
  { osm: { tourism: "museum", museum: "archaeological" },             category: "history-museums" },
  { osm: { tourism: "museum" },                                        category: "history-museums" },
  { osm: { tourism: "gallery" },                                       category: "contemporary-art" },
  { osm: { craft: "carpenter" },                                       category: "artisan-workshops" },
  { osm: { craft: "leather" },                                         category: "artisan-workshops" },
  { osm: { craft: "pottery" },                                         category: "artisan-workshops" },
  { osm: { craft: "metal_construction" },                              category: "artisan-workshops" },

  // ── Beaches & water ───────────────────────────────────────────────────────
  { osm: { natural: "beach" },                                         category: "beaches" },
  { osm: { sport: "surfing" },                                         category: "surf-spots" },
  { osm: { sport: "kitesurfing" },                                     category: "kitesurfing" },

  // ── Nature ────────────────────────────────────────────────────────────────
  { osm: { natural: "waterfall" },                                     category: "waterfalls" },
  { osm: { natural: "peak" },                                          category: "mountains" },
  { osm: { natural: "cave_entrance" },                                 category: "mountains" },
  { osm: { boundary: "national_park" },                                category: "national-parks" },
  { osm: { boundary: "protected_area" },                               category: "national-parks" },
  { osm: { leisure: "park" },                                          category: "national-parks" },
  { osm: { leisure: "garden" },                                        category: "national-parks" },
  { osm: { tourism: "viewpoint" },                                     category: "sunset-spots" },

  // ── Desert ────────────────────────────────────────────────────────────────
  { osm: { natural: "dune" },                                          category: "sand-dunes" },
  { osm: { tourism: "camp_site" },                                     category: "desert-camps" },
  { osm: { tourism: "caravan_site" },                                  category: "desert-camps" },

  // ── Restaurants ───────────────────────────────────────────────────────────
  { osm: { amenity: "restaurant", cuisine: "moroccan" },              category: "moroccan-cuisine" },
  { osm: { amenity: "restaurant", cuisine: "seafood" },               category: "seafood" },
  { osm: { amenity: "restaurant", cuisine: "fish" },                  category: "seafood" },
  { osm: { amenity: "restaurant" },                                    category: "restaurants" },
  { osm: { amenity: "fast_food" },                                     category: "local-food" },

  // ── Cafés ─────────────────────────────────────────────────────────────────
  { osm: { amenity: "cafe", cuisine: "coffee_shop" },                 category: "specialty-coffee" },
  { osm: { amenity: "cafe" },                                          category: "cafes" },
  { osm: { amenity: "ice_cream" },                                     category: "cafes" },

  // ── Hotels & lodging ──────────────────────────────────────────────────────
  { osm: { tourism: "hotel", stars: "5" },                            category: "luxury-hotels" },
  { osm: { tourism: "hotel", stars: "4" },                            category: "luxury-hotels" },
  { osm: { tourism: "hotel" },                                        category: "hotels" },
  { osm: { tourism: "guest_house", guest_house: "riad" },             category: "luxury-riads" },
  { osm: { tourism: "guest_house" },                                  category: "riads" },
  { osm: { tourism: "hostel" },                                        category: "hotels" },
  { osm: { tourism: "apartment" },                                     category: "boutique-hotels" },

  // ── Shopping ──────────────────────────────────────────────────────────────
  { osm: { shop: "marketplace" },                                     category: "souks" },
  { osm: { amenity: "marketplace" },                                   category: "souks" },
  { osm: { shop: "bakery" },                                           category: "bakeries" },
  { osm: { shop: "convenience" },                                     category: "food-markets" },
  { osm: { shop: "supermarket" },                                     category: "food-markets" },
  { osm: { shop: "deli" },                                             category: "food-markets" },
  { osm: { shop: "spices" },                                           category: "food-markets" },
  { osm: { shop: "carpet" },                                           category: "berber-crafts" },
  { osm: { shop: "art" },                                              category: "berber-crafts" },
  { osm: { shop: "antiques" },                                         category: "berber-crafts" },
  { osm: { shop: "jewelry" },                                          category: "shopping" },
  { osm: { shop: "cosmetics" },                                        category: "argan-products" },

  // ── Wellness & spa ────────────────────────────────────────────────────────
  { osm: { leisure: "spa" },                                           category: "luxury-spas" },
  { osm: { amenity: "spa" },                                           category: "luxury-spas" },
  { osm: { amenity: "public_bath" },                                  category: "hammams" },
  { osm: { leisure: "sauna" },                                         category: "hammams" },
  { osm: { sport: "yoga" },                                            category: "yoga-retreats" },

  // ── Nightlife ─────────────────────────────────────────────────────────────
  { osm: { amenity: "bar" },                                           category: "bars-lounges" },
  { osm: { amenity: "pub" },                                           category: "bars-lounges" },
  { osm: { amenity: "nightclub" },                                     category: "clubs" },
  { osm: { amenity: "stripclub" },                                     category: "clubs" },

  // ── Sports & golf ─────────────────────────────────────────────────────────
  { osm: { leisure: "golf_course" },                                   category: "golf" },
  { osm: { sport: "golf" },                                            category: "golf" },
  { osm: { sport: "hiking" },                                          category: "hiking-trekking" },
  { osm: { highway: "path", sac_scale: "*" },                          category: "hiking-trekking" },

  // ── Coworking ─────────────────────────────────────────────────────────────
  { osm: { amenity: "coworking_space" },                              category: "coworking-spaces" },
  { osm: { amenity: "office", office: "coworking" },                  category: "coworking-spaces" },

  // ── Family ────────────────────────────────────────────────────────────────
  { osm: { tourism: "theme_park" },                                   category: "theme-parks" },
  { osm: { leisure: "water_park" },                                   category: "theme-parks" },
  { osm: { tourism: "zoo" },                                           category: "kids-activities" },
  { osm: { tourism: "aquarium" },                                     category: "kids-activities" },
  { osm: { leisure: "playground" },                                    category: "kids-activities" },

  // ── Generic touristic attractions (fallback) ──────────────────────────────
  { osm: { tourism: "attraction" },                                   category: "historical-sites" },
];

// All discriminating tag selectors we need to fetch from Overpass.
// We over-fetch by FIRST tag of each rule, then post-filter with matchCategory().
const OVERPASS_SELECTORS = (() => {
  const seen = new Set();
  const out = [];
  for (const r of RULES) {
    const [k, v] = Object.entries(r.osm)[0];
    const sig = `${k}=${v}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    if (v === "*") out.push(`["${k}"]`);
    else           out.push(`["${k}"="${v}"]`);
  }
  return out;
})();

// Builds an Overpass query for a 25km radius around (lat,lng)
function buildOverpassQuery(lat, lng, radius = 25000) {
  const lines = OVERPASS_SELECTORS.map(
    (sel) => `  nwr${sel}(around:${radius},${lat},${lng});`
  );
  return `[out:json][timeout:90];\n(\n${lines.join("\n")}\n);\nout center tags;`;
}

// Match an OSM element's tags to our category — returns slug or null
function matchCategory(tags) {
  if (!tags) return null;
  for (const rule of RULES) {
    let match = true;
    for (const [k, v] of Object.entries(rule.osm)) {
      const t = tags[k];
      if (!t) { match = false; break; }
      if (v === "*") continue;
      if (t !== v) { match = false; break; }
    }
    if (match) return rule.category;
  }
  return null;
}

module.exports = { RULES, buildOverpassQuery, matchCategory };
