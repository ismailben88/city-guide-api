// Constantes globales partagées entre toute l'application

const USER_ROLES = Object.freeze({
  VISITOR:      "visitor",
  USER:         "user",
  GUIDE:        "guide",
  ENTREPRENEUR: "entrepreneur",
  ADMIN:        "admin",
});

const PLACE_STATUSES = Object.freeze({
  ACTIVE:   "active",
  PENDING:  "pending",
  ARCHIVED: "archived",
});

const EVENT_STATUSES = Object.freeze({
  UPCOMING:  "upcoming",
  ONGOING:   "ongoing",
  CANCELLED: "cancelled",
  PAST:      "past",
});

const VERIFICATION_STATUSES = Object.freeze({
  PENDING:  "pending",
  VERIFIED: "verified",
  REJECTED: "rejected",
});

const REQUEST_TYPES = Object.freeze({
  GUIDE_APPLICATION:     "guide_application",
  BUSINESS_VERIFICATION: "business_verification",
});

const ALLOWED_FILE_TYPES = /jpeg|jpg|png|gif|webp|mp4|mov/;
const MAX_FILE_SIZE_MB   = 10;

module.exports = {
  USER_ROLES,
  PLACE_STATUSES,
  EVENT_STATUSES,
  VERIFICATION_STATUSES,
  REQUEST_TYPES,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE_MB,
};
