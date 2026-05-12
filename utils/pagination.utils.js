/**
 * Construit les paramètres de pagination Mongoose depuis req.query.
 * Utilisation : const { skip, limit, page } = getPagination(req.query);
 */
const getPagination = ({ page = 1, limit = 20 } = {}) => {
  const p = Math.max(1, parseInt(page, 10));
  const l = Math.min(300, Math.max(1, parseInt(limit, 10)));
  return { skip: (p - 1) * l, limit: l, page: p };
};

/**
 * Génère les métadonnées de pagination à inclure dans la réponse.
 */
const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});

module.exports = { getPagination, buildPaginationMeta };
