// 55 villes marocaines — coordonnées GPS réelles [longitude, latitude]
module.exports = [
  // ── Grandes villes impériales & économiques ───────────────────────────────
  { key:"marrakech",    name:"Marrakech",      slug:"marrakech",    region:"Marrakech-Safi",                   location:{type:"Point",coordinates:[-7.9811,31.6295]} },
  { key:"casablanca",   name:"Casablanca",     slug:"casablanca",   region:"Casablanca-Settat",                location:{type:"Point",coordinates:[-7.5898,33.5731]} },
  { key:"fes",          name:"Fès",            slug:"fes",          region:"Fès-Meknès",                       location:{type:"Point",coordinates:[-5.0078,34.0181]} },
  { key:"rabat",        name:"Rabat",          slug:"rabat",        region:"Rabat-Salé-Kénitra",               location:{type:"Point",coordinates:[-6.8498,34.0209]} },
  { key:"tanger",       name:"Tanger",         slug:"tanger",       region:"Tanger-Tétouan-Al Hoceïma",        location:{type:"Point",coordinates:[-5.8036,35.7595]} },
  { key:"meknes",       name:"Meknès",         slug:"meknes",       region:"Fès-Meknès",                       location:{type:"Point",coordinates:[-5.5547,33.8935]} },
  { key:"agadir",       name:"Agadir",         slug:"agadir",       region:"Souss-Massa",                      location:{type:"Point",coordinates:[-9.5981,30.4278]} },
  { key:"oujda",        name:"Oujda",          slug:"oujda",        region:"Oriental",                         location:{type:"Point",coordinates:[-1.9060,34.6867]} },

  // ── Villes touristiques emblématiques ─────────────────────────────────────
  { key:"chefchaouen",  name:"Chefchaouen",    slug:"chefchaouen",  region:"Tanger-Tétouan-Al Hoceïma",        location:{type:"Point",coordinates:[-5.2619,35.1688]} },
  { key:"essaouira",    name:"Essaouira",      slug:"essaouira",    region:"Marrakech-Safi",                   location:{type:"Point",coordinates:[-9.7595,31.5084]} },
  { key:"ouarzazate",   name:"Ouarzazate",     slug:"ouarzazate",   region:"Drâa-Tafilalet",                   location:{type:"Point",coordinates:[-6.8932,30.9335]} },
  { key:"ifrane",       name:"Ifrane",         slug:"ifrane",       region:"Fès-Meknès",                       location:{type:"Point",coordinates:[-5.1072,33.5228]} },
  { key:"dakhla",       name:"Dakhla",         slug:"dakhla",       region:"Dakhla-Oued Ed-Dahab",             location:{type:"Point",coordinates:[-15.9318,23.7122]} },
  { key:"tetouan",      name:"Tétouan",        slug:"tetouan",      region:"Tanger-Tétouan-Al Hoceïma",        location:{type:"Point",coordinates:[-5.3633,35.5889]} },
  { key:"merzouga",     name:"Merzouga",       slug:"merzouga",     region:"Drâa-Tafilalet",                   location:{type:"Point",coordinates:[-4.0115,31.0800]} },
  { key:"ait-benhaddou",name:"Aït Benhaddou",  slug:"ait-benhaddou",region:"Drâa-Tafilalet",                   location:{type:"Point",coordinates:[-7.1325,31.0472]} },

  // ── Villes côtières ──────────────────────────────────────────────────────
  { key:"el-jadida",    name:"El Jadida",      slug:"el-jadida",    region:"Casablanca-Settat",                location:{type:"Point",coordinates:[-8.5067,33.2547]} },
  { key:"safi",         name:"Safi",           slug:"safi",         region:"Marrakech-Safi",                   location:{type:"Point",coordinates:[-9.2255,32.2994]} },
  { key:"mohammedia",   name:"Mohammedia",     slug:"mohammedia",   region:"Casablanca-Settat",                location:{type:"Point",coordinates:[-7.3825,33.6862]} },
  { key:"nador",        name:"Nador",          slug:"nador",        region:"Oriental",                         location:{type:"Point",coordinates:[-2.9333,35.1683]} },
  { key:"al-hoceima",   name:"Al Hoceïma",     slug:"al-hoceima",   region:"Tanger-Tétouan-Al Hoceïma",        location:{type:"Point",coordinates:[-3.9320,35.2517]} },
  { key:"asilah",       name:"Asilah",         slug:"asilah",       region:"Tanger-Tétouan-Al Hoceïma",        location:{type:"Point",coordinates:[-6.0333,35.4653]} },
  { key:"larache",      name:"Larache",        slug:"larache",      region:"Tanger-Tétouan-Al Hoceïma",        location:{type:"Point",coordinates:[-6.1566,35.1932]} },

  // ── Villes du Souss & Anti-Atlas ─────────────────────────────────────────
  { key:"taroudant",    name:"Taroudant",      slug:"taroudant",    region:"Souss-Massa",                      location:{type:"Point",coordinates:[-8.8749,30.4706]} },
  { key:"tiznit",       name:"Tiznit",         slug:"tiznit",       region:"Souss-Massa",                      location:{type:"Point",coordinates:[-9.7327,29.6974]} },
  { key:"sidi-ifni",    name:"Sidi Ifni",      slug:"sidi-ifni",    region:"Guelmim-Oued Noun",                location:{type:"Point",coordinates:[-10.1726,29.3796]} },
  { key:"guelmim",      name:"Guelmim",        slug:"guelmim",      region:"Guelmim-Oued Noun",                location:{type:"Point",coordinates:[-10.0574,28.9870]} },

  // ── Villes du Grand Sud & Sahara ─────────────────────────────────────────
  { key:"zagora",       name:"Zagora",         slug:"zagora",       region:"Drâa-Tafilalet",                   location:{type:"Point",coordinates:[-5.8377,30.3322]} },
  { key:"midelt",       name:"Midelt",         slug:"midelt",       region:"Drâa-Tafilalet",                   location:{type:"Point",coordinates:[-4.7346,32.6841]} },
  { key:"errachidia",   name:"Errachidia",     slug:"errachidia",   region:"Drâa-Tafilalet",                   location:{type:"Point",coordinates:[-4.4228,31.9301]} },
  { key:"tinghir",      name:"Tinghir",        slug:"tinghir",      region:"Drâa-Tafilalet",                   location:{type:"Point",coordinates:[-5.5247,31.5150]} },
  { key:"laayoune",     name:"Laâyoune",       slug:"laayoune",     region:"Laâyoune-Sakia El Hamra",          location:{type:"Point",coordinates:[-13.1996,27.1536]} },

  // ── Villes du Moyen Atlas & Atlas ────────────────────────────────────────
  { key:"azrou",        name:"Azrou",          slug:"azrou",        region:"Fès-Meknès",                       location:{type:"Point",coordinates:[-5.2224,33.4345]} },
  { key:"beni-mellal",  name:"Béni Mellal",    slug:"beni-mellal",  region:"Béni Mellal-Khénifra",             location:{type:"Point",coordinates:[-6.3498,32.3373]} },
  { key:"khenifra",     name:"Khénifra",       slug:"khenifra",     region:"Béni Mellal-Khénifra",             location:{type:"Point",coordinates:[-5.6691,32.9349]} },
  { key:"azilal",       name:"Azilal",         slug:"azilal",       region:"Béni Mellal-Khénifra",             location:{type:"Point",coordinates:[-6.5724,31.9612]} },

  // ── Villes du Nord ────────────────────────────────────────────────────────
  { key:"sale",         name:"Salé",           slug:"sale",         region:"Rabat-Salé-Kénitra",               location:{type:"Point",coordinates:[-6.7985,34.0378]} },
  { key:"kenitra",      name:"Kénitra",        slug:"kenitra",      region:"Rabat-Salé-Kénitra",               location:{type:"Point",coordinates:[-6.5858,34.2610]} },
  { key:"ouezzane",     name:"Ouezzane",       slug:"ouezzane",     region:"Tanger-Tétouan-Al Hoceïma",        location:{type:"Point",coordinates:[-5.5884,34.7979]} },

  // ── Villes de l'Oriental ─────────────────────────────────────────────────
  { key:"berkane",      name:"Berkane",        slug:"berkane",      region:"Oriental",                         location:{type:"Point",coordinates:[-2.3184,34.9211]} },
  { key:"taourirt",     name:"Taourirt",       slug:"taourirt",     region:"Oriental",                         location:{type:"Point",coordinates:[-2.8956,34.4083]} },

  // ── Villes autour de Casablanca ───────────────────────────────────────────
  { key:"settat",       name:"Settat",         slug:"settat",       region:"Casablanca-Settat",                location:{type:"Point",coordinates:[-7.6197,33.0009]} },
  { key:"khouribga",    name:"Khouribga",      slug:"khouribga",    region:"Béni Mellal-Khénifra",             location:{type:"Point",coordinates:[-6.9068,32.8833]} },
  { key:"azemmour",     name:"Azemmour",       slug:"azemmour",     region:"Casablanca-Settat",                location:{type:"Point",coordinates:[-8.3427,33.2877]} },

  // ── Sites & lieux emblématiques ───────────────────────────────────────────
  { key:"moulay-idriss",name:"Moulay Idriss Zerhoun",slug:"moulay-idriss",region:"Fès-Meknès",                location:{type:"Point",coordinates:[-5.5244,34.0550]} },
  { key:"sefrou",       name:"Séfrou",         slug:"sefrou",       region:"Fès-Meknès",                       location:{type:"Point",coordinates:[-4.8283,33.8310]} },
  { key:"taza",         name:"Taza",           slug:"taza",         region:"Fès-Meknès",                       location:{type:"Point",coordinates:[-4.0120,34.2100]} },

  // ── Villes du Rif ────────────────────────────────────────────────────────
  { key:"hoceima",      name:"Al Hoceïma (centre)",slug:"hoceima-centre",region:"Tanger-Tétouan-Al Hoceïma",  location:{type:"Point",coordinates:[-3.9320,35.2517]} },
  { key:"nador-corniche",name:"Nador Corniche", slug:"nador-corniche",region:"Oriental",                       location:{type:"Point",coordinates:[-2.9333,35.1683]} },

  // ── Vallées & sites naturels ─────────────────────────────────────────────
  { key:"imlil",        name:"Imlil",          slug:"imlil",        region:"Marrakech-Safi",                   location:{type:"Point",coordinates:[-7.9167,31.1333]} },
  { key:"bin-el-ouidane",name:"Bin el Ouidane", slug:"bin-el-ouidane",region:"Béni Mellal-Khénifra",           location:{type:"Point",coordinates:[-6.4567,32.1167]} },
  { key:"ouzoud",       name:"Cascades d'Ouzoud",slug:"ouzoud",     region:"Béni Mellal-Khénifra",             location:{type:"Point",coordinates:[-6.7198,32.0183]} },
  { key:"toubkal",      name:"Jebel Toubkal",  slug:"toubkal",      region:"Marrakech-Safi",                   location:{type:"Point",coordinates:[-7.9167,31.0583]} },
  { key:"legzira",      name:"Legzira",        slug:"legzira",      region:"Guelmim-Oued Noun",                location:{type:"Point",coordinates:[-10.1678,29.4232]} },
  { key:"tafraoute",    name:"Tafraout",       slug:"tafraoute",    region:"Souss-Massa",                      location:{type:"Point",coordinates:[-8.9756,29.7225]} },
];
