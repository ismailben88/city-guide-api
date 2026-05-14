const FALLBACK_ORDER = ["en", "fr"];

const applyTranslation = (doc, lang) => {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return doc;
  if (!doc.translations || typeof doc.translations !== "object") return doc;

  const order = [lang, ...FALLBACK_ORDER.filter((l) => l !== lang)];
  let translatedFields = null;

  for (const l of order) {
    const t = doc.translations[l];
    if (t && typeof t === "object" && Object.keys(t).length > 0) {
      translatedFields = t;
      break;
    }
  }

  if (!translatedFields) return doc;

  const result = { ...doc };
  Object.assign(result, translatedFields);
  delete result.translations;
  delete result.sourceLang;
  delete result.translationStatus;

  return result;
};

const processValue = (value, lang) => {
  if (Array.isArray(value)) return value.map((item) => applyTranslation(item, lang));
  if (value && typeof value === "object") return applyTranslation(value, lang);
  return value;
};

module.exports = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = function (data) {
    const lang = req.lang || "fr";

    let plain;
    try {
      plain = JSON.parse(JSON.stringify(data));
    } catch {
      return originalJson(data);
    }

    if (plain && typeof plain === "object") {
      if (Array.isArray(plain)) {
        plain = plain.map((item) => applyTranslation(item, lang));
      } else {
        const processed = {};
        for (const [key, value] of Object.entries(plain)) {
          processed[key] = processValue(value, lang);
        }
        plain = processed;
      }
    }

    return originalJson(plain);
  };

  next();
};
