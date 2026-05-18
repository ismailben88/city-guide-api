const CITY_KEYWORDS = {
  // fuzzy patterns handle 1-2 letter typos for commonly misspelled cities
  marrakech:    /ma?rr?akech|marrakesh|مراكش/i,
  fes:          /f[eè]s?|fez|فاس/i,
  casablanca:   /cas[ae]bl[ae]n[ck]a|dar el beida|الدار البيضاء|casa\b/i,
  rabat:        /\brabat\b|الرباط/i,
  tangier:      /tangi?e?r|tanger|طنجة/i,
  agadir:       /agadir|أكادير/i,
  essaouira:    /essaou?ira|الصويرة/i,
  chefchaouen:  /ch[ae]fch[ae]ou[ae]n|chaouen|شفشاون/i,
  ouarzazate:   /ouarzazate|ورزازات/i,
  meknes:       /mekn[eè]s|meknas|مكناس/i,
  ifrane:       /ifrane|إفران/i,
  merzouga:     /merzouga|مرزوكة/i,
  tetouan:      /t[eé]tou?an|تطوان/i,
  oujda:        /oujda|وجدة/i,
  kenitra:      /k[eé]nitra|القنيطرة/i,
  safi:         /\bsafi\b|آسفي/i,
  "el-jadida":  /el.?jadida|الجديدة/i,
  nador:        /\bnador\b|الناظور/i,
  asilah:       /as+il[ae]h?|أصيلة/i,
  dakhla:       /dakhla|الداخلة/i,
  "al-hoceima": /al.?hoc[eé]ima|الحسيمة/i,
  zagora:       /zagora|زاكورة/i,
  taroudant:    /taroudant|تارودانت/i,
  tiznit:       /tiznit|تيزنيت/i,
  berkane:      /berkane|بركان/i,
  larache:      /larache|العرائش/i,
};

const CATEGORY_KEYWORDS = {
  restaurants:      /restaurant|eat|manger|resto|مطعم|اكل|طعام/i,
  cafes:            /caf[eè]|coffee|قهوة|مقهى/i,
  hotels:           /hotel|stay|loger|lodging|riad|فندق|سكن|رياض|نزل/i,
  beaches:          /beach|plage|شاطئ|بحر/i,
  "site-historique": /historical|history|histoire|historique|site|monument|تاريخ|تاريخي|أثري/i,
  musee:            /museum|mus[eè]e|متحف/i,
  "parc-jardin":    /park|garden|parc|jardin|حديقة/i,
  "marche-souk":    /market|souk|march[eè]|shopping|سوق|تسوق/i,
  guides:           /guide|مرشد|دليل|مرشد سياحي/i,
  events:           /event|concert|festival|exhibition|spectacle|فعالية|حفل|مهرجان/i,
};

const LANGUAGE_KEYWORDS = [
  { lang: "ar", patterns: [/arabic|العربية|عربي|بالعربية/i] },
  { lang: "fr", patterns: [/french|fran[cç]ais|francais|فرنسي|بالفرنسية/i] },
  { lang: "en", patterns: [/english|anglais|إنجليزي|بالانجليزية/i] },
  { lang: "es", patterns: [/spanish|espa[ñn]ol|إسباني/i] },
];

const BUDGET_KEYWORDS = [
  { level: "low",    patterns: [/budget|cheap|economy|pas cher|bon march[eé]|رخيص|اقتصادي/i] },
  { level: "medium", patterns: [/mid.?range|moderate|moyen|متوسط/i] },
  { level: "high",   patterns: [/luxury|luxe|haut de gamme|فاخر|راقي/i] },
];

const TRAVEL_TYPE_KEYWORDS = [
  { type: "family",    patterns: [/family|familial|familly|عائلة|اطفال|enfants/i] },
  { type: "solo",      patterns: [/solo|seul|alone|وحيد|مفرد/i] },
  { type: "business",  patterns: [/business|affaires|أعمال/i] },
  { type: "romantic",  patterns: [/romantic|romance|romantique|رومانسي|couple/i] },
  { type: "adventure", patterns: [/adventure|aventure|مغامرة/i] },
  { type: "cultural",  patterns: [/cultural|culturel|ثقافي/i] },
];

function extractCity(message) {
  for (const [slug, regex] of Object.entries(CITY_KEYWORDS)) {
    if (regex.test(message)) return slug;
  }
  return null;
}

function extractCategory(message) {
  for (const [slug, regex] of Object.entries(CATEGORY_KEYWORDS)) {
    if (regex.test(message)) return slug;
  }
  return null;
}

