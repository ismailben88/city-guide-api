const TARGET_LANGS = ["fr", "en", "ar"];
const CHUNK_SIZE   = 490; // MyMemory limite à 500 chars par requête

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chunkText = (text) => {
  const chunks = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
};

const translateChunk = async (text, target, source, attempt = 0) => {
  try {
    const email = process.env.MYMEMORY_EMAIL
      ? `&de=${encodeURIComponent(process.env.MYMEMORY_EMAIL)}`
      : "";
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}${email}`;

    const res  = await fetch(url);
    const data = await res.json();

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
    throw new Error(`MyMemory: ${data.responseStatus}`);
  } catch (err) {
    if (attempt < 2) {
      await sleep(600);
      return translateChunk(text, target, source, attempt + 1);
    }
    return text;
  }
};

const translateText = async (text, target, source) => {
  const chunks   = chunkText(text.trim().slice(0, 2000));
  const results  = [];
  for (const chunk of chunks) {
    results.push(await translateChunk(chunk, target, source));
    if (chunks.length > 1) await sleep(200);
  }
  return results.join(" ");
};

/**
 * Traduit un objet de champs vers toutes les langues cibles via MyMemory.
 * @param {Object} fields     - { name: "...", description: "..." }
 * @param {string} sourceLang - langue source ("fr"|"en"|"ar")
 * @returns {Object} { fr: {...}, en: {...}, ar: {...} }
 */
const translateFields = async (fields, sourceLang = "fr") => {
  const targets = TARGET_LANGS.filter((l) => l !== sourceLang);
  const result  = {};

  result[sourceLang] = {};
  for (const [key, value] of Object.entries(fields)) {
    result[sourceLang][key] = typeof value === "string" ? value.trim() : (value || "");
  }

  for (const lang of targets) {
    result[lang] = {};
    for (const [key, value] of Object.entries(fields)) {
      if (!value || typeof value !== "string") {
        result[lang][key] = value || "";
        continue;
      }
      result[lang][key] = await translateText(value, lang, sourceLang);
    }
  }

  return result;
};

module.exports = { translateFields };
