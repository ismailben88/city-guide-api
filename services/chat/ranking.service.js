const scoringService = require("./scoring.service");

const BADGE_THRESHOLDS = {
  guide: { topRated: 4.5, popular: 20 },
  place: { topRated: 4.5, popular: 50 },
  event: { topRated: null, popular: null },
};

function computeBadges(item, type, rank) {
  const badges = [];
  if (rank === 0) badges.push("best_match");
  if (BADGE_THRESHOLDS[type]?.topRated && (item.averageRating || 0) >= BADGE_THRESHOLDS[type].topRated) {
    badges.push("top_rated");
  }
  if (BADGE_THRESHOLDS[type]?.popular && (item.reviewCount || 0) >= BADGE_THRESHOLDS[type].popular) {
    badges.push("popular");
  }
  return badges;
}

function normalize(items, type, context = {}, userMessage = "") {
  if (!items?.length) return [];

  // Extract only primitives — never spread lastSearchResults (Mongoose docs / large objects)
  const ctx = {
    userMessage,
    preferences: context.preferences || [],
    budget:      context.budget      || null,
    travelType:  context.travelType  || null,
    language:    context.language    || null,
  };

  const scored = items.map((item) => {
    let score;
    if (type === "guides")       score = scoringService.scoreGuide(item, ctx);
    else if (type === "places")  score = scoringService.scorePlace(item, ctx);
    else if (type === "events")  score = scoringService.scoreEvent(item, ctx);
    else score = 0.5;
    return {
      item: item.toObject ? item.toObject() : { ...item },
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.map((entry, i) => {
    const badges = computeBadges(entry.item, type, i);
    entry.item._rank   = i;
    entry.item.rank    = i + 1;
    entry.item._score  = parseFloat(entry.score.toFixed(4));
    entry.item._badges = badges;
    entry.item.badge   = badges[0] ? badges[0].toUpperCase() : null;
    return entry.item;
  });
}

const rankGuides = (guides, context, userMessage) => normalize(guides, "guides", context, userMessage);
const rankPlaces = (places, context, userMessage) => normalize(places, "places", context, userMessage);
const rankEvents = (events, context, userMessage) => normalize(events, "events", context, userMessage);

function rank(type, items, context = {}, userMessage = "") {
  if (type === "guides") return rankGuides(items, context, userMessage);
  if (type === "places") return rankPlaces(items, context, userMessage);
  if (type === "events") return rankEvents(items, context, userMessage);
  return items || [];
}

module.exports = { rankGuides, rankPlaces, rankEvents, rank };
