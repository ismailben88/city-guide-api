const { randomUUID } = require("crypto");
const searchService  = require("./chat/search.service");
const rankingService = require("./chat/ranking.service");
const contextService = require("./chat/contextService");
const promptBuilder  = require("./chat/prompt-builder");

let groq = null;

function getGroq() {
  if (!groq) {
    const Groq = require("groq-sdk");
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groq;
}

function determineType(categorySlug, dbResults) {
  if (categorySlug === "events" && dbResults.events?.length > 0) return "events";
  if (categorySlug === "guides" && dbResults.guides?.length > 0) return "guides";
  if (dbResults.places?.length > 0) return "places";
  return "general";
}

async function getGroqResponse(messages) {
  const completion = await getGroq().chat.completions.create({
    messages,
    model: "llama-3.3-70b-versatile",
    temperature: 0.6,
    max_tokens: 512,
    top_p: 0.9,
  });
  return completion.choices[0]?.message?.content || "I found some great options for you! Check out the results below.";
}

function buildFallbackMessage(type, rankedData, cityName, categoryName) {
  if (!rankedData?.length) return "No results found. Try a different city or category!";

  const top      = rankedData[0];
  const city     = cityName || "Morocco";
  const category = categoryName || "recommendations";

  if (type === "guides") {
    return `Here are the best available guides in ${city}. Our top pick has a ${top.averageRating}/5 rating with ${top.reviewCount || 0} reviews!`;
  }
  if (type === "places") {
    return `Here are the best ${category} in ${city}. The top option has a ${top.averageRating}/5 rating!`;
  }
  if (type === "events") {
    return `Here are upcoming events in ${city}. Check out the top event with ${top.averageRating ? `${top.averageRating}/5` : "great reviews"}!`;
  }
  return `Here are our top ${category} in ${city}!`;
}

async function processMessage(userMessage, sessionId) {
  // Never use "default" — each client must own a unique session
  const sid = sessionId && sessionId !== "default" ? sessionId : randomUUID();

  contextService.initSession(sid);

  const { resolved } = contextService.processMessage(sid, userMessage);

  const citySlug     = resolved.city;
  const categorySlug = resolved.category;

  const dbResults = await searchService.runSearch(citySlug, categorySlug, resolved.language);
  const type      = determineType(categorySlug, dbResults);
  const rawData   = dbResults[type] || [];

  let rankedData = [];
  if (rawData.length > 0) {
    // Pass resolved context so specialtyMatch can use preferences + userMessage
    rankedData = rankingService.rank(type, rawData, resolved, userMessage);
    contextService.updateSearchContext(sid, type, rankedData, categorySlug);
  }

  const cityName     = dbResults.city?.name || null;
  const categoryName = dbResults.category?.name || categorySlug || null;
  const history      = contextService.getHistory(sid);

  const messages = promptBuilder.buildFullPrompt(
    resolved,
    history,
    type,
    rankedData,
    cityName,
    categoryName,
    userMessage
  );

  let aiMessage;
  try {
    aiMessage = await getGroqResponse(messages);
  } catch (err) {
    console.error("[ChatService] Groq API error:", err.message);
    aiMessage = buildFallbackMessage(type, rankedData, cityName, categoryName);
  }

  contextService.saveMessages(sid, userMessage, aiMessage, type, rankedData);

  return { message: aiMessage, type, data: rankedData, sessionId: sid };
}

module.exports = { processMessage };
