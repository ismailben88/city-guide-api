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
};

const buildKey = (prefix, query = {}) => {
  const params = new URLSearchParams(query);
  params.sort();
  const qs = params.toString();
  return qs ? `${prefix}:${qs}` : `${prefix}:all`;
};

const get = (key) => cache.get(key);

const set = (key, value, ttl) => cache.set(key, value, ttl);

const delByPrefix = (prefix) => {
  const keys = cache.keys().filter((k) => k.startsWith(prefix));
  if (keys.length) cache.del(keys);
};

module.exports = { get, set, delByPrefix, buildKey, TTL };
