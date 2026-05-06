// ─────────────────────────────────────────────────────────────────────────────
//  replacePlaces.js — Remplace les données faker.js par de vraies adresses
//  marocaines avec descriptions, images et coordonnées GPS réelles.
//
//  Usage : node scripts/replacePlaces.js
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const mongoose = require("mongoose");
const Place    = require("../models/Place");
const Category = require("../models/Category");
const City     = require("../models/City");

// ─── 1. Catégories réelles ────────────────────────────────────────────────────
const CATEGORIES = [
  { name: "Restaurant",      slug: "restaurant",       icon: "🍽️" },
  { name: "Café",            slug: "cafe",             icon: "☕" },
  { name: "Hôtel & Riad",   slug: "hotel-riad",       icon: "🏨" },
  { name: "Musée",           slug: "musee",            icon: "🏛️" },
  { name: "Mosquée",         slug: "mosquee",          icon: "🕌" },
  { name: "Marché & Souk",  slug: "marche-souk",      icon: "🛍️" },
  { name: "Parc & Jardin",  slug: "parc-jardin",      icon: "🌿" },
  { name: "Site Historique", slug: "site-historique",  icon: "🏰" },
  { name: "Plage",           slug: "plage",            icon: "🏖️" },
  { name: "Spa & Bien-être", slug: "spa-bien-etre",   icon: "💆" },
];

