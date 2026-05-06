/**
 * Wrapper pour les controllers async — élimine le try/catch répétitif.
 * Toute erreur lancée (throw) est passée à next() → error middleware.
 *
 * Utilisation :
 *   exports.getUsers = asyncHandler(async (req, res) => {
 *     const users = await User.find();
 *     res.json(users);
 *   });
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
