const NodeCache = require("node-cache");

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const TTL = {
  CITIES:     3600, // 1h
  CATEGORIES: 3600, // 1h
  GUIDES:      600, // 10 min
  EVENTS:      300, // 5 min
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
