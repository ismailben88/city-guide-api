/**
 * Escape a user-controlled string so it can be safely embedded inside a
 * MongoDB `$regex` query. Without this, a search like "a+ +c" becomes a
 * ReDoS vector and `[` / `(` / `\` can crash the driver with "Invalid
 * regular expression" depending on input.
 *
 * Usage:
 *   filter.title = { $regex: escapeRegex(search), $options: "i" };
 */
exports.escapeRegex = (str = "") =>
  String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
