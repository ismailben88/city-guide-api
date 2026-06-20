// ─────────────────────────────────────────────────────────────────────────────
//  cities-45.js — 45 Moroccan destinations for city_guide_v2
//  Real GPS [lng, lat] from official sources + OpenStreetMap
//  Includes: 16 major touristic cities + 29 secondary towns/villages
// ─────────────────────────────────────────────────────────────────────────────

module.exports = [
  // ── Imperial Cities ───────────────────────────────────────────────────────
  { key:"marrakech",   name:"Marrakech",   region:"Marrakech-Safi",            location:{type:"Point",coordinates:[-7.9811,31.6295]} },
  { key:"fes",         name:"Fes",         region:"Fès-Meknès",                location:{type:"Point",coordinates:[-5.0078,34.0181]} },
  { key:"meknes",      name:"Meknes",      region:"Fès-Meknès",                location:{type:"Point",coordinates:[-5.5547,33.8935]} },
  { key:"rabat",       name:"Rabat",       region:"Rabat-Salé-Kénitra",        location:{type:"Point",coordinates:[-6.8498,34.0209]} },

  // ── Economic Hub & Coastal Atlantic ───────────────────────────────────────
  { key:"casablanca",  name:"Casablanca",  region:"Casablanca-Settat",         location:{type:"Point",coordinates:[-7.5898,33.5731]} },
  { key:"mohammedia",  name:"Mohammedia",  region:"Casablanca-Settat",         location:{type:"Point",coordinates:[-7.3833,33.6863]} },
  { key:"el-jadida",   name:"El Jadida",   region:"Casablanca-Settat",         location:{type:"Point",coordinates:[-8.5067,33.2547]} },
  { key:"safi",        name:"Safi",        region:"Marrakech-Safi",            location:{type:"Point",coordinates:[-9.2364,32.2994]} },
  { key:"essaouira",   name:"Essaouira",   region:"Marrakech-Safi",            location:{type:"Point",coordinates:[-9.7595,31.5084]} },
  { key:"oualidia",    name:"Oualidia",    region:"Casablanca-Settat",         location:{type:"Point",coordinates:[-9.0316,32.7339]} },
  { key:"sale",        name:"Salé",        region:"Rabat-Salé-Kénitra",        location:{type:"Point",coordinates:[-6.7989,34.0531]} },
  { key:"kenitra",     name:"Kenitra",     region:"Rabat-Salé-Kénitra",        location:{type:"Point",coordinates:[-6.5802,34.2610]} },

  // ── Northern Gems ─────────────────────────────────────────────────────────
  { key:"tangier",     name:"Tangier",     region:"Tanger-Tétouan-Al Hoceïma", location:{type:"Point",coordinates:[-5.8036,35.7595]} },
  { key:"tetouan",     name:"Tetouan",     region:"Tanger-Tétouan-Al Hoceïma", location:{type:"Point",coordinates:[-5.3633,35.5889]} },
  { key:"chefchaouen", name:"Chefchaouen", region:"Tanger-Tétouan-Al Hoceïma", location:{type:"Point",coordinates:[-5.2619,35.1688]} },
  { key:"asilah",      name:"Asilah",      region:"Tanger-Tétouan-Al Hoceïma", location:{type:"Point",coordinates:[-6.0339,35.4667]} },
  { key:"larache",     name:"Larache",     region:"Tanger-Tétouan-Al Hoceïma", location:{type:"Point",coordinates:[-6.1500,35.1932]} },
  { key:"al-hoceima",  name:"Al Hoceima",  region:"Tanger-Tétouan-Al Hoceïma", location:{type:"Point",coordinates:[-3.9317,35.2517]} },
  { key:"akchour",     name:"Akchour",     region:"Tanger-Tétouan-Al Hoceïma", location:{type:"Point",coordinates:[-5.1667,35.2000]} },
  { key:"ksar-el-kebir",name:"Ksar el-Kebir",region:"Tanger-Tétouan-Al Hoceïma",location:{type:"Point",coordinates:[-5.9000,35.0086]} },

  // ── Eastern Coast & Oriental ──────────────────────────────────────────────
  { key:"nador",       name:"Nador",       region:"Oriental",                  location:{type:"Point",coordinates:[-2.9286,35.1681]} },
  { key:"saidia",      name:"Saidia",      region:"Oriental",                  location:{type:"Point",coordinates:[-2.2303,35.0867]} },
  { key:"berkane",     name:"Berkane",     region:"Oriental",                  location:{type:"Point",coordinates:[-2.3197,34.9214]} },
  { key:"oujda",       name:"Oujda",       region:"Oriental",                  location:{type:"Point",coordinates:[-1.9114,34.6814]} },

  // ── Atlantic South (Surf & Beach) ─────────────────────────────────────────
  { key:"agadir",      name:"Agadir",      region:"Souss-Massa",               location:{type:"Point",coordinates:[-9.5981,30.4278]} },
  { key:"taghazout",   name:"Taghazout",   region:"Souss-Massa",               location:{type:"Point",coordinates:[-9.7080,30.5444]} },
  { key:"mirleft",     name:"Mirleft",     region:"Souss-Massa",               location:{type:"Point",coordinates:[-9.9333,29.5833]} },
  { key:"sidi-ifni",   name:"Sidi Ifni",   region:"Guelmim-Oued Noun",         location:{type:"Point",coordinates:[-10.1719,29.3797]} },
  { key:"taroudant",   name:"Taroudant",   region:"Souss-Massa",               location:{type:"Point",coordinates:[-8.8800,30.4731]} },
  { key:"tafraoute",   name:"Tafraoute",   region:"Souss-Massa",               location:{type:"Point",coordinates:[-8.9756,29.7239]} },

  // ── Deep South ────────────────────────────────────────────────────────────
  { key:"dakhla",      name:"Dakhla",      region:"Dakhla-Oued Ed-Dahab",      location:{type:"Point",coordinates:[-15.9318,23.7122]} },
  { key:"laayoune",    name:"Laayoune",    region:"Laâyoune-Sakia El Hamra",   location:{type:"Point",coordinates:[-13.2033,27.1418]} },

  // ── Desert & Sahara ───────────────────────────────────────────────────────
  { key:"ouarzazate",  name:"Ouarzazate",  region:"Drâa-Tafilalet",            location:{type:"Point",coordinates:[-6.8932,30.9335]} },
  { key:"ait-benhaddou",name:"Aït Benhaddou",region:"Drâa-Tafilalet",          location:{type:"Point",coordinates:[-7.1289,31.0472]} },
  { key:"merzouga",    name:"Merzouga",    region:"Drâa-Tafilalet",            location:{type:"Point",coordinates:[-4.0115,31.0800]} },
  { key:"errachidia",  name:"Errachidia",  region:"Drâa-Tafilalet",            location:{type:"Point",coordinates:[-4.4333,31.9314]} },
  { key:"tinghir",     name:"Tinghir",     region:"Drâa-Tafilalet",            location:{type:"Point",coordinates:[-5.5331,31.5147]} },
  { key:"zagora",      name:"Zagora",      region:"Drâa-Tafilalet",            location:{type:"Point",coordinates:[-5.8378,30.3322]} },
  { key:"mhamid",      name:"M'Hamid",     region:"Drâa-Tafilalet",            location:{type:"Point",coordinates:[-5.7250,29.8261]} },

  // ── Atlas Mountains & Trekking ────────────────────────────────────────────
  { key:"ifrane",      name:"Ifrane",      region:"Fès-Meknès",                location:{type:"Point",coordinates:[-5.1072,33.5228]} },
  { key:"imlil",       name:"Imlil",       region:"Marrakech-Safi",            location:{type:"Point",coordinates:[-7.9167,31.1389]} },
  { key:"asni",        name:"Asni",        region:"Marrakech-Safi",            location:{type:"Point",coordinates:[-7.9744,31.2553]} },
  { key:"midelt",      name:"Midelt",      region:"Drâa-Tafilalet",            location:{type:"Point",coordinates:[-4.7333,32.6814]} },
  { key:"sefrou",      name:"Sefrou",      region:"Fès-Meknès",                location:{type:"Point",coordinates:[-4.8378,33.8311]} },

  // ── Inland (Settat / Béni Mellal) ─────────────────────────────────────────
  { key:"beni-mellal", name:"Beni Mellal", region:"Béni Mellal-Khénifra",      location:{type:"Point",coordinates:[-6.3603,32.3372]} },
  { key:"khouribga",   name:"Khouribga",   region:"Béni Mellal-Khénifra",      location:{type:"Point",coordinates:[-6.9063,32.8811]} },
];
