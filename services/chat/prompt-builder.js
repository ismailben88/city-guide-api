const LANG_INSTRUCTIONS = {
  ar: "CRITICAL: Your entire response MUST be written in Arabic (العربية). No other language.",
  fr: "CRITICAL: Respond entirely in French (français).",
  en: "CRITICAL: Respond in English.",
  es: "CRITICAL: Respond in Spanish (español).",
};

function buildSystemPrompt(language) {
  const langRule = LANG_INSTRUCTIONS[language] || "Respond in the same language the user used.";

  return `You are an expert Moroccan tourism assistant for City Guide Morocco.

CRITICAL RULES — FOLLOW EXACTLY:
1. Use ONLY data from "TOP RESULTS" provided below. Never invent, guess, or create information.
2. NEVER mention specific names of guides, places, or events in your response text.
   Names are shown in the UI cards — describe only characteristics (rating, specialty, price).
3. If no results are found, say so clearly. Never suggest invented alternatives.
4. Keep your response to 2-3 sentences maximum. Be warm and concise.
5. No HTML, markdown lists, or bullet points in your response.

RESPONSE STYLE:
- The city you mention MUST come from the "TOP RESULTS" header only — never infer a city from the user's message
- State the city (from results header) and number of results found
- Describe the top result by its characteristics only (e.g. "The top option has a 4.8/5 rating and specializes in traditional culture")
- Never say "according to my data" — speak naturally as a helpful local expert

${langRule}`;
}

const { CITY_DISPLAY_NAMES } = require("./context-extractor");

function anonymizeGuideData(rankedData) {
  return rankedData.slice(0, 10).map((g, i) => {
    const rating  = g.averageRating ? `rating ${g.averageRating}/5` : "";
    const reviews = g.reviewCount   ? `(${g.reviewCount} reviews)` : "";
    const price   = g.pricePerHour  ? `${g.pricePerHour} MAD/hr` : "";
    const langs   = (g.spokenLanguages || []).slice(0, 3)
      .map((l) => (typeof l === "string" ? l : l.code)).join(", ");
    const specs   = (g.specialties || []).slice(0, 3).join(", ");
    const badge   = (g.badge || g._badges?.[0] || "").toUpperCase();
    return `#${i + 1}: ${rating} ${reviews} | ${price} | Languages: ${langs || "N/A"} | Specialties: ${specs || "General"}${badge ? ` [${badge}]` : ""}`.trim();
  }).join("\n");
}

function anonymizePlaceData(rankedData, categoryName) {
  return rankedData.slice(0, 10).map((p, i) => {
    const cat    = p.categoryId?.name || categoryName || "Place";
    const rating = p.averageRating ? `rating ${p.averageRating}/5` : "";
    const price  = p.priceRange ? `price: ${p.priceRange}` : "";
    const badge  = (p.badge || p._badges?.[0] || "").toUpperCase();
    const desc   = (p.description || "").substring(0, 80);
    return `#${i + 1} (${cat}): ${rating}${price ? ` | ${price}` : ""}${desc ? ` — ${desc}` : ""}${badge ? ` [${badge}]` : ""}`.trim();
  }).join("\n");
}

function anonymizeEventData(rankedData) {
  return rankedData.slice(0, 10).map((e, i) => {
    const date   = e.dateRange?.from ? new Date(e.dateRange.from).toLocaleDateString("en-GB") : "TBD";
    const price  = e.ticketPrice > 0 ? `${e.ticketPrice} MAD` : "Free";
    const badge  = (e.badge || e._badges?.[0] || "").toUpperCase();
    const desc   = (e.description || "").substring(0, 80);
    return `#${i + 1}: ${date} | ${price}${desc ? ` — ${desc}` : ""}${badge ? ` [${badge}]` : ""}`.trim();
  }).join("\n");
}

function buildResultsContext(type, rankedData, cityName, categoryName) {
  if (!rankedData?.length) {
    return "No results found for this search.";
  }

  const cityDisplay = cityName || "Morocco";
  const header = `Search: ${categoryName || "general"} in ${cityDisplay} — ${rankedData.length} result(s) found.`;

  let body;
  if (type === "guides")      body = anonymizeGuideData(rankedData);
  else if (type === "places") body = anonymizePlaceData(rankedData, categoryName);
  else if (type === "events") body = anonymizeEventData(rankedData);
  else body = `${rankedData.length} results found.`;

  return `${header}\n${body}`;
}

function buildMemoryContext(context, history) {
  const parts = [];

  if (context) {
    const ctxLines = [];
    const city = context.city ? (CITY_DISPLAY_NAMES[context.city] || context.city) : null;
    if (city) ctxLines.push(`Current city: ${city}`);
    if (context.category)             ctxLines.push(`Looking for: ${context.category}`);
    if (context.preferences?.length)  ctxLines.push(`Preferences: ${context.preferences.join(", ")}`);
    if (context.budget)               ctxLines.push(`Budget: ${context.budget}`);
    if (context.travelType)           ctxLines.push(`Travel type: ${context.travelType}`);
    if (ctxLines.length) parts.push(`Conversation context:\n${ctxLines.join("\n")}`);
  }

  if (history?.length) {
    const lines = history.slice(-4).map(
      (m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
    );
    parts.push(`Recent history:\n${lines.join("\n")}`);
  }

  return parts.join("\n\n");
}

function buildFullPrompt(context, history, type, rankedData, cityName, categoryName, userMessage) {
  const systemPrompt   = buildSystemPrompt(context.language);
  const resultsContext = buildResultsContext(type, rankedData, cityName, categoryName);
  const memoryContext  = buildMemoryContext(context, history);

  const messages = [{ role: "system", content: systemPrompt }];

  messages.push({
    role: "system",
    content: `TOP RESULTS (pre-ranked by backend, do not reorder):\n${resultsContext}`,
  });

  if (memoryContext) {
    messages.push({ role: "system", content: memoryContext });
  }

  messages.push({ role: "user", content: userMessage });

  return messages;
}

module.exports = { buildSystemPrompt, buildResultsContext, buildMemoryContext, buildFullPrompt };
