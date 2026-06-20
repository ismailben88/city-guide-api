const Event = require("../models/Event");
const cacheService = require("./cache.service");

// Reconcile the stored `status` of every event with its actual dates, mirroring
// the frontend's getEventStatus():
//   • `cancelled` is authoritative and never touched.
//   • endDate = dateRange.to ?? dateRange.from (single-date events end at start).
//   • past:     endDate  < now
//   • ongoing:  from <= now <= to   (requires an explicit end date)
//   • upcoming: from  > now
//
// The stored field is the source of truth for stats, the `?status=` filter and
// chat ranking — none of which re-derive status from dates — so it must be kept
// fresh. Runs at boot and on an interval (see server.js). Idempotent: each
// updateMany only touches docs whose stored status is already wrong.
async function reconcileEventStatuses(now = new Date()) {
  const notCancelled = { status: { $ne: "cancelled" } };
  const noEnd = { $or: [{ "dateRange.to": null }, { "dateRange.to": { $exists: false } }] };

  const [past, ongoing, upcoming] = await Promise.all([
    // PAST — has an end date that passed, OR single-date event whose start passed
    Event.updateMany(
      {
        ...notCancelled,
        status: { $ne: "past" },
        $or: [
          { "dateRange.to": { $ne: null, $lt: now } },
          { ...noEnd, "dateRange.from": { $lt: now } },
        ],
      },
      { $set: { status: "past" } }
    ),
    // ONGOING — started and has an explicit end still in the future
    Event.updateMany(
      {
        ...notCancelled,
        status: { $ne: "ongoing" },
        "dateRange.from": { $lte: now },
        "dateRange.to": { $ne: null, $gte: now },
      },
      { $set: { status: "ongoing" } }
    ),
    // UPCOMING — starts in the future
    Event.updateMany(
      {
        ...notCancelled,
        status: { $ne: "upcoming" },
        "dateRange.from": { $gt: now },
      },
      { $set: { status: "upcoming" } }
    ),
  ]);

  const changed = (past.modifiedCount ?? 0) + (ongoing.modifiedCount ?? 0) + (upcoming.modifiedCount ?? 0);
  // Drop cached event listings so `?status=` reflects the new statuses at once.
  if (changed > 0) cacheService.delByPrefix("events");

  return {
    past:     past.modifiedCount     ?? 0,
    ongoing:  ongoing.modifiedCount  ?? 0,
    upcoming: upcoming.modifiedCount ?? 0,
  };
}

// Throttled wrapper — safe to call on hot read paths (getEvents / getStats).
// Runs at most once per RECONCILE_THROTTLE_MS per process, so serverless cold
// starts stay fresh without re-scanning on every request. Fire-and-forget.
const RECONCILE_THROTTLE_MS = 5 * 60 * 1000;
let lastRun = 0;

function reconcileEventStatusesThrottled() {
  const nowMs = Date.now();
  if (nowMs - lastRun < RECONCILE_THROTTLE_MS) return;
  lastRun = nowMs;
  reconcileEventStatuses().catch(() => {});
}

module.exports = { reconcileEventStatuses, reconcileEventStatusesThrottled };
