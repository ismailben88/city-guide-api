function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

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

function recencyScore(updatedAt) {
  if (!updatedAt) return 0;
  const days = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return clamp(1 - days / 365);
}

function scoreGuide(guide, context = {}) {
  const rating = clamp((guide.averageRating || 0) / 5);
  const reviews = clamp(Math.min(guide.reviewCount || 0, 100) / 100);
  const profile = profileCompleteness(guide);
  const specialty = specialtyMatch(guide, context.userMessage, context.preferences);
  const recent = recencyScore(guide.updatedAt);

  return (
    rating * 0.40 +
    reviews * 0.25 +
    profile * 0.15 +
    specialty * 0.15 +
    recent * 0.05
  );
}

function itemCompleteness(item) {
  const checks = [
    !!item.description && item.description.length > 30,
    !!item.address,
    (item.images?.length || 0) > 0,
    !!item.priceRange,
  ];
  return clamp(checks.filter(Boolean).length / checks.length);
}

function scorePlace(place, context = {}) {
  const rating = clamp((place.averageRating || 0) / 5);
  const reviews = clamp(Math.min(place.reviewCount || 0, 200) / 200);
  const featured = place.isFeatured ? 1 : 0;
  const verified = place.isVerifiedBusiness ? 1 : 0;
  const quality = itemCompleteness(place);
  const recent = recencyScore(place.updatedAt);

  return (
    rating * 0.35 +
    reviews * 0.20 +
    featured * 0.15 +
    verified * 0.10 +
    quality * 0.10 +
    recent * 0.10
  );
}

function scoreEvent(event, context = {}) {
  const isUpcoming = event.status === "upcoming" ? 1 : event.status === "ongoing" ? 0.7 : 0;
  const featured = event.isFeatured ? 1 : 0;
  const hasImage = event.coverImage ? 1 : 0;
  const hasDesc = event.description?.length > 30 ? 1 : 0.3;
  const free = event.ticketPrice === 0 ? 1 : clamp(1 - event.ticketPrice / 2000);
  const daysUntil = event.dateRange?.from
    ? clamp((new Date(event.dateRange.from) - Date.now()) / (1000 * 60 * 60 * 24))
    : 0.5;

  return (
    isUpcoming * 0.30 +
    featured * 0.20 +
    free * 0.15 +
    hasImage * 0.10 +
    hasDesc * 0.10 +
    daysUntil * 0.15
  );
}

module.exports = { scoreGuide, scorePlace, scoreEvent };
