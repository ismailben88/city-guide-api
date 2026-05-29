// notify.js — factory functions for every notification type.
// Checks user preferences AND quiet hours before creating a notification.
//
// Usage:
//   const notify = require("../helpers/notify");
//   await notify.newReview(place.ownerId, reviewer.name, place.name, place._id, reviewer._id, "Place");

const notifService = require("../services/notification.service");
const User         = require("../models/User");

const T = {
  SYSTEM:    "SYSTEM_BROADCAST",
  BOOKING:   "BOOKING",
  MESSAGE:   "MESSAGE",
  REVIEW:    "REVIEW",
  EVENT:     "EVENT",
  GUIDE:     "GUIDE",
  COMMUNITY: "COMMUNITY",
};

const TYPE_TO_CHANNEL = {
  REVIEW:           "reviews",
  EVENT:            "events",
  BOOKING:          "bookings",
  MESSAGE:          "messages",
  GUIDE:            "guides",
  COMMUNITY:        "community",
  SYSTEM_BROADCAST: "system",
};

// Returns true if current local time falls inside the quiet-hours window.
// Handles overnight ranges (e.g. 22:00 → 08:00).
function isInQuietHours(quietHours) {
  if (!quietHours?.enabled) return false;
  try {
    const now   = new Date();
    const hhmm  = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const from  = quietHours.from  || "22:00";
    const until = quietHours.until || "08:00";
    return from > until
      ? hhmm >= from || hhmm < until   // overnight: 22:00–08:00
      : hhmm >= from && hhmm < until;  // same-day:  08:00–20:00
  } catch {
    return false;
  }
}

async function send(userId, payload) {
  try {
    const user  = await User.findById(userId).select("notificationPreferences").lean();
    const prefs = user?.notificationPreferences ?? {};

    // 1. Check in-app channel preference (system notifications are never blocked)
    const channelKey = TYPE_TO_CHANNEL[payload.type] || "system";
    if (channelKey !== "system") {
      const ch = prefs?.channels?.[channelKey];
      if (ch?.in_app === false) return;
    }

    // 2. Check quiet hours (system notifications bypass quiet hours)
    if (payload.type !== T.SYSTEM && isInQuietHours(prefs?.quietHours)) return;

    await notifService.createAndEmit({
      userId,
      senderName:  payload.senderName  || "City Guide",
      senderId:    payload.senderId    || null,
      title:       payload.title,
      message:     payload.message,
      type:        payload.type        || T.SYSTEM,
      link:        payload.link        || "",
      entityId:    payload.entityId    || null,
      entityType:  payload.entityType  || "system",
    });
  } catch (err) {
    console.error("[Notify] Failed:", err.message);
  }
}

// ─── Routing helpers ──────────────────────────────────────────────────────────

const TARGET_META = {
  Place:        { linkBase: "places", entityType: "place" },
  GuideProfile: { linkBase: "guides", entityType: "guide" },
  Event:        { linkBase: "events", entityType: "event" },
};

// ─── Review / Comment ─────────────────────────────────────────────────────────

// New top-level review/comment on any entity (Place, GuideProfile, Event)
const newReview = (ownerId, reviewerName, entityName, entityId, senderId = null, targetType = "Place") => {
  const meta = TARGET_META[targetType] || TARGET_META.Place;
  return send(ownerId, {
    type:       T.REVIEW,
    senderName: reviewerName,
    senderId,
    title:      `New review on "${entityName}"`,
    message:    `${reviewerName} left a review.`,
    link:       `/${meta.linkBase}/${entityId}`,
    entityId,
    entityType: meta.entityType,
  });
};

// Reply to a comment/post
const communityReply = (authorId, replierName, postTitle, postLink, senderId = null) =>
  send(authorId, {
    type:       T.COMMUNITY,
    senderName: replierName,
    senderId,
    title:      `New reply on "${postTitle}"`,
    message:    `${replierName} replied to your comment.`,
    link:       postLink,
    entityType: "user",
    entityId:   senderId,
  });

// ─── Guide verification ───────────────────────────────────────────────────────

const guideApplicationReceived = (userId) =>
  send(userId, {
    type:       T.GUIDE,
    senderName: "City Guide Team",
    title:      "Guide application received",
    message:    "Your guide profile is under review. We'll let you know once it's published.",
    link:       "/settings/profile/guide",
    entityType: "guide",
  });

const guideProfilePublished = (userId) =>
  send(userId, {
    type:       T.GUIDE,
    senderName: "City Guide Team",
    title:      "Your guide application was approved!",
    message:    "Your guide application was approved. Your profile is now live. You can now apply for certification from your settings.",
    link:       "/settings/profile/guide",
    entityType: "guide",
  });

