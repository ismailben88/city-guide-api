function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

// ── Guide scoring helpers ─────────────────────────────────────────────────────

function profileCompleteness(guide) {
  const checks = [
    !!guide.tagline,
    !!guide.bio,
    !!guide.bannerUrl,
    (guide.specialties?.length || 0) > 0,
    (guide.spokenLanguages?.length || 0) > 0,
    guide.pricePerHour > 0,
    (guide.schedule?.length || 0) > 0,
  ];
  return clamp(checks.filter(Boolean).length / checks.length);
}

function specialtyMatch(guide, userMessage, preferences) {
  if (!guide.specialties?.length) return 0.3;
  const allText = [userMessage || "", ...(preferences || [])].join(" ").toLowerCase();
  const keywords = [
    "history", "historical", "food", "culinary", "culture", "cultural", "nature",
    "hiking", "desert", "mountain", "city", "walking", "photography", "shopping",
    "nightlife", "adventure", "family", "romantic", "solo", "business", "luxury", "budget",
  ];
  const matchedKeywords = keywords.filter((kw) => allText.includes(kw));
  if (!matchedKeywords.length) return 0.5;
  const matched = guide.specialties.filter((s) =>
    matchedKeywords.some((kw) => s.toLowerCase().includes(kw))
  ).length;
  if (!matched) return 0.2;
  return clamp(matched / guide.specialties.length);
}

// Bonus when guide speaks the user's detected language — soft factor, not a hard filter
function languageBonus(guide, language) {
  if (!language || !guide.spokenLanguages?.length) return 0.5;
  const matches = guide.spokenLanguages.some((l) => {
    const code = (typeof l === "string" ? l : l.code || "").toLowerCase();
    return code.startsWith(language.toLowerCase());
  });
  return matches ? 1.0 : 0.3;
}

function recencyScore(updatedAt) {
  if (!updatedAt) return 0;
  const days = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return clamp(1 - days / 365);
}

function scoreGuide(guide, context = {}) {
  const rating    = clamp((guide.averageRating || 0) / 5);
  const reviews   = clamp(Math.min(guide.reviewCount || 0, 100) / 100);
  const profile   = profileCompleteness(guide);
  const specialty = specialtyMatch(guide, context.userMessage, context.preferences);
  const lang      = languageBonus(guide, context.language);
  const recent    = recencyScore(guide.updatedAt);

  return (
    rating    * 0.35 +
    reviews   * 0.20 +
    profile   * 0.10 +
    specialty * 0.13 +
    lang      * 0.17 +   // language match is important for guide selection
    recent    * 0.05
  );
}

// ── Place scoring helpers ─────────────────────────────────────────────────────

function itemCompleteness(item) {
  const checks = [
    !!item.description && item.description.length > 30,
    !!item.address,
    (item.images?.length || 0) > 0,
    !!item.priceRange,
  ];
  return clamp(checks.filter(Boolean).length / checks.length);
}

// Boost places whose price tier matches the user's stated budget
function budgetAlignment(place, budget) {
  if (!budget || !place.priceRange) return 0.5;
  const dollarCount = (place.priceRange.match(/\$/g) || []).length;
  if (!dollarCount) return 0.5;
  if (budget === "low")    return dollarCount === 1 ? 1.0 : dollarCount === 2 ? 0.45 : 0.15;
  if (budget === "medium") return dollarCount === 2 ? 1.0 : 0.5;
  if (budget === "high")   return dollarCount >= 3  ? 1.0 : dollarCount === 2 ? 0.6 : 0.25;
  return 0.5;
}

// Boost places that match the user's travel style (family, romantic, adventure…)
function travelTypeMatch(place, travelType) {
  if (!travelType) return 0.5;
  const text = [
    place.description || "",
    place.categoryId?.name || "",
    ...(place.tags || []),
  ].join(" ").toLowerCase();

  const patterns = {
    family:    /family|kids|children|parc|jardin|plage|beach|enfants/i,
    romantic:  /romantic|couple|intimate|vue|view|rooftop|terrasse|spa|riad/i,
    adventure: /adventure|outdoor|hiking|trek|surf|randonn|desert|escalade/i,
    cultural:  /cultur|histor|museum|musée|monument|médina|site|patrimoine/i,
    solo:      /backpack|hostel|solo|budget/i,
    business:  /business|conference|meeting|coworking|affaires/i,
  };

  const pattern = patterns[travelType];
  return pattern && pattern.test(text) ? 1.0 : 0.4;
}

function scorePlace(place, context = {}) {
  const rating     = clamp((place.averageRating || 0) / 5);
  const reviews    = clamp(Math.min(place.reviewCount || 0, 200) / 200);
  const featured   = place.isFeatured ? 1 : 0;
  const verified   = place.isVerifiedBusiness ? 1 : 0;
  const quality    = itemCompleteness(place);
  const recent     = recencyScore(place.updatedAt);
  const budget     = budgetAlignment(place, context.budget);
  const travelType = travelTypeMatch(place, context.travelType);

  return (
    rating     * 0.30 +
    reviews    * 0.18 +
    featured   * 0.12 +
    verified   * 0.08 +
    quality    * 0.10 +
    recent     * 0.05 +
    budget     * 0.10 +
    travelType * 0.07
  );
}

// ── Event scoring ─────────────────────────────────────────────────────────────

function scoreEvent(event, context = {}) {
  const isUpcoming = event.status === "upcoming" ? 1 : event.status === "ongoing" ? 0.7 : 0;
  const featured   = event.isFeatured ? 1 : 0;
  const hasImage   = event.coverImage ? 1 : 0;
  const hasDesc    = event.description?.length > 30 ? 1 : 0.3;

  // Budget-aware: for high-budget users, a paid event can signal quality
  let free;
  if (context.budget === "high") {
    free = event.ticketPrice === 0 ? 0.5 : clamp(1 - event.ticketPrice / 3000);
  } else {
    free = event.ticketPrice === 0 ? 1 : clamp(1 - event.ticketPrice / 2000);
  }

  // Favor imminent events — an event 7 days away scores ~0.92, 90 days = 0, >90 = 0
  const rawDays  = event.dateRange?.from
    ? (new Date(event.dateRange.from).getTime() - Date.now()) / 86_400_000
    : 30;
  const daysUntil = rawDays <= 0 ? 0.5 : clamp(1 - rawDays / 90);

  return (
    isUpcoming * 0.30 +
    featured   * 0.20 +
    free       * 0.10 +
    hasImage   * 0.10 +
    hasDesc    * 0.10 +
    daysUntil  * 0.20
  );
}

module.exports = { scoreGuide, scorePlace, scoreEvent };
