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

const newGuideVerified = (userId, guideName) =>
  send(userId, {
    type:       T.GUIDE,
    senderName: "City Guide Team",
    title:      "Guide Profile Verified!",
    message:    `Congratulations ${guideName}! Your guide profile is now verified and visible to tourists.`,
    link:       "/settings/profile/guide",
    entityType: "guide",
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

const businessVerified = (userId) =>
  send(userId, {
    type:       T.SYSTEM,
    senderName: "City Guide Team",
    title:      "Business Verified!",
    message:    "Your business has been verified on City Guide. Your listing is now highlighted for visitors.",
    link:       "/settings/profile/business",
    entityType: "system",
  });

const businessRejected = (userId) =>
  send(userId, {
    type:       T.SYSTEM,
    senderName: "City Guide Team",
    title:      "Business Verification Update",
    message:    "Your business verification request was not approved. Please contact support for details.",
    link:       "/settings/profile/business",
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

module.exports = {
  send,
  newReview,
  communityReply,
  newGuideVerified,
  guideRejected,
  businessVerified,
  businessRejected,
  bookingConfirmed,
  bookingRequest,
  newMessage,
  newEventInCity,
  systemBroadcast,
  TYPE: T,
};
