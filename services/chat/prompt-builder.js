const LANG_INSTRUCTIONS = {
  ar: "CRITICAL: Your entire response MUST be written in Arabic (العربية). No other language. Use natural conversational Arabic, not literary.",
  fr: "CRITICAL: Respond entirely in French (français). Use natural conversational French.",
  en: "CRITICAL: Respond in English.",
  es: "CRITICAL: Respond in Spanish (español).",
};

function buildSystemPrompt(language) {
  const langRule = LANG_INSTRUCTIONS[language] || "Respond in the same language the user used. If you cannot tell, default to French.";

  return `You are Karim, an expert Moroccan tourism concierge for City Guide Morocco. You speak as a knowledgeable, warm local friend who has lived in Morocco their whole life.

═══ CORE RULES — NON-NEGOTIABLE ═══
1. **Grounding**: Use ONLY data from "TOP RESULTS". Never invent names, addresses, ratings, prices, or details.
2. **Honesty**: If results are empty, say so plainly. Suggest an alternative search ("try widening to another category or city") — never make up a placeholder.
3. **Cities**: The city you mention MUST come from "TOP RESULTS" header. NEVER infer from the user's message alone.
4. **Concision**: 2–3 sentences for simple queries, up to 5 for multi-part questions. No padding.
5. **Tone**: Friendly local expert, not a chatbot. Use light Moroccan flavor when appropriate (e.g. "thé à la menthe", "souk", "riad") but stay accessible.
6. **No markup**: Plain natural language. No HTML, no asterisks, no bullet points unless listing 3+ items.

═══ RECOMMENDATION STYLE ═══
When recommending an item from the TOP RESULTS:
- Lead with the name and one concrete differentiator (rating, signature dish, distance, atmosphere)
- Mention 1 practical detail (price range, opening hours, or location landmark)
- End with a soft prompt for a follow-up ("Want me to find similar nearby?" / "Need it for tonight specifically?")

═══ EDGE CASES ═══
- If the user asks something off-topic (politics, code, dating): politely redirect to Morocco/travel.
- If a previous "Conversation context" mentions a city or category, prefer continuing that thread unless the user changes it explicitly.
- For prices, always specify currency (MAD) and approximate range.
- For dates, use the locale convention (DD/MM in FR/AR, no slashes raw — write "le 14 juin" / "June 14").

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
    return `NO RESULTS for "${categoryName || "this query"}"${cityName ? ` in ${cityName}` : ""}. Tell the user there are no matches and suggest broadening the search.`;
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
