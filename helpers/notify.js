// notify.js — factory functions for every notification type.
// Checks user preferences before creating a notification.
//
// Usage:
//   const notify = require("../helpers/notify");
//   await notify.newReview(place.userId, reviewer.name, place.name, place._id);

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

// Maps notification type → user preference channel key
const TYPE_TO_CHANNEL = {
  REVIEW:           "reviews",
  EVENT:            "events",
  BOOKING:          "bookings",
  MESSAGE:          "messages",
  GUIDE:            "guides",
  COMMUNITY:        "community",
  SYSTEM_BROADCAST: "system",
};

// Check if the user has in-app notifications enabled for this type.
// Defaults to true when preference is missing (safe fallback).
async function isInAppEnabled(userId, type) {
  try {
    const channelKey = TYPE_TO_CHANNEL[type] || "system";
    // System broadcasts are never blocked
    if (channelKey === "system") return true;

    const user = await User.findById(userId).select("notificationPreferences").lean();
    const ch   = user?.notificationPreferences?.channels?.[channelKey];
    // If preference not found → default to enabled
    return ch?.in_app !== false;
  } catch {
    return true; // never block on error
  }
}

async function send(userId, payload) {
  try {
    const enabled = await isInAppEnabled(userId, payload.type);
    if (!enabled) return;

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

// ─── Specific notification factories ─────────────────────────────────────────

const newReview = (ownerId, reviewerName, placeName, placeId, senderId = null) =>
  send(ownerId, {
    type:       T.REVIEW,
    senderName: reviewerName,
    senderId,
    title:      `New review on "${placeName}"`,
    message:    `${reviewerName} left a review on your place.`,
    link:       `/places/${placeId}`,
    entityId:   placeId,
    entityType: "place",
  });

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

const newGuideVerified = (userId, guideName) =>
  send(userId, {
    type:       T.GUIDE,
    senderName: "City Guide Team",
    title:      "Guide Profile Verified!",
    message:    `${guideName}, your guide profile is now verified and visible to tourists.`,
    link:       "/settings/profile/guide",
    entityType: "guide",
  });

const communityReply = (authorId, replierName, postTitle, postLink, senderId = null) =>
  send(authorId, {
    type:       T.COMMUNITY,
    senderName: replierName,
    senderId,
    title:      `New reply on "${postTitle}"`,
    message:    `${replierName} replied to your post.`,
    link:       postLink,
    entityType: "user",
    entityId:   senderId,
  });

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
  newEventInCity,
  bookingConfirmed,
  bookingRequest,
  newMessage,
  newGuideVerified,
  communityReply,
  systemBroadcast,
  TYPE: T,
};
