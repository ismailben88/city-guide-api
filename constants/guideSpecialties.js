// ─────────────────────────────────────────────────────────────────────────────
//  guideSpecialties.js — canonical guide-specialty taxonomy (single source of
//  truth for the backend). MUST stay in sync with the frontend list in
//  frontend/src/constants/guide.js (SPECIALTIES) and the i18n namespaces
//  `guide_constants.specialties.*` / `specialties.*`.
//
//  The whole product (Become-a-Guide form, hero search bar, Guides-page filter,
//  guide cards) speaks these 16 ids. The GuideProfile model enforces them via an
//  enum so free-text specialties can never re-enter the database.
// ─────────────────────────────────────────────────────────────────────────────
const GUIDE_SPECIALTIES = [
  "history", "food", "souks", "art", "photo", "music", "spiritual", "hidden",
  "cooking", "hiking", "desert", "berber", "beaches", "hammam", "family", "bike",
];

module.exports = { GUIDE_SPECIALTIES };
