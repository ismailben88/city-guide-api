// ─────────────────────────────────────────────────────────────────────────────
//  eventCategories.js — canonical event-category taxonomy (single source of
//  truth for the backend). MUST stay in sync with the frontend list in
//  frontend/src/constants/events.js (EVENT_CATEGORIES) and the i18n namespace
//  `events.categories.*`.
//
//  The whole product (admin event form, hero search bar, Events-page filter,
//  event cards) speaks these 10 ids. The Event model enforces them via an enum.
// ─────────────────────────────────────────────────────────────────────────────
const EVENT_CATEGORIES = [
  "music", "concert", "festival", "art", "exhibition",
  "theatre", "culture", "sport", "workshop", "other",
];

module.exports = { EVENT_CATEGORIES };