function extractLanguage(message) {
  for (const entry of LANGUAGE_KEYWORDS) {
    if (entry.patterns.some((p) => p.test(message))) return entry.lang;
  }
  return null;
}

// Detect language from the script/characters used in the message.
// Returns "en" as default so the language always updates on every message,
// preventing a single French/Arabic question from locking the session language forever.
function autoDetectLanguage(message) {
  if (/[؀-ۿ]/.test(message)) return "ar";
  if (/\b(je|tu|il|elle|nous|vous|ils|les|des|du|est|sont|pour|avec|dans|sur|une|comment|quels?|meilleurs?)\b/i.test(message)) return "fr";
  return "en";
}

function extractBudget(message) {
  const priceMatch = message.match(/(\d+)\s*(mad|dh|د\.م|€|\$)/i);
  if (priceMatch) {
    const amount = parseInt(priceMatch[1]);
    if (amount <= 200) return "low";
    if (amount <= 800) return "medium";
    return "high";
  }
  for (const entry of BUDGET_KEYWORDS) {
    if (entry.patterns.some((p) => p.test(message))) return entry.level;
  }
  return null;
}

function extractTravelType(message) {
  for (const entry of TRAVEL_TYPE_KEYWORDS) {
    if (entry.patterns.some((p) => p.test(message))) return entry.type;
  }
  return null;
}

function extractPreferences(message) {
  const prefs = [];
  if (/rooftop|terrasse|terrace|سطح/i.test(message))             prefs.push("rooftop");
  if (/quiet|calme|هادئ|هدوء/i.test(message))                   prefs.push("quiet");
  if (/lively|anim[eé]|حيوي/i.test(message))                    prefs.push("lively");
  if (/modern|moderne|حديث/i.test(message))                      prefs.push("modern");
  if (/traditional|traditionnel|تقليدي/i.test(message))         prefs.push("traditional");
  if (/view|vue|منظر|اطلالة/i.test(message))                    prefs.push("scenic_view");
  if (/halal|حلال/i.test(message))                               prefs.push("halal");
  if (/vegetarian|v[eé]g[eé]tarien|نباتي/i.test(message))       prefs.push("vegetarian");
  return prefs;
}

function isProximityReference(message) {
  return /nearby|near\b|close to|proche|pr[èe]s|à côté|قريب|بالقرب/i.test(message);
}

function isFollowUp(message) {
  const trimmed = message.trim();
  return /^(et |and |also|aussi|et aussi|or |ou |what about|qu'en est-il|how about|show me also|و |أيضاً|كمان|كذلك)/i.test(trimmed)
    || /\b(more|plus|encore|suite|other|autre|again|encore|show more|more results|اكثر|المزيد|أكثر|عرض المزيد|continue|continuer)\b/i.test(trimmed);
}

function extractAll(message) {
  const explicit = extractLanguage(message);
  return {
    city:         extractCity(message),
    category:     extractCategory(message),
    language:     explicit || autoDetectLanguage(message),
    budget:       extractBudget(message),
    travelType:   extractTravelType(message),
    preferences:  extractPreferences(message),
    isProximity:  isProximityReference(message),
    isFollowUp:   isFollowUp(message),
  };
}

const CITY_DISPLAY_NAMES = {
  marrakech:    "Marrakech",
  fes:          "Fès",
  casablanca:   "Casablanca",
  rabat:        "Rabat",
  tangier:      "Tangier",
  agadir:       "Agadir",
  essaouira:    "Essaouira",
  chefchaouen:  "Chefchaouen",
  ouarzazate:   "Ouarzazate",
  meknes:       "Meknès",
  ifrane:       "Ifrane",
  merzouga:     "Merzouga",
  tetouan:      "Tétouan",
  oujda:        "Oujda",
  kenitra:      "Kénitra",
  safi:         "Safi",
  "el-jadida":  "El Jadida",
  nador:        "Nador",
  asilah:       "Asilah",
  dakhla:       "Dakhla",
  "al-hoceima": "Al Hoceima",
  zagora:       "Zagora",
  taroudant:    "Taroudant",
  tiznit:       "Tiznit",
  berkane:      "Berkane",
  larache:      "Larache",
};

module.exports = {
  extractCity,
  extractCategory,
  extractLanguage,
  autoDetectLanguage,
  extractBudget,
  extractTravelType,
  extractPreferences,
  isProximityReference,
  isFollowUp,
  extractAll,
  CITY_KEYWORDS,
  CATEGORY_KEYWORDS,
  CITY_DISPLAY_NAMES,
};
