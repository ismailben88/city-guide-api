const NodeCache = require("node-cache");

// useClones: false — NodeCache uses the `clone` lib by default which crashes on Mongoose
// documents that have compiled GeoJSON setters (location field). We never mutate cached
// values directly, so cloning is unnecessary.
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60, useClones: false });

const TTL = {
  CITIES:     3600, // 1h
  CATEGORIES: 3600, // 1h
  GUIDES:      600, // 10 min
  EVENTS:      300, // 5 min
  PLACES:      600, // 10 min — top-per-city aggregations
  NEARBY:      120, // 2 min — geospatial queries
  SEARCH:       60, // 1 min — search results
};

/**
 * Build a deterministic cache key from a query object.
 * - Recursively serialises nested objects and arrays
 * - Drops undefined/null values
 * - Sorts keys alphabetically (so {a,b} and {b,a} hit the same cache)
 * - For arrays, joins values with `,` (URLSearchParams would dupe the key)
 */
const buildKey = (prefix, query = {}) => {
  const parts = [];
  const flatten = (obj, scope = "") => {
    const keys = Object.keys(obj).sort();
    for (const k of keys) {
      const v = obj[k];
      const name = scope ? `${scope}.${k}` : k;
      if (v == null) continue;
      if (Array.isArray(v))            parts.push(`${name}=${v.slice().sort().join(",")}`);
      else if (typeof v === "object")  flatten(v, name);
      else                              parts.push(`${name}=${String(v)}`);
    }
  };
  flatten(query);
  return parts.length ? `${prefix}:${parts.join("&")}` : `${prefix}:all`;
};

const get = (key) => cache.get(key);

const set = (key, value, ttl) => cache.set(key, value, ttl);

/**
 * Wraps a function with caching. Returns the cached value when present,
 * otherwise calls `fn()`, caches the resolved value, and returns it. Bypass
 * the cache by passing `bypass: true`.
 */
const wrap = async (key, ttl, fn, { bypass = false } = {}) => {
  if (!bypass) {
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
  }
  const value = await fn();
  if (value !== undefined && value !== null) cache.set(key, value, ttl);
  return value;
};

const delByPrefix = (prefix) => {
  const keys = cache.keys().filter((k) => k.startsWith(prefix));
  if (keys.length) cache.del(keys);
};

const stats = () => ({
  ...cache.getStats(),
  keyCount: cache.keys().length,
});

/** Clear everything — exposed for the admin "flush cache" route. */
const flush = () => cache.flushAll();

module.exports = { get, set, wrap, delByPrefix, buildKey, stats, flush, TTL };
