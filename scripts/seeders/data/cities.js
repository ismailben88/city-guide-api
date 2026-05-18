// ─────────────────────────────────────────────────────────────────────────────
//  cities.js — 16 primary Moroccan tourist destinations
//  English-first  |  Real GPS coordinates [longitude, latitude]
//  Focused on tourism relevance, not administrative completeness
// ─────────────────────────────────────────────────────────────────────────────

module.exports = [

  // ── Imperial Cities ───────────────────────────────────────────────────────

  {
    key:    "marrakech",
    name:   "Marrakech",
    slug:   "marrakech",
    region: "Marrakech-Safi",
    location: { type: "Point", coordinates: [-7.9811, 31.6295] },
    isActive: true,
  },
  {
    key:    "fes",
    name:   "Fes",
    slug:   "fes",
    region: "Fès-Meknès",
    location: { type: "Point", coordinates: [-5.0078, 34.0181] },
    isActive: true,
  },
  {
    key:    "meknes",
    name:   "Meknes",
    slug:   "meknes",
    region: "Fès-Meknès",
    location: { type: "Point", coordinates: [-5.5547, 33.8935] },
    isActive: true,
  },
  {
    key:    "rabat",
    name:   "Rabat",
    slug:   "rabat",
    region: "Rabat-Salé-Kénitra",
    location: { type: "Point", coordinates: [-6.8498, 34.0209] },
    isActive: true,
  },

  // ── Economic & Coastal Hub ────────────────────────────────────────────────

  {
    key:    "casablanca",
    name:   "Casablanca",
    slug:   "casablanca",
    region: "Casablanca-Settat",
    location: { type: "Point", coordinates: [-7.5898, 33.5731] },
    isActive: true,
  },

  // ── Northern Gems ─────────────────────────────────────────────────────────

  {
    key:    "tangier",
    name:   "Tangier",
    slug:   "tangier",
    region: "Tanger-Tétouan-Al Hoceïma",
    location: { type: "Point", coordinates: [-5.8036, 35.7595] },
    isActive: true,
  },
  {
    key:    "chefchaouen",
    name:   "Chefchaouen",
    slug:   "chefchaouen",
    region: "Tanger-Tétouan-Al Hoceïma",
    location: { type: "Point", coordinates: [-5.2619, 35.1688] },
    isActive: true,
  },
  {
    key:    "tetouan",
    name:   "Tetouan",
    slug:   "tetouan",
    region: "Tanger-Tétouan-Al Hoceïma",
    location: { type: "Point", coordinates: [-5.3633, 35.5889] },
    isActive: true,
  },

  // ── Atlantic Coast ────────────────────────────────────────────────────────

  {
    key:    "agadir",
    name:   "Agadir",
    slug:   "agadir",
    region: "Souss-Massa",
    location: { type: "Point", coordinates: [-9.5981, 30.4278] },
    isActive: true,
  },
  {
    key:    "essaouira",
    name:   "Essaouira",
    slug:   "essaouira",
    region: "Marrakech-Safi",
    location: { type: "Point", coordinates: [-9.7595, 31.5084] },
    isActive: true,
  },
  {
    key:    "el-jadida",
    name:   "El Jadida",
    slug:   "el-jadida",
    region: "Casablanca-Settat",
    location: { type: "Point", coordinates: [-8.5067, 33.2547] },
    isActive: true,
  },

  // ── Desert & Sahara ───────────────────────────────────────────────────────

  {
    key:    "ouarzazate",
    name:   "Ouarzazate",
    slug:   "ouarzazate",
    region: "Drâa-Tafilalet",
    location: { type: "Point", coordinates: [-6.8932, 30.9335] },
    isActive: true,
  },
  {
    key:    "merzouga",
    name:   "Merzouga",
    slug:   "merzouga",
    region: "Drâa-Tafilalet",
    location: { type: "Point", coordinates: [-4.0115, 31.0800] },
    isActive: true,
  },

  // ── Mountain & Nature ─────────────────────────────────────────────────────

  {
    key:    "ifrane",
    name:   "Ifrane",
    slug:   "ifrane",
    region: "Fès-Meknès",
    location: { type: "Point", coordinates: [-5.1072, 33.5228] },
    isActive: true,
  },

  // ── Deep South ────────────────────────────────────────────────────────────

  {
    key:    "dakhla",
    name:   "Dakhla",
    slug:   "dakhla",
    region: "Dakhla-Oued Ed-Dahab",
    location: { type: "Point", coordinates: [-15.9318, 23.7122] },
    isActive: true,
  },

  // ── Eastern Coast ─────────────────────────────────────────────────────────

  {
    key:    "saidia",
    name:   "Saidia",
    slug:   "saidia",
    region: "Oriental",
    location: { type: "Point", coordinates: [-2.2303, 35.0867] },
    isActive: true,
  },
];