const guideApplicationRejected = (userId, reason = "") =>
  send(userId, {
    type:       T.GUIDE,
    senderName: "City Guide Team",
    title:      "Guide application not approved",
    message:    reason
      ? `Your guide application was not approved. Reason: ${reason}`
      : "Your guide application was not approved. Contact support for more details.",
    link:       "/settings/profile/guide",
    entityType: "guide",
  });

const guideVerificationDocumentsReceived = (userId) =>
  send(userId, {
    type:       T.GUIDE,
    senderName: "City Guide Team",
    title:      "Verification documents received",
    message:    "We've received your ID and guide certificate. You'll be notified once our team completes the review — usually within 24 hours.",
    link:       "/settings/profile/guide",
    entityType: "guide",
  });

const guideVerificationRejected = (userId, reason = "") =>
  send(userId, {
    type:       T.GUIDE,
    senderName: "City Guide Team",
    title:      "Certification not approved",
    message:    reason
      ? `Certification not approved. Reason: ${reason}. You can resubmit from settings.`
      : "Certification not approved. Please check your documents are clear and valid, then resubmit.",
    link:       "/settings/profile/guide",
    entityType: "guide",
  });

const newGuideVerified = (userId, guideName) =>
  send(userId, {
    type:       T.GUIDE,
    senderName: "City Guide Team",
    title:      "You are now a certified guide!",
    message:    `Congratulations ${guideName}! You are now a certified guide. Your badge is live.`,
    link:       "/settings/profile/guide",
    entityType: "guide",
  });

const adminGuideApplicationSubmitted = (adminId, userName) =>
  send(adminId, {
    type:       T.SYSTEM,
    senderName: userName,
    title:      "New guide application",
    message:    `New guide application from ${userName}.`,
    link:       "/admin/requests",
    entityType: "system",
  });

const adminGuideVerificationSubmitted = (adminId, userName) =>
  send(adminId, {
    type:       T.SYSTEM,
    senderName: userName,
    title:      "Guide certification request",
    message:    `Guide certification request from ${userName}.`,
    link:       "/admin/requests",
    entityType: "system",
  });

const guideRejected = (userId, guideName) =>
  send(userId, {
    type:       T.GUIDE,
    senderName: "City Guide Team",
    title:      "Guide Application Update",
    message:    `${guideName}, your guide application was not approved at this time. Contact support for more details.`,
    link:       "/settings/profile/guide",
    entityType: "guide",
  });

// ─── Business verification ────────────────────────────────────────────────────

const businessVerified = (userId, businessName = "", placeId = null) =>
  send(userId, {
    type:       T.SYSTEM,
    senderName: "City Guide Team",
    title:      "Business listing approved!",
    message:    businessName
      ? `"${businessName}" is now live on City Guide. Travellers can discover it right away.`
      : "Your business listing is now live on City Guide.",
    link:       "/settings/profile/business",
    entityId:   placeId,
    entityType: "place",
  });

const businessRejected = (userId, businessName = "", reason = "") =>
  send(userId, {
    type:       T.SYSTEM,
    senderName: "City Guide Team",
    title:      "Business listing not approved",
    message:    reason
      ? `Your listing${businessName ? ` "${businessName}"` : ""} was not approved: ${reason}. You can edit and resubmit.`
      : `Your listing${businessName ? ` "${businessName}"` : ""} was not approved. You may edit and resubmit it.`,
    link:       "/settings/profile/business",
    entityType: "system",
  });

const businessSubmitted = (userId, businessName, placeId = null) =>
  send(userId, {
    type:       T.SYSTEM,
    senderName: "City Guide Team",
    title:      "Listing submitted for review",
    message:    `"${businessName}" is under review. We'll notify you once it's approved — usually within 48 hours.`,
    link:       "/settings/profile/business",
    entityId:   placeId,
    entityType: "place",
  });

const businessUpdated = (userId, businessName, placeId = null) =>
  send(userId, {
    type:       T.SYSTEM,
    senderName: "City Guide Team",
    title:      "Listing updated",
    message:    `Your listing "${businessName}" was updated successfully.`,
    link:       "/settings/profile/business",
    entityId:   placeId,
    entityType: "place",
  });

const businessDeleted = (userId, businessName) =>
  send(userId, {
    type:       T.SYSTEM,
    senderName: "City Guide Team",
    title:      "Listing removed",
    message:    `Your listing "${businessName}" has been removed from City Guide.`,
    link:       "/settings/profile/business",
    entityType: "system",
  });

const adminBusinessSubmitted = (adminId, ownerName, businessName, placeId = null) =>
  send(adminId, {
    type:       T.SYSTEM,
    senderName: ownerName,
    title:      "New listing awaiting review",
    message:    `${ownerName} submitted "${businessName}" for approval.`,
    link:       "/admin/requests",
    entityId:   placeId,
    entityType: "place",
  });

