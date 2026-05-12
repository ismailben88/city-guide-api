const contextExtractor = require("./context-extractor");

function resolve(currentContext, extracted, rawMessage) {
  const resolved = { ...currentContext };

  // New city mentioned → fresh query, reset category and preferences
  if (extracted.city) {
    resolved.city = extracted.city;
    resolved.category = extracted.category || null;
    resolved.preferences = [];
  } else if (extracted.category) {
    // New category detected → update it
    resolved.category = extracted.category;
  } else if (extracted.isFollowUp) {
    // Follow-up question: keep existing context (city + category)
  } else {
    // Non-follow-up without new city or category: keep city, reset category
    // This prevents "place en casablanca" from inheriting "guides" from previous message
    resolved.category = null;
  }

  if (extracted.language) {
    resolved.language = extracted.language;
  }

  if (extracted.budget) {
    resolved.budget = extracted.budget;
  }

  if (extracted.travelType) {
    resolved.travelType = extracted.travelType;
  }

  if (extracted.preferences.length > 0) {
    const existing = new Set(resolved.preferences || []);
    for (const p of extracted.preferences) {
      existing.add(p);
    }
    resolved.preferences = [...existing];
  }

  if (extracted.isFollowUp) {
    resolved.isFollowUp = true;
  }

  if (extracted.isProximity && resolved.lastLocation) {
    resolved.nearLocation = resolved.lastLocation;
  }

  return resolved;
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

function buildContextSummary(context) {
  const parts = [];
  if (context.city) {
    parts.push(`Current city: ${CITY_DISPLAY_NAMES[context.city] || context.city}`);
  }
  if (context.category) parts.push(`Looking for: ${context.category}`);
  if (context.budget) parts.push(`Budget range: ${context.budget}`);
  if (context.travelType) parts.push(`Travel type: ${context.travelType}`);
  if (context.preferences?.length > 0) {
    parts.push(`Preferences: ${context.preferences.join(", ")}`);
  }
  return parts.join("\n");
}

function getFullContextSnapshot(context, recentHistory) {
  return {
    context: buildContextSummary(context),
    recentHistory: recentHistory.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    lastSearchType: context.lastSearchType,
  };
}

module.exports = { resolve, buildContextSummary, getFullContextSnapshot };
