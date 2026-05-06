// ─────────────────────────────────────────────────────────────────────────────
//  addEvents.js — Ajoute de nouveaux événements dans MongoDB sans effacer
//
//  Usage :
//    node scripts/addEvents.js
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const mongoose = require("mongoose");
const Event    = require("../models/Event");
const City     = require("../models/City");

// ─── Nouveaux événements à insérer ───────────────────────────────────────────
const NEW_EVENTS = [
  {
    title:       "Festival des Roses de Kelaa M'Gouna",
    description: "Célébration annuelle de la récolte des roses de Damas dans la vallée du Dadès. Parade florale, élection de la Reine des Roses, exposition de cosmétiques naturels et concerts folkloriques sous les étoiles.",
    cityName:    "Marrakech",
    organizer:   "Commune de Kelaa M'Gouna",
    ticketPrice: 0,
    coverImage:  "https://images.unsplash.com/photo-1490750967868-88df5691cc00?w=800&auto=format&fit=crop",
    location:    { type: "Point", coordinates: [-6.1263, 31.2438] },
    status:      "upcoming",
    isFeatured:  true,
    dateFrom:    "2026-05-15T09:00:00Z",
    dateTo:      "2026-05-17T22:00:00Z",
  },
  {
    title:       "Mawazine — Rythmes du Monde",
    description: "L'un des plus grands festivals de musique au monde accueille des stars internationales sur plusieurs scènes à Rabat. Concerts gratuits en plein air, soirées VIP et découverte de talents marocains émergents.",
    cityName:    "Rabat",
    organizer:   "Association Maroc Cultures",
    ticketPrice: 0,
    coverImage:  "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&auto=format&fit=crop",
    location:    { type: "Point", coordinates: [-6.8498, 33.9716] },
    status:      "upcoming",
    isFeatured:  true,
    dateFrom:    "2026-05-23T19:00:00Z",
    dateTo:      "2026-06-01T02:00:00Z",
  },
  {
    title:       "Marrakech du Rire",
    description: "Festival international d'humour rassemblant les plus grands comiques francophones dans les plus beaux riads et théâtres de Marrakech. Soirées de gala, stand-up et spectacles de rue.",
    cityName:    "Marrakech",
    organizer:   "Jamel Debbouze Productions",
    ticketPrice: 250,
    coverImage:  "https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=800&auto=format&fit=crop",
    location:    { type: "Point", coordinates: [-7.9911, 31.6340] },
    status:      "upcoming",
    isFeatured:  false,
    dateFrom:    "2026-06-05T20:00:00Z",
    dateTo:      "2026-06-08T23:30:00Z",
  },
  {
    title:       "Festival International de Musique Andalouse de Fès",
    description: "Hommage à l'héritage musical andalou-maghrébin dans le cadre sublime de la médina de Fès. Concerts de musique classique arabe, soirées soufies et ateliers de luth avec des maîtres musiciens.",
    cityName:    "Rabat",
    organizer:   "Fondation du Festival de Fès",
    ticketPrice: 150,
    coverImage:  "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&auto=format&fit=crop",
    location:    { type: "Point", coordinates: [-4.9985, 34.0400] },
    status:      "upcoming",
    isFeatured:  true,
    dateFrom:    "2026-06-14T18:00:00Z",
    dateTo:      "2026-06-22T23:00:00Z",
  },
  {
    title:       "L'Boulevard — Festival des Cultures Urbaines",
    description: "Festival phare de la scène urbaine marocaine : hip-hop, rock, électro et spoken word sur plusieurs scènes à Casablanca. Expositions de street-art, battles de danse et rencontres avec artistes.",
    cityName:    "Casablanca",
    organizer:   "Hoba Hoba Spirit",
    ticketPrice: 80,
    coverImage:  "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&auto=format&fit=crop",
    location:    { type: "Point", coordinates: [-7.6192, 33.5912] },
    status:      "upcoming",
    isFeatured:  false,
    dateFrom:    "2026-07-03T17:00:00Z",
    dateTo:      "2026-07-06T01:00:00Z",
  },
  {
    title:       "Tanjazz — Festival de Jazz de Tanger",
    description: "Festival de jazz emblématique dans la ville du Détroit, mêlant jazz international, fusion africaine et musiques du monde. Concerts en plein air face à la mer Méditerranée et scènes intimistes dans les cafés mythiques.",
    cityName:    "Tetouan",
    organizer:   "Association Tanjazz",
    ticketPrice: 60,
    coverImage:  "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&auto=format&fit=crop",
    location:    { type: "Point", coordinates: [-5.8129, 35.7650] },
    status:      "upcoming",
    isFeatured:  false,
    dateFrom:    "2026-09-18T19:00:00Z",
    dateTo:      "2026-09-21T01:00:00Z",
  },
  {
    title:       "Imilchil — Moussem des Fiançailles",
    description: "Fête ancestrale berbère dans le Haut Atlas où les tribus Aït Haddidou se réunissent pour célébrer les fiançailles traditionnelles. Marchés berbères, fantasias, musique amazighe et nuits sous les étoiles.",
    cityName:    "Beni Mellal",
    organizer:   "Commune d'Imilchil",
    ticketPrice: 0,
    coverImage:  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop",
    location:    { type: "Point", coordinates: [-5.6350, 31.8074] },
    status:      "upcoming",
    isFeatured:  true,
    dateFrom:    "2026-09-10T08:00:00Z",
    dateTo:      "2026-09-12T20:00:00Z",
  },
  {
    title:       "Agadir Beach Festival",
    description: "Festival estival sur la plage d'Agadir avec concerts électro, DJ sets internationaux, sports nautiques, compétitions de surf et animations pour toute la famille. La plus grande fête de plage du Maroc.",
    cityName:    "Safi",
    organizer:   "Agadir Tourisme & Culture",
    ticketPrice: 120,
    coverImage:  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop",
    location:    { type: "Point", coordinates: [-9.5981, 30.4278] },
    status:      "upcoming",
    isFeatured:  false,
    dateFrom:    "2026-08-14T15:00:00Z",
    dateTo:      "2026-08-17T02:00:00Z",
  },
  {
    title:       "FIFM — Festival International du Film de Marrakech",
    description: "Festival de cinéma de classe mondiale accueillant les plus grandes stars d'Hollywood et du cinéma mondial. Projections en avant-première, master classes, hommages et soirées de gala dans les palaces de Marrakech.",
    cityName:    "Marrakech",
    organizer:   "Fondation du FIFM",
    ticketPrice: 100,
    coverImage:  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop",
    location:    { type: "Point", coordinates: [-8.0100, 31.6300] },
    status:      "upcoming",
    isFeatured:  true,
    dateFrom:    "2026-11-27T18:00:00Z",
    dateTo:      "2026-12-05T23:00:00Z",
  },
  {
    title:       "Souk El Had — Marché des Artisans",
    description: "Grand marché artisanal du weekend rassemblant 300 artisans de la région du Souss-Massa. Poterie, bijoux berbères, argan, tapis et cuirs à prix d'atelier. Ateliers de démonstration ouverts au public.",
    cityName:    "Casablanca",
    organizer:   "Chambre Artisanat Souss-Massa",
    ticketPrice: 0,
    coverImage:  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop",
    location:    { type: "Point", coordinates: [-9.6000, 30.4200] },
    status:      "ongoing",
    isFeatured:  false,
    dateFrom:    "2026-05-03T08:00:00Z",
    dateTo:      "2026-05-31T20:00:00Z",
  },
  {
    title:       "Timitar — Festival des Musiques Amazighes d'Agadir",
    description: "Grand festival de musiques amazighes et du monde sur la Plage d'Agadir. Scènes principales avec artistes berbères, africains et méditerranéens. Entrée libre pour tous les concerts en plein air.",
    cityName:    "El Jadida",
    organizer:   "Conseil Provincial d'Agadir Ida-Outanane",
    ticketPrice: 0,
    coverImage:  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop",
    location:    { type: "Point", coordinates: [-9.5900, 30.4250] },
    status:      "upcoming",
    isFeatured:  true,
    dateFrom:    "2026-07-25T18:00:00Z",
    dateTo:      "2026-07-28T02:00:00Z",
  },
  {
    title:       "Fès Sacred Music Festival",
    description: "Festival Mondial des Musiques Sacrées dans la cité spirituelle de Fès. Chants soufis, gospel, musiques méditatives et concerts nocturnes dans les lieux emblématiques de la médina classée UNESCO.",
    cityName:    "Ksar El Kebir",
    organizer:   "Fondation du Festival de Fès des Musiques Sacrées",
    ticketPrice: 180,
    coverImage:  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop",
    location:    { type: "Point", coordinates: [-4.9805, 34.0601] },
    status:      "upcoming",
    isFeatured:  false,
    dateFrom:    "2026-06-07T19:00:00Z",
    dateTo:      "2026-06-15T23:30:00Z",
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: "cityguide" });
  console.log("MongoDB connecté ✓");

  // Charger toutes les villes
  const cities    = await City.find({});
  const cityByName = {};
  cities.forEach((c) => { cityByName[c.name] = c._id; });

  console.log(`Villes disponibles : ${cities.map((c) => c.name).join(", ")}`);

  const docs = [];
  for (const e of NEW_EVENTS) {
    const cityId = cityByName[e.cityName];
    if (!cityId) {
      console.warn(`⚠  Ville introuvable : "${e.cityName}" — événement ignoré : ${e.title}`);
      continue;
    }
    docs.push({
      title:       e.title,
      description: e.description || "",
      coverImage:  e.coverImage  || "",
      organizer:   e.organizer   || "",
      ticketPrice: e.ticketPrice ?? 0,
      location:    e.location || { type: "Point", coordinates: [0, 0] },
      cityId,
      dateRange: {
        from: new Date(e.dateFrom),
        to:   e.dateTo ? new Date(e.dateTo) : null,
      },
      status:     e.status     || "upcoming",
      isFeatured: e.isFeatured || false,
    });
  }

  if (docs.length === 0) {
    console.log("Aucun événement à insérer.");
  } else {
    await Event.insertMany(docs, { ordered: false });
    console.log(`\n✅  ${docs.length} événements ajoutés avec succès !`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌  Erreur :", err.message);
  process.exit(1);
});