const adminBusinessDeleted = (adminId, ownerName, businessName) =>
  send(adminId, {
    type:       T.SYSTEM,
    senderName: ownerName,
    title:      "Business listing removed",
    message:    `${ownerName} deleted their listing "${businessName}".`,
    link:       "/admin/requests",
    entityType: "system",
  });

// ─── Bookings ─────────────────────────────────────────────────────────────────

const bookingConfirmed = (userId, guideName, date, guideId = null) =>
  send(userId, {
    type:       T.BOOKING,
    senderName: guideName,
    senderId:   guideId,
    title:      "Booking Confirmed",
    message:    `Your tour with ${guideName} on ${date} is confirmed.`,
    link:       "/settings",
    entityType: "booking",
  });

const bookingRequest = (guideUserId, touristName, date, senderId = null) =>
  send(guideUserId, {
    type:       T.BOOKING,
    senderName: touristName,
    senderId,
    title:      "New Booking Request",
    message:    `${touristName} wants to book a tour on ${date}.`,
    link:       "/settings",
    entityType: "booking",
  });

// ─── Messages ─────────────────────────────────────────────────────────────────

const newMessage = (recipientId, senderName, preview, senderId = null) =>
  send(recipientId, {
    type:       T.MESSAGE,
    senderName,
    senderId,
    title:      `Message from ${senderName}`,
    message:    preview.length > 80 ? preview.slice(0, 77) + "…" : preview,
    link:       "/messages",
    entityType: "user",
    entityId:   senderId,
  });

// ─── Events ───────────────────────────────────────────────────────────────────

const newEventInCity = (userId, eventTitle, cityName, eventId) =>
  send(userId, {
    type:       T.EVENT,
    senderName: "City Guide",
    title:      `New event in ${cityName}`,
    message:    `"${eventTitle}" is coming up in ${cityName}!`,
    link:       `/events/${eventId}`,
    entityId:   eventId,
    entityType: "event",
  });

// ─── System broadcast ─────────────────────────────────────────────────────────

const systemBroadcast = (userId, title, message, link = "") =>
  send(userId, {
    type:       T.SYSTEM,
    senderName: "City Guide",
    title,
    message,
    link,
    entityType: "system",
  });

// ─── Welcome & onboarding ─────────────────────────────────────────────────────

const welcomeUser = (userId, firstName) =>
  send(userId, {
    type:       T.SYSTEM,
    senderName: "City Guide Team",
    title:      `Welcome to City Guide, ${firstName}!`,
    message:    "Start exploring places, upcoming events, and local guides in your city.",
    link:       "/explore",
    entityType: "system",
  });

const profileIncompleteReminder = (userId) =>
  send(userId, {
    type:       T.SYSTEM,
    senderName: "City Guide Team",
    title:      "Complete your profile",
    message:    "Add your city, a profile photo, and a few personal details to get personalised recommendations.",
    link:       "/settings/personal",
    entityType: "system",
  });

// ─── Saved places ─────────────────────────────────────────────────────────────

const savedPlaceUpdated = (userId, placeName, placeId) =>
  send(userId, {
    type:       T.SYSTEM,
    senderName: "City Guide",
    title:      `"${placeName}" has been updated`,
    message:    "A place you saved was updated with new information. Check what's changed.",
    link:       `/places/${placeId}`,
    entityId:   placeId,
    entityType: "place",
  });

const savedPlaceFeatured = (userId, placeName, placeId) =>
  send(userId, {
    type:       T.SYSTEM,
    senderName: "City Guide",
    title:      `"${placeName}" is now featured`,
    message:    "A place you saved has been highlighted as a top destination on City Guide.",
    link:       `/places/${placeId}`,
    entityId:   placeId,
    entityType: "place",
  });

const savedPlaceNowActive = (userId, placeName, placeId) =>
  send(userId, {
    type:       T.SYSTEM,
    senderName: "City Guide",
    title:      `"${placeName}" is now open`,
    message:    "Good news — a place you saved is now active and welcoming visitors.",
    link:       `/places/${placeId}`,
    entityId:   placeId,
    entityType: "place",
  });

module.exports = {
  send,
  newReview,
  communityReply,
  guideApplicationReceived,
  guideProfilePublished,
  guideApplicationRejected,
  guideVerificationDocumentsReceived,
  guideVerificationRejected,
  newGuideVerified,
  guideRejected,
  adminGuideApplicationSubmitted,
  adminGuideVerificationSubmitted,
  businessVerified,
  businessRejected,
  businessSubmitted,
  businessUpdated,
  businessDeleted,
  adminBusinessSubmitted,
  adminBusinessDeleted,
  bookingConfirmed,
  bookingRequest,
  newMessage,
  newEventInCity,
  systemBroadcast,
  welcomeUser,
  profileIncompleteReminder,
  savedPlaceUpdated,
  savedPlaceFeatured,
  savedPlaceNowActive,
  TYPE: T,
};