// ─── 2. Vrais lieux marocains ─────────────────────────────────────────────────
const PLACES = [
  // ── CASABLANCA ───────────────────────────────────────────────────────────────
  {
    name: "Mosquée Hassan II",
    cityName: "Casablanca",
    categorySlug: "mosquee",
    description: "Chef-d'œuvre de l'architecture islamique contemporaine, la Mosquée Hassan II est la plus grande mosquée d'Afrique et la 7e au monde. Son minaret de 210 m domine l'Atlantique. Les visites guidées permettent de découvrir les marbres de Carrare, les zelliges et les boiseries sculptées à la main par 6 000 artisans marocains.",
    address: "Bd Sidi Mohammed Ben Abdallah, Casablanca",
    images: [
      "https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-7.6325, 33.6086] },
    averageRating: 4.9, reviewCount: 3240, priceRange: "Gratuit / 130 MAD visite guidée",
    isFeatured: true,
  },
  {
    name: "Corniche Ain Diab",
    cityName: "Casablanca",
    categorySlug: "plage",
    description: "La promenade emblématique de Casablanca longe 8 km de côte Atlantique entre plages, hôtels de luxe et restaurants branchés. Prisée des familles le week-end, elle s'anime en soirée avec ses bars à sushis, ses clubs de beach volley et ses terrasses face à l'océan.",
    address: "Boulevard de la Corniche, Casablanca",
    images: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-7.6890, 33.5932] },
    averageRating: 4.5, reviewCount: 1870, priceRange: "Gratuit",
    isFeatured: false,
  },
  {
    name: "Rick's Café",
    cityName: "Casablanca",
    categorySlug: "restaurant",
    description: "Recréation fidèle du célèbre bar du film 'Casablanca' (1942), ce restaurant-piano-bar niché dans un riad Art déco du XIXe siècle propose une cuisine marocaine-internationale et des cocktails signature dans une ambiance jazzy intemporelle. Réservation indispensable en soirée.",
    address: "248 Bd Sour Jdid, Casablanca",
    images: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-7.6143, 33.6003] },
    averageRating: 4.7, reviewCount: 986, priceRange: "250–500 MAD / pers.",
    isFeatured: true,
  },
  {
    name: "Médina de Casablanca",
    cityName: "Casablanca",
    categorySlug: "marche-souk",
    description: "Souvent oubliée des touristes au profit de la Grande Mosquée, la médina de Casablanca renferme des souks authentiques, des artisans du cuir, des épiceries colorées et de vieux fondouks. Se perdre dans ses ruelles blanchies à la chaux est une expérience à part entière.",
    address: "Médina, Casablanca",
    images: [
      "https://images.unsplash.com/photo-1509099381441-ea3c0cf98b94?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-7.6108, 33.5980] },
    averageRating: 4.2, reviewCount: 542, priceRange: "Gratuit",
    isFeatured: false,
  },

  // ── MARRAKECH ────────────────────────────────────────────────────────────────
  {
    name: "Jemaa el-Fna",
    cityName: "Marrakech",
    categorySlug: "site-historique",
    description: "Inscrite au patrimoine immatériel de l'UNESCO, la place Jemaa el-Fna est le cœur battant de Marrakech. En journée : charmeurs de serpents, hennatistes et jus d'orange frais. Au coucher du soleil, la place se transforme en immense restaurant à ciel ouvert avec acrobates, musiciens gnaoua et conteurs.",
    address: "Place Jemaa el-Fna, Marrakech",
    images: [
      "https://images.unsplash.com/photo-1539020140153-e479b8e201e7?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-7.9893, 31.6258] },
    averageRating: 4.8, reviewCount: 5120, priceRange: "Gratuit",
    isFeatured: true,
  },
  {
    name: "Jardin Majorelle",
    cityName: "Marrakech",
    categorySlug: "parc-jardin",
    description: "Créé par le peintre Jacques Majorelle dans les années 1920 et racheté par Yves Saint Laurent en 1980, ce jardin botanique au bleu cobalt intense abrite 300 espèces de plantes exotiques, un musée berbère et la Villa Oasis. Un havre de fraîcheur et de sérénité à deux pas du tumulte de la médina.",
    address: "Rue Yves Saint Laurent, Marrakech",
    images: [
      "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-8.0034, 31.6422] },
    averageRating: 4.7, reviewCount: 4210, priceRange: "150 MAD adulte",
    isFeatured: true,
  },
  {
    name: "Palais Bahia",
    cityName: "Marrakech",
    categorySlug: "site-historique",
    description: "Véritable chef-d'œuvre de l'art marocain du XIXe siècle, le Palais Bahia fut construit pour le Grand Vizir Ba Ahmed. Ses 8 hectares de cours intérieures pavées de zelliges, de salons aux plafonds en cèdre sculpté et de jardins ombragés d'orangers illustrent le summum du raffinement andalou-maghrébin.",
    address: "Rue Riad Zitoun el Jedid, Marrakech",
    images: [
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-7.9823, 31.6198] },
    averageRating: 4.6, reviewCount: 2780, priceRange: "70 MAD",
    isFeatured: false,
  },
  {
    name: "Souk el Attarine",
    cityName: "Marrakech",
    categorySlug: "marche-souk",
    description: "Au cœur de la médina de Marrakech, le Souk el Attarine — le souk des épices et des parfums — embaume l'air de cumin, de rose, d'argan et de henné. Poteries, babouches, lampes en cuivre et tapis berbères se côtoient dans un labyrinthe de ruelles couvertes où le marchandage est de mise.",
    address: "Souk Semmarine, Médina, Marrakech",
    images: [
      "https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-7.9862, 31.6295] },
    averageRating: 4.5, reviewCount: 1560, priceRange: "Gratuit",
    isFeatured: false,
  },
  {
    name: "Le Tobsil",
    cityName: "Marrakech",
    categorySlug: "restaurant",
    description: "L'un des meilleurs restaurants marocains au monde, Le Tobsil propose un dîner de 5 services dans un riad du XVIIIe siècle entièrement illuminé aux bougies. Chaque soir, un menu différent met à l'honneur la cuisine traditionnelle de Marrakech : pastilla au pigeon, tajines d'agneau, couscous royal et cornes de gazelle maison.",
    address: "22 Derb Moulay Abdelkader, Médina, Marrakech",
    images: [
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-7.9878, 31.6277] },
    averageRating: 4.9, reviewCount: 730, priceRange: "500–700 MAD / pers.",
    isFeatured: true,
  },

  // ── FÈS ─────────────────────────────────────────────────────────────────────
  {
    name: "Médina de Fès el-Bali",
    cityName: "Fes",
    categorySlug: "site-historique",
    description: "Plus grande médina médiévale du monde et première capitale du Maroc, Fès el-Bali (IXe siècle) est classée UNESCO. Ses 9 400 ruelles piétonnes abritent plus de 300 mosquées, des medersa, des fondouks et les tanneries Chouara — spectacle incontournable pour voir les maîtres artisans teindre le cuir à la main.",
    address: "Médina de Fès el-Bali, Fès",
    images: [
      "https://images.unsplash.com/photo-1539020140153-e479b8e201e7?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-4.9771, 34.0642] },
    averageRating: 4.9, reviewCount: 4870, priceRange: "Gratuit",
    isFeatured: true,
  },
  {
    name: "Tanneries Chouara",
    cityName: "Fes",
    categorySlug: "site-historique",
    description: "Icône absolue de Fès, les tanneries Chouara (XIe siècle) sont les plus anciennes et plus grandes tanneries au monde encore en activité. Du haut des terrasses des boutiques de cuir environnantes, le spectacle des cuves multicolores — ocre, rouge grenade, bleu indigo — où travaillent les maîtres tanneurs est époustouflant.",
    address: "Quartier des Tanneurs, Fès el-Bali",
    images: [
      "https://images.unsplash.com/photo-1565799557186-4ec5e5b49fd1?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-4.9705, 34.0643] },
    averageRating: 4.8, reviewCount: 3120, priceRange: "Gratuit (vue depuis les terrasses)",
    isFeatured: true,
  },
  {
    name: "Université Al Quaraouiyine",
    cityName: "Fes",
    categorySlug: "musee",
    description: "Fondée en 859 par Fatima al-Fihri, Al Quaraouiyine est la plus ancienne université en activité continue au monde selon l'UNESCO. Sa bibliothèque de 4 000 manuscrits rares vient d'être restaurée. La grande mosquée attenante, réservée aux musulmans, est un joyau d'architecture hispano-mauresque.",
    address: "Rue Al Quaraouiyine, Fès el-Bali",
    images: [
      "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-4.9737, 34.0645] },
    averageRating: 4.7, reviewCount: 890, priceRange: "Visite bibliothèque : 70 MAD",
    isFeatured: false,
  },
  {
    name: "Palais Jamaï Riad",
    cityName: "Fes",
    categorySlug: "hotel-riad",
    description: "Ancienne demeure du Grand Vizir du Sultan Moulay Hassan, transformée en hôtel de luxe, le Palais Jamaï domine la médina depuis sa colline. Ses jardins andalous, ses fontaines en marbre, ses suites aux moucharabiehs sculptés et sa piscine offrent une retraite royale à deux pas des souks de Fès.",
    address: "Bab Guissa, Fès el-Bali",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-4.9720, 34.0700] },
    averageRating: 4.6, reviewCount: 445, priceRange: "1 500–5 000 MAD / nuit",
    isFeatured: false,
  },

  // ── RABAT ────────────────────────────────────────────────────────────────────
  {
    name: "Tour Hassan",
    cityName: "Rabat",
    categorySlug: "site-historique",
    description: "Minaret inachevé de la grande mosquée du XIIe siècle initiée par le sultan Yacoub al-Mansour, la Tour Hassan est le symbole de Rabat. Haute de 44 m (sur les 86 m prévus), elle domine un plateau de 200 colonnes brisées et le Mausolée Mohammed V, ensemble grandiose classé UNESCO.",
    address: "Avenue Tour Hassan, Rabat",
    images: [
      "https://images.unsplash.com/photo-1545167871-6e13c5b77e57?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-6.8230, 34.0244] },
    averageRating: 4.8, reviewCount: 2340, priceRange: "Gratuit",
    isFeatured: true,
  },
  {
    name: "Kasbah des Oudayas",
    cityName: "Rabat",
    categorySlug: "site-historique",
    description: "Forteresse almoravide du XIIe siècle perchée à l'embouchure du Bou Regreg, la Kasbah des Oudayas est l'un des sites les mieux préservés du Maroc médiéval. Ses rues bleues et blanches, son jardin andalou parfumé d'orangers et sa vue sur l'Atlantique en font un incontournable de Rabat.",
    address: "Kasbah des Oudayas, Rabat",
    images: [
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-6.8349, 34.0349] },
    averageRating: 4.7, reviewCount: 1870, priceRange: "Gratuit",
    isFeatured: true,
  },
  {
    name: "Musée Mohammed VI d'Art Moderne",
    cityName: "Rabat",
    categorySlug: "musee",
    description: "Premier musée d'art moderne et contemporain du Maroc, inauguré en 2014, le MMVI expose sur 4 500 m² une collection permanente de 1 000 œuvres de peintres marocains (Majorelle, Ben Ali, Melehi) et des expositions temporaires d'artistes africains et internationaux de premier plan.",
    address: "Avenue Moulay Hassan, Rabat",
    images: [
      "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-6.8313, 34.0143] },
    averageRating: 4.6, reviewCount: 620, priceRange: "60 MAD adulte",
    isFeatured: false,
  },

  // ── TANGER ───────────────────────────────────────────────────────────────────
  {
    name: "Kasbah de Tanger",
    cityName: "Tangier",
    categorySlug: "site-historique",
    description: "Juchée sur les hauteurs de la médina, la Kasbah de Tanger offre une vue panoramique spectaculaire sur le Détroit de Gibraltar et les côtes espagnoles. Ses palais ottomans, ses remparts du XVIIe siècle et son musée archéologique en font l'incontournable de la Cité du Détroit, autrefois lieu de vie de Matisse, Delacroix et Paul Bowles.",
    address: "Kasbah, Médina, Tanger",
    images: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-5.8124, 35.7904] },
    averageRating: 4.7, reviewCount: 1640, priceRange: "Gratuit / 20 MAD musée",
    isFeatured: true,
  },
  {
    name: "Café Central Tanger",
    cityName: "Tangier",
    categorySlug: "cafe",
    description: "Institution tangéroise depuis 1921, le Café Central trône sur la place du Petit Socco au cœur de la médina. Ses tables en terrasse virent passer Kerouac, Burroughs et Ginsberg. On y sip un atay (thé à la menthe) en observant le ballet incessant des habitants, des musiciens et des marchands ambulants.",
    address: "Place du Petit Socco, Médina, Tanger",
    images: [
      "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-5.8110, 35.7882] },
    averageRating: 4.4, reviewCount: 734, priceRange: "15–40 MAD",
    isFeatured: false,
  },
  {
    name: "Cap Spartel",
    cityName: "Tangier",
    categorySlug: "plage",
    description: "À 14 km de Tanger, Cap Spartel marque le point exact où l'Atlantique rencontre la Méditerranée. Son phare du XIXe siècle, ses grottes d'Hercule taillées dans la falaise par les Phéniciens, ses plages sauvages et ses forêts de pins et d'eucalyptus en font une escapade naturelle grandiose.",
    address: "Cap Spartel, Tanger",
    images: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-5.9233, 35.7930] },
    averageRating: 4.8, reviewCount: 1230, priceRange: "Gratuit",
    isFeatured: false,
  },

  // ── AGADIR ───────────────────────────────────────────────────────────────────
  {
    name: "Plage d'Agadir",
    cityName: "Agadir",
    categorySlug: "plage",
    description: "Avec ses 10 km de sable fin doré et son ensoleillement de 300 jours par an, la plage d'Agadir est la plus grande plage urbaine du Maroc. Calme en semaine, elle s'anime en week-end avec des cours de surf, des beach clubs, des sports nautiques et des spectacles au coucher du soleil depuis la Corniche.",
    address: "Boulevard du 20 Août, Agadir",
    images: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-9.5990, 30.4135] },
    averageRating: 4.7, reviewCount: 3560, priceRange: "Gratuit",
    isFeatured: true,
  },
  {
    name: "Souk El Had d'Agadir",
    cityName: "Agadir",
    categorySlug: "marche-souk",
    description: "Le plus grand marché couvert du Maroc avec plus de 6 000 échoppes réparties sur 9 hectares. Épices du Souss, argan bio, tapis berbères, babouches, poteries et poissons frais de l'Atlantique. Le dimanche, des milliers de commerçants des villages voisins investissent les allées — une immersion totale dans la vie locale.",
    address: "Avenue du 29 Février, Agadir",
    images: [
      "https://images.unsplash.com/photo-1509099381441-ea3c0cf98b94?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-9.5700, 30.4264] },
    averageRating: 4.5, reviewCount: 1240, priceRange: "Gratuit",
    isFeatured: false,
  },
  {
    name: "Kasbah Agadir Oufella",
    cityName: "Agadir",
    categorySlug: "site-historique",
    description: "Construite au XVIIIe siècle et détruite par le séisme de 1960, la kasbah d'Agadir Oufella est aujourd'hui une ruine panoramique classée monument historique. Depuis ses remparts à 236 m d'altitude, la vue s'étend sur la baie d'Agadir, la vallée du Souss et l'Anti-Atlas. Lumière dorée garantie au coucher du soleil.",
    address: "Kasbah Agadir Oufella, Agadir",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-9.5620, 30.4340] },
    averageRating: 4.6, reviewCount: 870, priceRange: "Gratuit",
    isFeatured: false,
  },

  // ── MEKNÈS ───────────────────────────────────────────────────────────────────
  {
    name: "Bab Mansour",
    cityName: "Meknes",
    categorySlug: "site-historique",
    description: "Considérée comme la plus belle porte monumentale du Maroc, Bab Mansour fut achevée en 1732 sous le règne de Moulay Ismaïl. Ses deux grandes tours flanquantes, ses mosaïques de zelliges vert et blanc et ses colonnes corinthiennes récupérées des ruines de Volubilis en font un chef-d'œuvre de l'architecture marocaine du XVIIIe siècle.",
    address: "Place el-Hedim, Meknès",
    images: [
      "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-5.5570, 33.8956] },
    averageRating: 4.8, reviewCount: 1560, priceRange: "Gratuit",
    isFeatured: true,
  },
  {
    name: "Mausolée Moulay Ismaïl",
    cityName: "Meknes",
    categorySlug: "mosquee",
    description: "Sépulcre du sultan bâtisseur Moulay Ismaïl (1672–1727), ce mausolée est l'un des rares sites religieux islamiques ouverts aux non-musulmans au Maroc. Ses cours dallées de marbre blanc, ses fontaines aux carreaux de faïence et ses boiseries de cèdre sculptées exhalent une sérénité et un raffinement absolus.",
    address: "Médina de Meknès",
    images: [
      "https://images.unsplash.com/photo-1545167871-6e13c5b77e57?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-5.5527, 33.8944] },
    averageRating: 4.7, reviewCount: 980, priceRange: "Gratuit",
    isFeatured: false,
  },

  // ── EL JADIDA ────────────────────────────────────────────────────────────────
  {
    name: "Cité Portugaise d'El Jadida",
    cityName: "El Jadida",
    categorySlug: "site-historique",
    description: "Citadelle maritime classée UNESCO construite par les Portugais au XVIe siècle, la Cité Portugaise (Mazagan) abrite la Citerne Portugaise — chef-d'œuvre de l'architecture gotique-manuéline dont les voûtes se reflètent dans un miroir d'eau. Ses remparts en étoile et ses ruelles pavées racontent 5 siècles d'histoire.",
    address: "Cité Portugaise, El Jadida",
    images: [
      "https://images.unsplash.com/photo-1551634979-2b11f8c218da?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-8.5060, 33.2553] },
    averageRating: 4.8, reviewCount: 1340, priceRange: "Gratuit / 10 MAD citerne",
    isFeatured: true,
  },
  {
    name: "Plage Sidi Bouzid",
    cityName: "El Jadida",
    categorySlug: "plage",
    description: "À 5 km au sud d'El Jadida, Sidi Bouzid est une plage sauvage de 4 km parfaite pour le surf, le kitesurf et les promenades au coucher du soleil. Son cadre naturel préservé, ses cafés de bord de mer et l'absence de foule en semaine en font un contraste saisissant avec les plages animées d'Agadir.",
    address: "Sidi Bouzid, El Jadida",
    images: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-8.5380, 33.2100] },
    averageRating: 4.6, reviewCount: 760, priceRange: "Gratuit",
    isFeatured: false,
  },

  // ── TETOUAN ──────────────────────────────────────────────────────────────────
  {
    name: "Médina de Tétouan",
    cityName: "Tetouan",
    categorySlug: "site-historique",
    description: "Surnommée 'La Colombe Blanche', la médina de Tétouan est classée au patrimoine mondial de l'UNESCO depuis 1997. Fondée au IXe siècle et reconstruite par des réfugiés d'Andalousie au XVe siècle, elle conserve une architecture hispano-mauresque unique au Maroc avec ses maisons blanches, ses zelliges et ses moucharabiehs.",
    address: "Médina de Tétouan",
    images: [
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-5.3701, 35.5728] },
    averageRating: 4.6, reviewCount: 870, priceRange: "Gratuit",
    isFeatured: false,
  },

  // ── SAFI ─────────────────────────────────────────────────────────────────────
  {
    name: "Quartier des Potiers de Safi",
    cityName: "Safi",
    categorySlug: "marche-souk",
    description: "Seul quartier artisanal marocain où les potiers travaillent encore dans leurs ateliers à ciel ouvert avec des fours traditionnels à bois, le Quartier des Potiers de Safi produit la célèbre poterie verte de Safi depuis le XIVe siècle. Visites libres des ateliers, démonstrations de tournage et vente directe producteur.",
    address: "Colline des Potiers, Safi",
    images: [
      "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-9.2390, 32.2996] },
    averageRating: 4.7, reviewCount: 650, priceRange: "Gratuit",
    isFeatured: true,
  },

  // ── KENITRA ──────────────────────────────────────────────────────────────────
  {
    name: "Forêt de la Mamora",
    cityName: "Kenitra",
    categorySlug: "parc-jardin",
    description: "Plus grande forêt de chênes-lièges du monde avec 130 000 hectares, la Forêt de la Mamora s'étend entre Kénitra, Rabat et Meknès. Idéale pour le vélo, l'équitation, les pique-niques et l'observation des oiseaux migrateurs. Le liège récolté alimente 40% de la production mondiale de bouchons.",
    address: "Forêt de la Mamora, Kénitra",
    images: [
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-6.4850, 34.1600] },
    averageRating: 4.4, reviewCount: 420, priceRange: "Gratuit",
    isFeatured: false,
  },

  // ── NADOR ────────────────────────────────────────────────────────────────────
  {
    name: "Lagune de Marchica",
    cityName: "Nador",
    categorySlug: "plage",
    description: "Deuxième plus grande lagune méditerranéenne du monde avec 115 km², Marchica est un écosystème remarquable classé zone humide d'importance internationale. Ses eaux calmes et cristallines, sa faune d'oiseaux migrateurs (flamants roses, hérons) et son projet touristique durable en font une destination nature de premier ordre.",
    address: "Lagune de Marchica, Nador",
    images: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop",
    ],
    location: { type: "Point", coordinates: [-2.8500, 35.0500] },
    averageRating: 4.6, reviewCount: 380, priceRange: "Gratuit",
    isFeatured: false,
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: "cityguide" });
  console.log("MongoDB connecté ✓");

  // 1. Supprimer les vieilles catégories faker (garder Riad/Stay si elle existe)
  const riadStay = await Category.findOne({ slug: "riad-stay" });
  await Category.deleteMany({ slug: { $ne: "riad-stay" } });
  console.log("Anciennes catégories supprimées ✓");

  // 2. Insérer les nouvelles catégories (upsert sur slug)
  const catMap = {}; // slug → _id
  for (const c of CATEGORIES) {
    if (c.slug === "hotel-riad" && riadStay) {
      catMap[c.slug] = riadStay._id;
      continue;
    }
    const doc = await Category.findOneAndUpdate(
      { slug: c.slug },
      { $set: { name: c.name, slug: c.slug, icon: c.icon } },
      { upsert: true, new: true }
    );
    catMap[c.slug] = doc._id;
  }
  console.log(`${Object.keys(catMap).length} catégories prêtes ✓`);

  // 3. Charger toutes les villes
  const cities = await City.find({});
  const cityByName = {};
  cities.forEach((c) => { cityByName[c.name] = c._id; });

  // 4. Supprimer tous les anciens lieux faker
  await Place.deleteMany({});
  console.log("Anciens lieux supprimés ✓");

  // 5. Insérer les nouveaux lieux
  let inserted = 0;
  let skipped  = 0;

  for (const p of PLACES) {
    const cityId = cityByName[p.cityName];
    if (!cityId) {
      console.warn(`  ⚠  Ville introuvable : "${p.cityName}" — lieu ignoré : ${p.name}`);
      skipped++;
      continue;
    }
    const categoryId = catMap[p.categorySlug];
    if (!categoryId) {
      console.warn(`  ⚠  Catégorie introuvable : "${p.categorySlug}" — lieu ignoré : ${p.name}`);
      skipped++;
      continue;
    }

    const slug = p.name.toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    await Place.create({
      name:          p.name,
      slug,
      categoryId,
      cityId,
      location:      p.location || { type: "Point", coordinates: [0, 0] },
      description:   p.description || "",
      address:       p.address || "",
      images:        p.images || [],
      averageRating: p.averageRating || 0,
      reviewCount:   p.reviewCount || 0,
      priceRange:    p.priceRange || "",
      isFeatured:    p.isFeatured || false,
      status:        "active",
    });

    console.log(`  ✓  ${p.name} (${p.cityName})`);
    inserted++;
  }

  console.log(`\n✅  Terminé : ${inserted} lieux insérés, ${skipped} ignorés`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌  Erreur :", err.message);
  process.exit(1);
});
