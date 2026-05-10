const Place = require("../models/Place");
const City = require("../models/City");
const Category = require("../models/Category");
const GuideProfile = require("../models/GuideProfile");
const User = require("../models/User");

let groq = null;

function getGroq() {
  if (!groq) {
    const Groq = require("groq-sdk");
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groq;
}

const CITY_KEYWORDS = {
  marrakech: /marrakech|مراكش/i,
  fes: /f[eè]s?|fez|فاس/i,
  casablanca: /casablanca|dar el beida|الدار البيضاء|casa/i,
  rabat: /rabat|الرباط/i,
  tangier: /tanger|tangier|طنجة/i,
  agadir: /agadir|أكادير/i,
  essaouira: /essaouira|الصويرة/i,
  chefchaouen: /chefchaouen|chaouen|شفشاون/i,
  ouarzazate: /ouarzazate|ورزازات/i,
  meknes: /mekn[eè]s|مكناس/i,
  ifrane: /ifrane|إفران/i,
  merzouga: /merzouga|مرزوكة/i,
};

const CATEGORY_KEYWORDS = {
  restaurants: /restaurant|eat|manger|resto|مطعم|اكل/i,
  cafes: /caf[eè]|coffee|قهوة|مقهى/i,
  hotels: /hotel|stay|loger|lodging|riad|فندق|سكن/i,
  beaches: /beach|plage|شاطئ|بحر/i,
  "site-historique": /historical|history|histoire|historique|site|monument|تاريخ|تاريخي/i,
  musee: /museum|mus[eè]e|متحف/i,
  "parc-jardin": /park|garden|parc|jardin|حديقة/i,
  "marche-souk": /market|souk|march[eè]|shopping|سوق|تسوق/i,
  guides: /guide|مرشد|دليل/i,
};

const CATEGORY_DB_SLUGS = {
  restaurants: "restaurant",
  cafes: "cafe",
  hotels: "riad-stay",
  beaches: "plage",
  "site-historique": "site-historique",
  musee: "musee",
  "parc-jardin": "parc-jardin",
  "marche-souk": "marche-souk",
};

function detectCity(message) {
  for (const [slug, regex] of Object.entries(CITY_KEYWORDS)) {
    if (regex.test(message)) return slug;
  }
  return null;
}

function detectCategory(message) {
  for (const [slug, regex] of Object.entries(CATEGORY_KEYWORDS)) {
    if (regex.test(message)) return slug;
  }
  return null;
}

async function searchDatabase(citySlug, categorySlug) {
  const results = {};

  try {
    if (citySlug) {
      const city = await City.findOne({ slug: citySlug, isActive: true });
      if (city) results.city = city;
    }

    if (categorySlug && categorySlug !== "guides") {
      let dbSlug = CATEGORY_DB_SLUGS[categorySlug] || categorySlug;
      const category = await Category.findOne({ slug: dbSlug, status: "active" });
      if (category) {
        const filter = { categoryId: category._id, status: "active" };
        if (results.city) filter.cityId = results.city._id;
        const places = await Place.find(filter)
          .populate("cityId", "name slug")
          .populate("categoryId", "name slug icon")
          .sort({ averageRating: -1 })
          .limit(5);
        results.places = places;
        results.category = category;
      }
    }

    if (categorySlug === "guides") {
      const filter = { isCurrentlyAvailable: true, verificationStatus: "verified" };
      if (results.city) filter.cityIds = results.city._id;
      results.guides = await GuideProfile.find(filter)
        .populate("userId", "firstName lastName avatarUrl")
        .sort({ averageRating: -1 })
        .limit(5);
    }

    if (!citySlug && !categorySlug) {
      const topPlaces = await Place.find({ status: "active" })
        .populate("cityId", "name slug")
        .populate("categoryId", "name slug icon")
        .sort({ averageRating: -1 })
        .limit(5);
      results.places = topPlaces;
    }
  } catch (dbErr) {
    console.error("[ChatService] Database query error:", dbErr.message);
  }

  return results;
}

function buildSystemPrompt() {
  return `You are "City Guide Morocco", an enthusiastic and knowledgeable tourist assistant specialized in Morocco tourism. You help tourists discover the best experiences Morocco has to offer.

Capabilities:
- Recommend tourist places, restaurants, hotels, cafés, beaches, historical sites, and local guides across all Moroccan cities
- Answer in French, English, or Arabic based on the user's language
- Provide practical travel tips (best time to visit, local customs, transport options)

Guidelines:
1. When database results are provided in the context, use them as your primary source. Present them in a friendly, organized way.
2. If no database results exist, use your general knowledge about Morocco to give helpful recommendations.
3. Always mention the city name in your response.
4. Be warm, welcoming, and enthusiastic about Morocco.
5. Keep responses concise but informative — aim for 3-5 specific recommendations.
6. Include practical tips when relevant (e.g., dress codes, bargaining tips, safety).
7. If the user asks something outside tourism, politely redirect to Morocco travel topics.
8. Format responses with short paragraphs or bullet points for readability.
9. Never invent specific business details (addresses, phone numbers, prices). If you don't know exact details, suggest the user check locally.`;
}

function buildUserContext(dbResults) {
  const parts = [];

  if (dbResults.city) {
    parts.push(`City: ${dbResults.city.name}`);
  }

  if (dbResults.category) {
    parts.push(`Category: ${dbResults.category.name}`);
  }

  if (dbResults.places && dbResults.places.length > 0) {
    const placeLines = dbResults.places.map(
      (p, i) =>
        `${i + 1}. ${p.name}${p.description ? ` — ${p.description.substring(0, 120)}` : ""}${p.averageRating ? ` Rating: ${p.averageRating}/5` : ""}${p.priceRange ? ` Price: ${p.priceRange}` : ""}${p.address ? ` Location: ${p.address}` : ""}`
    );
    parts.push("Places found in our database:", ...placeLines);
  }

  if (dbResults.guides && dbResults.guides.length > 0) {
    const guideLines = dbResults.guides.map(
      (g, i) =>
        `${i + 1}. ${g.userId ? g.userId.firstName + " " + g.userId.lastName : "Local Guide"}${g.tagline ? ` — ${g.tagline}` : ""}${g.specialties && g.specialties.length > 0 ? ` Specialties: ${g.specialties.join(", ")}` : ""}${g.pricePerHour ? ` Price: $${g.pricePerHour}/hour` : ""}${g.averageRating ? ` Rating: ${g.averageRating}/5` : ""}`
    );
    parts.push("Local guides found in our database:", ...guideLines);
  }

  return parts.join("\n");
}

async function getGroqResponse(systemPrompt, userContext, userMessage) {
  const messages = [
    { role: "system", content: systemPrompt },
  ];

  if (userContext) {
    messages.push({
      role: "system",
      content: `Here is relevant data from our Morocco tourism database:\n${userContext}`,
    });
  }

  messages.push({ role: "user", content: userMessage });

  const completion = await getGroq().chat.completions.create({
    messages,
    model: "llama-3.1-8b-instant",
    temperature: 0.7,
    max_tokens: 1024,
    top_p: 0.9,
  });

  return completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that request. Please try again.";
}

function buildFallbackResponse(dbResults) {
  if (dbResults.places && dbResults.places.length > 0) {
    const cityName = dbResults.city ? dbResults.city.name : "Morocco";
    const categoryName = dbResults.category ? dbResults.category.name : "places";
    const placeList = dbResults.places
      .map((p) => `- **${p.name}**${p.description ? `: ${p.description.substring(0, 100)}` : ""}${p.averageRating ? ` (${p.averageRating}/5)` : ""}`)
      .join("\n");
    return `Here are some great ${categoryName} in ${cityName}:\n\n${placeList}\n\nFor more details, feel free to ask!`;
  }

  if (dbResults.guides && dbResults.guides.length > 0) {
    const guideList = dbResults.guides
      .map((g) => `- **${g.userId ? g.userId.firstName + " " + g.userId.lastName : "Local Guide"}**${g.tagline ? `: ${g.tagline}` : ""}${g.pricePerHour ? ` ($${g.pricePerHour}/hour)` : ""}`)
      .join("\n");
    return `Here are available local guides:\n\n${guideList}\n\nYou can contact them through our platform for booking!`;
  }

  return null;
}

async function processMessage(userMessage) {
  const citySlug = detectCity(userMessage);
  const categorySlug = detectCategory(userMessage);

  const dbResults = await searchDatabase(citySlug, categorySlug);

  const systemPrompt = buildSystemPrompt();
  const userContext = buildUserContext(dbResults);

  let aiResponse;
  try {
    aiResponse = await getGroqResponse(systemPrompt, userContext, userMessage);
  } catch (err) {
    console.error("[ChatService] Groq API error:", err.message);
    aiResponse = buildFallbackResponse(dbResults) || "I'm having trouble connecting to my AI service. Please try again later or check our website's listings directly.";
  }

  return {
    response: aiResponse,
    dbResults: {
      hasCity: !!dbResults.city,
      hasPlaces: !!(dbResults.places && dbResults.places.length > 0),
      hasGuides: !!(dbResults.guides && dbResults.guides.length > 0),
      cityName: dbResults.city ? dbResults.city.name : null,
    },
  };
}

module.exports = { processMessage };
