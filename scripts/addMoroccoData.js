// ─────────────────────────────────────────────────────────────────────────────
//  addMoroccoData.js  — Enrichit la base avec :
//    • 12 nouvelles villes marocaines emblématiques
//    • 5 nouvelles catégories de lieux
//    • 40+ vrais lieux marocains avec descriptions, GPS et images
//    • 20 nouveaux événements réels (sans supprimer les existants)
//
//  Usage : node scripts/addMoroccoData.js
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const mongoose = require("mongoose");
const City     = require("../models/City");
const Category = require("../models/Category");
const Place    = require("../models/Place");
const Event    = require("../models/Event");

// ─── 1. NOUVELLES VILLES ─────────────────────────────────────────────────────
const NEW_CITIES = [
  { name: "Essaouira",    slug: "essaouira",    country: "Morocco", description: "La Cité des Alizés, classée UNESCO, réputée pour ses remparts portugais, ses galeries d'art et le Festival Gnaoua.", coverImage: "https://images.unsplash.com/photo-1539020140153-e479b8e201e7?w=800" },
  { name: "Chefchaouen",  slug: "chefchaouen",  country: "Morocco", description: "La Perle Bleue du Rif : médina aux maisons bleues et blanches, nichée dans les montagnes du Rif.", coverImage: "https://images.unsplash.com/photo-1548013146-72479768bada?w=800" },
  { name: "Ouarzazate",   slug: "ouarzazate",   country: "Morocco", description: "Porte du Sahara et capitale du cinéma africain, entourée de kasbahs et de paysages lunaires.", coverImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800" },
  { name: "Ifrane",       slug: "ifrane",       country: "Morocco", description: "La Suisse du Maroc : station de montagne du Moyen Atlas à 1 650 m d'altitude, entourée de cèdres.", coverImage: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800" },
  { name: "Merzouga",     slug: "merzouga",     country: "Morocco", description: "Porte d'entrée de l'Erg Chebbi, les plus hautes dunes de sable doré du Maroc saharien.", coverImage: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800" },
  { name: "Dakhla",       slug: "dakhla",       country: "Morocco", description: "Lagune paradisiaque de 40 km, capitale mondiale du kitesurf et du windsurf sur l'Atlantique.", coverImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800" },
  { name: "Asilah",       slug: "asilah",       country: "Morocco", description: "Petite médina fortifiée sur l'Atlantique, connue pour ses murales d'art et son festival culturel international.", coverImage: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=800" },
  { name: "Al Hoceima",   slug: "al-hoceima",   country: "Morocco", description: "Riviera méditerranéenne du Maroc : plages cristallines, Parc National d'Al Hoceima et ambiance riffaine.", coverImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800" },
  { name: "Zagora",       slug: "zagora",       country: "Morocco", description: "Oasis porteuse de la légende 'Tombouctou 52 jours' et point de départ des raids dans le désert du Drâa.", coverImage: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800" },
  { name: "Taroudant",    slug: "taroudant",    country: "Morocco", description: "Le Petit Marrakech : ville berbère ceinte de remparts ocre du XVIe siècle, au pied de l'Anti-Atlas.", coverImage: "https://images.unsplash.com/photo-1539020140153-e479b8e201e7?w=800" },
  { name: "Tiznit",       slug: "tiznit",       country: "Morocco", description: "Capitale de la bijouterie berbère : remparts rose, mellah historique et artisans de l'argent réputés.", coverImage: "https://images.unsplash.com/photo-1509099381441-ea3c0cf98b94?w=800" },
  { name: "Errachidia",   slug: "errachidia",   country: "Morocco", description: "Carrefour des oasis du Tafilalet et porte d'entrée vers l'Erg Chebbi et les gorges du Ziz.", coverImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800" },
];

// ─── 2. NOUVELLES CATÉGORIES ──────────────────────────────────────────────────
const NEW_CATEGORIES = [
  { name: "Activités & Sports",  slug: "activites-sports",  icon: "🏄" },
  { name: "Galerie d'Art",       slug: "galerie-art",       icon: "🎨" },
  { name: "Hammam & Spa",        slug: "hammam-spa",        icon: "🛁" },
  { name: "Panorama & Vue",      slug: "panorama-vue",      icon: "🔭" },
  { name: "Désert & Dunes",      slug: "desert-dunes",      icon: "🐪" },
];

// ─── 3. NOUVEAUX LIEUX ───────────────────────────────────────────────────────
//  cityName doit correspondre exactement à City.name dans la DB
const NEW_PLACES = [

  // ── ESSAOUIRA ────────────────────────────────────────────────────────────────
  {
    name: "Remparts et Skala d'Essaouira",
    cityName: "Essaouira", categorySlug: "site-historique",
    description: "Les remparts d'Essaouira, construits par l'architecte français Théodore Cornut au XVIIIe siècle sur ordre du Sultan Sidi Mohammed Ben Abdallah, sont classés UNESCO. La Skala de la Ville offre une vue imprenable sur l'Atlantique et les canons portugais du XVIe siècle. Jimi Hendrix et Orson Welles ont séjourné dans cette ville hors du temps.",
    address: "Skala de la Ville, Essaouira",
    images: ["https://images.unsplash.com/photo-1539020140153-e479b8e201e7?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-9.7736, 31.5125] },
    averageRating: 4.9, reviewCount: 3210, priceRange: "Gratuit",
    isFeatured: true,
  },
  {
    name: "Médina d'Essaouira",
    cityName: "Essaouira", categorySlug: "marche-souk",
    description: "Médina classée au patrimoine mondial de l'UNESCO, Essaouira séduit par ses ruelles blanches et bleues battues par le vent marin, ses galeries d'art, ses ateliers de thuya (bois endémique de la région) et ses échoppes de musiciens gnaoua. Le port de pêche coloré animé dès l'aube est un spectacle unique.",
    address: "Médina, Essaouira",
    images: ["https://images.unsplash.com/photo-1509099381441-ea3c0cf98b94?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-9.7683, 31.5085] },
    averageRating: 4.7, reviewCount: 1980, priceRange: "Gratuit",
    isFeatured: true,
  },
  {
    name: "Plage d'Essaouira",
    cityName: "Essaouira", categorySlug: "activites-sports",
    description: "La plage d'Essaouira, surnommée 'Wind City Africa', est la mecque mondiale du kitesurf et du windsurf grâce aux alizés constants qui la balayent toute l'année. Ses 10 km de sable fin, ses chevaux de plage berbères et ses couchers de soleil spectaculaires sur l'Atlantique en font l'une des plus belles plages du Maroc.",
    address: "Plage d'Essaouira",
    images: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-9.7600, 31.4900] },
    averageRating: 4.8, reviewCount: 2450, priceRange: "Gratuit",
    isFeatured: false,
  },

  // ── CHEFCHAOUEN ──────────────────────────────────────────────────────────────
  {
    name: "Médina Bleue de Chefchaouen",
    cityName: "Chefchaouen", categorySlug: "site-historique",
    description: "Nichée dans les montagnes du Rif à 600 m d'altitude, Chefchaouen est la ville aux mille nuances de bleu. Ses ruelles sont peintes en bleu depuis les années 1930 par la communauté juive locale. La Place Uta el-Hammam, la Kasbah ottomane et la Grande Mosquée constituent le cœur de cette médina unique au monde, destination phare de l'Instagrammable Maroc.",
    address: "Médina de Chefchaouen",
    images: ["https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-5.2636, 35.1711] },
    averageRating: 4.9, reviewCount: 4870, priceRange: "Gratuit",
    isFeatured: true,
  },
  {
    name: "Cascade d'Akchour",
    cityName: "Chefchaouen", categorySlug: "parc-jardin",
    description: "À 25 km de Chefchaouen, les cascades d'Akchour surgissent au fond des gorges du Rif dans un écrin de verdure époustouflant. Le trek de 3h aller-retour longe la rivière Farda à travers une forêt de pins et de chênes, passant devant des piscines naturelles turquoise avant d'atteindre une cascade de 100 mètres de haut.",
    address: "Parc National de Talassemtane, Chefchaouen",
    images: ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-5.1527, 35.1988] },
    averageRating: 4.8, reviewCount: 1340, priceRange: "Gratuit / transport 40 MAD",
    isFeatured: false,
  },
  {
    name: "Riad Lina & Spa Chefchaouen",
    cityName: "Chefchaouen", categorySlug: "hotel-riad",
    description: "Au cœur de la médina bleue, Riad Lina propose des chambres décorées de zelliges bleus et de boiseries de cèdre sculpté. Le rooftop panoramique offre une vue à 360° sur les toits bleus et les montagnes du Rif. Le restaurant sert une cuisine rifaine traditionnelle — couscous à la viande fumée, tajines aux légumes du jardin potager.",
    address: "Médina de Chefchaouen",
    images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-5.2620, 35.1698] },
    averageRating: 4.7, reviewCount: 560, priceRange: "600–1 200 MAD / nuit",
    isFeatured: false,
  },

  // ── OUARZAZATE ───────────────────────────────────────────────────────────────
  {
    name: "Kasbah Taourirt",
    cityName: "Ouarzazate", categorySlug: "site-historique",
    description: "Ancien palais du pacha Thami el-Glaoui, la Kasbah Taourirt est l'une des plus grandes kasbahs du Maroc encore habitée. Ses tours crénelées en pisé rose, ses couloirs labyrinthiques, ses salons décorés de stuc et de peintures géométriques amazighes ont servi de décor pour de nombreux films hollywoodiens. L'UNESCO la restaure depuis 1994.",
    address: "Avenue Mohammed V, Ouarzazate",
    images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-6.8960, 30.9201] },
    averageRating: 4.7, reviewCount: 1890, priceRange: "20 MAD",
    isFeatured: true,
  },
  {
    name: "Atlas Corporation Studios",
    cityName: "Ouarzazate", categorySlug: "site-historique",
    description: "Les plus grands studios de cinéma d'Afrique et parmi les plus importants au monde. Gladiator, Game of Thrones, Lawrence d'Arabie, Babel et The Mummy ont été tournés ici. Les visites guidées permettent d'explorer les décors grandeur nature : Égypte ancienne, Rome impériale, ruelles arabes et désert du Sahara. Spectacle garanti.",
    address: "Route de Marrakech, Ouarzazate",
    images: ["https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-6.8527, 30.9332] },
    averageRating: 4.6, reviewCount: 1230, priceRange: "80 MAD adulte",
    isFeatured: true,
  },
  {
    name: "Ksar Aït Ben Haddou",
    cityName: "Ouarzazate", categorySlug: "site-historique",
    description: "Chef-d'œuvre de l'architecture en pisé et classé au patrimoine mondial de l'UNESCO depuis 1987, Aït Ben Haddou est un ksar (village fortifié) berbère du XVIe siècle perché sur une colline dominant l'oued Ounila. Décor de films mythiques (Gladiator, Babel, Game of Thrones), il est habité par seulement quelques familles gardant vivante une tradition millénaire.",
    address: "Aït Ben Haddou, province d'Ouarzazate",
    images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-7.1322, 31.0473] },
    averageRating: 4.9, reviewCount: 3560, priceRange: "Gratuit / guide 100 MAD",
    isFeatured: true,
  },

  // ── MERZOUGA ─────────────────────────────────────────────────────────────────
  {
    name: "Erg Chebbi — Dunes de Merzouga",
    cityName: "Merzouga", categorySlug: "desert-dunes",
    description: "L'Erg Chebbi est l'un des plus spectaculaires ergs (mer de dunes) du Sahara marocain, avec des dunes pouvant atteindre 160 m de hauteur. Le coucher et le lever du soleil sur ces dunes orangées changent leur couleur toutes les minutes. Les excursions en dromadaire, les nuits sous les étoiles en campement berbère et le sandboarding sont les activités phares de cette expérience inoubliable.",
    address: "Erg Chebbi, Merzouga",
    images: ["https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-4.0126, 31.0800] },
    averageRating: 5.0, reviewCount: 4210, priceRange: "Excursion dromadaire : 200 MAD / nuit bivouac : 400 MAD",
    isFeatured: true,
  },
  {
    name: "Lac Dayet Srji",
    cityName: "Merzouga", categorySlug: "parc-jardin",
    description: "Lac salé saisonnier en bordure de l'Erg Chebbi, Dayet Srji est un refuge ornithologique exceptionnel. De novembre à mars, des milliers de flamants roses, d'ibis et de canards sauvages s'y installent, créant un spectacle surréaliste : des oiseaux roses au premier plan et les dunes dorées à l'horizon. Un paradis photographique peu connu.",
    address: "Lac Dayet Srji, Merzouga",
    images: ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-4.0000, 31.1100] },
    averageRating: 4.7, reviewCount: 380, priceRange: "Gratuit",
    isFeatured: false,
  },

  // ── DAKHLA ───────────────────────────────────────────────────────────────────
  {
    name: "Lagune de Dakhla",
    cityName: "Dakhla", categorySlug: "activites-sports",
    description: "La lagune de Dakhla, longue de 40 km et protégée des houles atlantiques, offre des conditions de kitesurf et de windsurf parmi les meilleures au monde, avec un vent régulier de 20 à 30 nœuds 300 jours par an. Les écoles de kite, les safaris en quad dans les dunes et les excursions en bateau jusqu'aux bancs de sable roses font de Dakhla une destination d'aventure unique.",
    address: "Lagune de Dakhla",
    images: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-15.9325, 23.6847] },
    averageRating: 4.9, reviewCount: 1560, priceRange: "Cours kite : 400 MAD / heure",
    isFeatured: true,
  },

  // ── ASILAH ───────────────────────────────────────────────────────────────────
  {
    name: "Remparts et Médina d'Asilah",
    cityName: "Asilah", categorySlug: "galerie-art",
    description: "Chaque été depuis 1978, le Moussem Culturel International d'Asilah transforme les murs de la vieille ville en une galerie d'art à ciel ouvert. Des artistes du monde entier peignent des murales géantes sur les remparts portugais du XVe siècle. La médina blanche et bleue, ses galeries permanentes et sa plage sauvage au pied des fortifications font d'Asilah l'une des villes les plus photogéniques du Maroc.",
    address: "Médina d'Asilah",
    images: ["https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-6.0344, 35.4658] },
    averageRating: 4.8, reviewCount: 870, priceRange: "Gratuit",
    isFeatured: true,
  },

  // ── AL HOCEIMA ───────────────────────────────────────────────────────────────
  {
    name: "Parc National d'Al Hoceima",
    cityName: "Al Hoceima", categorySlug: "parc-jardin",
    description: "Seul parc national marin du Maroc, Al Hoceima protège 48 000 hectares de côtes méditerranéennes vierges, de criques inaccessibles par voie terrestre, de falaises à aigrettes de Méditerranée et de fonds marins cristallins à dauphins. Le snorkeling, la plongée et les excursions en bateau jusqu'aux criques secrètes (Plage Quemado, Plage Asfiha) sont les activités phares.",
    address: "Parc National d'Al Hoceima",
    images: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-3.9275, 35.2517] },
    averageRating: 4.8, reviewCount: 680, priceRange: "Gratuit",
    isFeatured: false,
  },

  // ── IFRANE ───────────────────────────────────────────────────────────────────
  {
    name: "Parc National d'Ifrane",
    cityName: "Ifrane", categorySlug: "parc-jardin",
    description: "Surnommée 'La Suisse du Maroc', Ifrane est une ville de montagne du Moyen Atlas à 1 665 m d'altitude, entourée par le plus grand parc national du Maroc (125 000 ha). Ses cèdres centenaires abritent les dernières singes magots (macaques de Barbarie) d'Afrique du Nord. En hiver, la neige recouvre ses chalets et le lac Dayet Aoua se transforme en patinoire naturelle.",
    address: "Parc National d'Ifrane",
    images: ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-5.1080, 33.5333] },
    averageRating: 4.7, reviewCount: 920, priceRange: "Gratuit",
    isFeatured: false,
  },

  // ── ZAGORA ───────────────────────────────────────────────────────────────────
  {
    name: "Vallée du Drâa",
    cityName: "Zagora", categorySlug: "desert-dunes",
    description: "La Vallée du Drâa, longue de 200 km entre Ouarzazate et Zagora, est le plus long fleuve du Maroc en surface. Bordée de palmiers et de ksour (villages fortifiés) berbères, elle traverse des oasis luxuriantes contrastant avec les déserts caillouteux environnants. Le marché de Zagora (mercredi et dimanche), les bivouacs sous les étoiles et les excursions en dromadaire jusqu'aux dunes de Tinfou font de cette vallée une expérience inoubliable.",
    address: "Vallée du Drâa, Zagora",
    images: ["https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-5.8400, 30.3322] },
    averageRating: 4.8, reviewCount: 760, priceRange: "Gratuit / excursions en sus",
    isFeatured: true,
  },

  // ── TAROUDANT ────────────────────────────────────────────────────────────────
  {
    name: "Remparts de Taroudant",
    cityName: "Taroudant", categorySlug: "site-historique",
    description: "Surnommée 'Le Petit Marrakech', Taroudant est ceinte de 7,5 km de remparts saâdiens du XVIe siècle en pisé ocre, parfaitement préservés. Le tour des remparts à pied, à vélo ou en calèche révèle une ville berbère authentique loin des foules touristiques. Les souks de l'artisanat (babouches, bijoux amazighs, argan) et les jardins de la Pacha Glaoui complètent la découverte.",
    address: "Remparts de Taroudant",
    images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-8.8769, 30.4700] },
    averageRating: 4.6, reviewCount: 530, priceRange: "Gratuit",
    isFeatured: false,
  },

  // ── TIZNIT ───────────────────────────────────────────────────────────────────
  {
    name: "Souk des Bijoutiers de Tiznit",
    cityName: "Tiznit", categorySlug: "marche-souk",
    description: "Tiznit est depuis des siècles la capitale de la bijouterie berbère du Maroc. Les ateliers du Mellah historique produisent des fibules, des bracelets, des colliers et des diadèmes en argent gravé aux motifs amazighs géométriques. Le Grand Souk du jeudi rassemble des artisans venus de tout le Souss et de l'Anti-Atlas dans une effervescence colorée où chaque pièce raconte une histoire tribale.",
    address: "Souk des Bijoutiers, Tiznit",
    images: ["https://images.unsplash.com/photo-1509099381441-ea3c0cf98b94?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-9.7321, 29.6976] },
    averageRating: 4.5, reviewCount: 410, priceRange: "Gratuit",
    isFeatured: false,
  },

  // ── SUPPLÉMENTS DANS LES VILLES EXISTANTES ────────────────────────────────

  // Casablanca
  {
    name: "Villa des Arts de Casablanca",
    cityName: "Casablanca", categorySlug: "galerie-art",
    description: "Installée dans une villa Art déco des années 1930 classée patrimoine architectural, la Villa des Arts de Casablanca est gérée par la Fondation ONA. Elle accueille des expositions temporaires d'artistes marocains contemporains et une collection permanente de peintures, sculptures et photographies retraçant 70 ans de création artistique au Maroc. Les vernissages mensuels réunissent l'intelligentsia casablancaise.",
    address: "316 Bd Brahim Roudani, Casablanca",
    images: ["https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-7.6391, 33.5844] },
    averageRating: 4.5, reviewCount: 380, priceRange: "Gratuit",
    isFeatured: false,
  },
  {
    name: "Hammam Ziani Casablanca",
    cityName: "Casablanca", categorySlug: "hammam-spa",
    description: "Le Hammam Ziani est l'adresse de référence du bain traditionnel marocain à Casablanca. Gommage au kessa, masque au ghassoul (argile volcanique du Moyen Atlas), massage à l'huile d'argan et enveloppement au savon beldi noir — un rituel de bien-être millénaire dans un cadre de zellige et de marbre blanc. Trois espaces séparés : femmes, hommes, famille.",
    address: "Maarif, Casablanca",
    images: ["https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-7.6450, 33.5811] },
    averageRating: 4.6, reviewCount: 870, priceRange: "150–350 MAD",
    isFeatured: false,
  },

  // Marrakech
  {
    name: "Palais El Badi",
    cityName: "Marrakech", categorySlug: "site-historique",
    description: "Commandé par le Sultan Ahmed el-Mansour pour célébrer sa victoire à la Bataille des Trois Rois (1578), le Palais El Badi fut en son temps l'un des plus somptueux palaces du monde, avec ses marbres de Carrare échangés contre du sucre marocain. Aujourd'hui en ruines sublimes, il accueille chaque été les représentations du Festival des Arts Populaires dans son immense cour de 135 m×110 m.",
    address: "Kaat Ben Nahid, Médina, Marrakech",
    images: ["https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-7.9839, 31.6182] },
    averageRating: 4.5, reviewCount: 1870, priceRange: "70 MAD",
    isFeatured: false,
  },
  {
    name: "Beldi Country Club",
    cityName: "Marrakech", categorySlug: "hammam-spa",
    description: "Havre de paix à 6 km du centre de Marrakech, le Beldi Country Club s'étend sur 7 hectares de jardins d'oliviers, de roses et de plantes aromatiques. Ses deux piscines, son hammam royal aux soins d'argane et de rose, ses terrasses ombragées et son restaurant de cuisine marocaine du jardin en font le spa de villégiature le plus couru de Marrakech.",
    address: "Route du Barrage, Marrakech",
    images: ["https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-7.9605, 31.5900] },
    averageRating: 4.8, reviewCount: 640, priceRange: "500–1 500 MAD / soin",
    isFeatured: false,
  },

  // Fès
  {
    name: "Medersa Bou Inania",
    cityName: "Fes", categorySlug: "mosquee",
    description: "Joyau du XIVe siècle mérinide, la Medersa Bou Inania est la seule madrasa de Fès à être considérée comme mosquée officielle et accessible aux non-musulmans pour la prière. Ses boiseries de cèdre sculpté, ses zelliges multicolores, son marbre blanc de Carrare et sa salle des ablutions alimentée par une horloge hydraulique médiévale unique en font le chef-d'œuvre de l'art mérinide au Maroc.",
    address: "Talaa Kebira, Fès el-Bali",
    images: ["https://images.unsplash.com/photo-1545167871-6e13c5b77e57?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-4.9779, 34.0635] },
    averageRating: 4.8, reviewCount: 1560, priceRange: "70 MAD",
    isFeatured: false,
  },
  {
    name: "Médersa Attarine",
    cityName: "Fes", categorySlug: "musee",
    description: "Construite par le Sultan Abou Saïd Othman II en 1325 pour héberger les étudiants de l'Université al-Quaraouiyine voisine, la Médersa Attarine est un trésor de l'art mérinide. Ses coursives en bois de cèdre sculpté, ses arabesques de plâtre et ses 3 000 m² de zelliges en font l'une des plus belles medersa du Maroc. La terrasse offre une vue plongeante sur le minaret de la Karaouyine.",
    address: "Souk el-Attarine, Fès el-Bali",
    images: ["https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-4.9741, 34.0638] },
    averageRating: 4.7, reviewCount: 920, priceRange: "70 MAD",
    isFeatured: false,
  },

  // Rabat
  {
    name: "Chellah Nécropole",
    cityName: "Rabat", categorySlug: "site-historique",
    description: "Ancienne cité romaine (Sala Colonia) et nécropole mérinide du XIVe siècle, Chellah est un site archéologique unique entouré de remparts classés UNESCO. Ses ruines romaines, ses tombeaux de sultans et ses jardins envahis d'ibis nicheurs créent une atmosphère hors du temps. Le Festival des Nuits de Chellah y organise chaque printemps des concerts de musique du monde dans ce cadre magique.",
    address: "Avenue Yacoub el-Mansour, Rabat",
    images: ["https://images.unsplash.com/photo-1545167871-6e13c5b77e57?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-6.8069, 34.0082] },
    averageRating: 4.7, reviewCount: 1240, priceRange: "70 MAD",
    isFeatured: false,
  },
  {
    name: "Plage de Temara",
    cityName: "Rabat", categorySlug: "plage",
    description: "À 15 km au sud de Rabat, la plage de Temara est la plage familiale de référence de la capitale marocaine. Ses 5 km de sable fin, ses vagues modérées idéales pour le surf débutant, ses restaurants de poisson frais et son ambiance décontractée en week-end en font une escapade parfaite depuis Rabat ou Casablanca.",
    address: "Temara, Rabat",
    images: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-6.9224, 33.9286] },
    averageRating: 4.4, reviewCount: 780, priceRange: "Gratuit",
    isFeatured: false,
  },

  // Agadir
  {
    name: "Vallée du Paradis",
    cityName: "Agadir", categorySlug: "parc-jardin",
    description: "À 60 km d'Agadir dans les contreforts de l'Anti-Atlas, la Vallée du Paradis est une oasis verdoyante traversée par l'oued Aït Baamrane. Ses gorges rocheuses, ses bassins naturels d'eau douce propices à la baignade, ses arganiers centenaires et ses villages berbères traditionnels en font une excursion parfaite depuis Agadir, loin des plages bondées.",
    address: "Vallée du Paradis, région d'Agadir",
    images: ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-9.4800, 30.3800] },
    averageRating: 4.7, reviewCount: 540, priceRange: "Gratuit",
    isFeatured: false,
  },

  // Tanger
  {
    name: "Plage Tanger City Beach",
    cityName: "Tangier", categorySlug: "plage",
    description: "La grande plage urbaine de Tanger s'étend sur 4 km en demi-cercle au pied de la médina et de la baie. Idéale pour les familles le matin, elle s'anime en soirée avec ses restaurants de fruits de mer, ses terrasses musicales et ses promeneurs contemplant le coucher de soleil sur la baie. Les parasols de couleurs et les bateaux de pêche créent un tableau vivant.",
    address: "Baie de Tanger",
    images: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-5.8082, 35.7739] },
    averageRating: 4.4, reviewCount: 1120, priceRange: "Gratuit",
    isFeatured: false,
  },

  // Meknès
  {
    name: "Volubilis — Cité Romaine",
    cityName: "Meknes", categorySlug: "site-historique",
    description: "Les ruines romaines de Volubilis, à 33 km de Meknès, sont les mieux préservées du Maroc et classées UNESCO depuis 1997. Ancienne capitale de la Maurétanie Tingitane (IIe siècle ap. J.-C.), la ville compte un arc de triomphe de Caracalla, le Capitole, le Forum et des dizaines de villas aux mosaïques polychromes in situ représentant scènes de chasse, Orphée et les Douze Travaux d'Hercule.",
    address: "Volubilis, province de Meknès",
    images: ["https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-5.5553, 34.0730] },
    averageRating: 4.9, reviewCount: 2870, priceRange: "70 MAD",
    isFeatured: true,
  },

  // Safi
  {
    name: "Château de la Mer — Safi",
    cityName: "Safi", categorySlug: "site-historique",
    description: "Forteresse portugaise construite en 1508 dominant le port de pêche de Safi, le Château de la Mer (Dar el-Bahr) a servi de comptoir commercial, de forteresse militaire et de prison pendant plusieurs siècles. Son musée de la poterie expose la plus belle collection de céramiques vertes de Safi. La terrasse offre un panorama exceptionnel sur l'Atlantique et les bateaux de pêche.",
    address: "Place de l'Indépendance, Safi",
    images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-9.2292, 32.3000] },
    averageRating: 4.5, reviewCount: 430, priceRange: "20 MAD",
    isFeatured: false,
  },

  // Nador
  {
    name: "Plage Kariat Arkmane",
    cityName: "Nador", categorySlug: "plage",
    description: "À 30 km de Nador, la plage de Kariat Arkmane borde une lagune tranquille séparée de la mer Méditerranée par un cordon littoral. Ses eaux peu profondes et chaudes, idéales pour les enfants, son cadre naturel préservé, ses campings familiaux et sa réputation de plage propre (Pavillon Bleu) en font la destination balnéaire privilégiée des familles de la région orientale.",
    address: "Kariat Arkmane, Nador",
    images: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop"],
    location: { type: "Point", coordinates: [-2.5700, 35.1400] },
    averageRating: 4.5, reviewCount: 320, priceRange: "Gratuit",
    isFeatured: false,
  },
];

// ─── 4. NOUVEAUX ÉVÉNEMENTS ───────────────────────────────────────────────────
const NEW_EVENTS = [
  // Essaouira
  {
    title: "Festival Gnaoua et Musiques du Monde — Essaouira",
    description: "Le plus grand festival de musique gnaoua au monde transforme Essaouira en scène planétaire pendant 4 jours. Maâlems gnaoua, jazzmen américains, guitaristes flamencos et percussionnistes africains fusionnent sur 5 scènes dont la grande scène de la plage accueillant 500 000 spectateurs. Entrée libre pour tous les concerts en plein air.",
    cityName: "Essaouira", organizer: "Association Gnaoua & Musiques du Monde",
    ticketPrice: 0, isFeatured: true, status: "upcoming",
    coverImage: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop",
    location: { type: "Point", coordinates: [-9.7736, 31.5125] },
    dateFrom: "2026-06-18T18:00:00Z", dateTo: "2026-06-21T02:00:00Z",
  },
  // Chefchaouen
  {
    title: "Randonnée du Rif — Chefchaouen Trail",
    description: "Trail de montagne international à travers les forêts de pins et de cèdres du Parc National de Talassemtane au départ de Chefchaouen. Trois parcours : 10 km (découverte), 25 km (semi-trail) et 42 km (trail complet) avec vue sur le Détroit de Gibraltar. Ravitaillements aux points d'eau des villages rifains.",
    cityName: "Chefchaouen", organizer: "Club Alpin Marocain",
    ticketPrice: 150, isFeatured: false, status: "upcoming",
    coverImage: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop",
    location: { type: "Point", coordinates: [-5.2636, 35.1711] },
    dateFrom: "2026-05-10T07:00:00Z", dateTo: "2026-05-10T18:00:00Z",
  },
  // Ouarzazate
  {
    title: "Festival International de Cinéma du Désert — Ouarzazate",
    description: "Ouarzazate, capitale du cinéma africain, accueille son festival annuel avec projections en plein air sous les étoiles du désert, masterclasses avec réalisateurs internationaux, visites des décors des Atlas Studios et soirées de gala dans les kasbahs. Films sélectionnés du monde arabe, d'Afrique et d'Europe.",
    cityName: "Ouarzazate", organizer: "Centre Cinématographique Marocain",
    ticketPrice: 50, isFeatured: true, status: "upcoming",
    coverImage: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop",
    location: { type: "Point", coordinates: [-6.8960, 30.9201] },
    dateFrom: "2026-10-10T18:00:00Z", dateTo: "2026-10-15T23:00:00Z",
  },
  // Merzouga
  {
    title: "Bivouac & Étoiles — Erg Chebbi",
    description: "Expérience nocturne exceptionnelle dans les dunes de l'Erg Chebbi : ascension du sommet d'une dune de 150 m au coucher du soleil, dîner traditionnel berbère sous la voûte étoilée du Sahara, nuit en tente de luxe avec lits et literie, réveil au lever du soleil sur les dunes dorées et petit-déjeuner au feu de bois.",
    cityName: "Merzouga", organizer: "Kasbah du Sahara",
    ticketPrice: 850, isFeatured: true, status: "upcoming",
    coverImage: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&auto=format&fit=crop",
    location: { type: "Point", coordinates: [-4.0126, 31.0800] },
    dateFrom: "2026-05-01T16:00:00Z", dateTo: "2026-11-30T10:00:00Z",
  },
  // Dakhla
  {
    title: "Dakhla Attitude — Festival Kitesurf",
    description: "Le plus grand festival de sports de glisse de l'Atlantique sur la lagune de Dakhla : compétitions de kitesurf freestyle et race, démonstrations de wingfoil, cours gratuits pour débutants, concerts sur la plage et soirées dans les lodges au bord de l'eau. 3 000 participants de 60 nationalités attendus.",
    cityName: "Dakhla", organizer: "Dakhla Attitude Organization",
    ticketPrice: 0, isFeatured: true, status: "upcoming",
    coverImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop",
    location: { type: "Point", coordinates: [-15.9325, 23.6847] },
    dateFrom: "2026-04-02T09:00:00Z", dateTo: "2026-04-06T22:00:00Z",
  },
  // Asilah
  {
    title: "Moussem Culturel International d'Asilah",
    description: "Festival d'art et de culture le plus ancien du Maroc (depuis 1978), le Moussem d'Asilah rassemble artistes plasticiens, poètes, musiciens et intellectuels du monde arabe, africain et méditerranéen. Fresques murales géantes sur les remparts, conférences au Palais de la Culture, concerts de musiques du monde et ateliers d'arts plastiques ouverts au public.",
    cityName: "Asilah", organizer: "Fondation du Moussem Culturel",
    ticketPrice: 0, isFeatured: true, status: "upcoming",
    coverImage: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=800&auto=format&fit=crop",
    location: { type: "Point", coordinates: [-6.0344, 35.4658] },
    dateFrom: "2026-08-01T10:00:00Z", dateTo: "2026-08-30T23:00:00Z",
  },
  // Marrakech supplémentaires
  {
    title: "Marrakech Art Fair",
    description: "Foire d'art contemporain international au Palais des Congrès de Marrakech : 80 galeries d'art de 25 pays, 500 artistes, installations monumentales dans les riads de la médina, performances live, ateliers d'artistes et soirées de vernissage VIP. Le rendez-vous incontournable de la scène artistique africaine et arabe.",
    cityName: "Marrakech", organizer: "Marrakech Art Fair Committee",
    ticketPrice: 200, isFeatured: false, status: "upcoming",
    coverImage: "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&auto=format&fit=crop",
    location: { type: "Point", coordinates: [-7.9911, 31.6340] },
    dateFrom: "2026-03-12T10:00:00Z", dateTo: "2026-03-15T22:00:00Z",
  },
  // Rabat supplémentaires
  {
    title: "Jazz au Chellah — Rabat",
    description: "Concert de jazz exceptionnel dans le cadre magique des ruines romaines et mérinides de la Nécropole de Chellah à Rabat. Chaque printemps, des artistes de jazz marocains et internationaux se produisent au coucher du soleil dans cette enceinte chargée d'histoire, avec pour décor les cigognes nichant sur les tours millénaires.",
    cityName: "Rabat", organizer: "Fondation ONA",
    ticketPrice: 120, isFeatured: false, status: "upcoming",
    coverImage: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&auto=format&fit=crop",
    location: { type: "Point", coordinates: [-6.8069, 34.0082] },
    dateFrom: "2026-05-14T19:00:00Z", dateTo: "2026-05-16T23:00:00Z",
  },
  // Casablanca
  {
    title: "Casa Fashion Week",
    description: "Semaine de la mode casablancaise : défilés de créateurs marocains émergents et établis au showroom du Hyatt Regency, pop-up stores dans le quartier de Gauthier, ateliers de stylisme, expositions de photographie de mode et soirées afterparty dans les clubs branchés de la Corniche.",
    cityName: "Casablanca", organizer: "Fédération Marocaine de Mode",
    ticketPrice: 300, isFeatured: false, status: "upcoming",
    coverImage: "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=800&auto=format&fit=crop",
    location: { type: "Point", coordinates: [-7.6192, 33.5912] },
    dateFrom: "2026-10-01T18:00:00Z", dateTo: "2026-10-05T23:00:00Z",
  },
  // Fès
  {
    title: "Nuits du Ramadan à Fès",
    description: "Chaque soir de Ramadan, la Médina de Fès se transforme en scène culturelle à ciel ouvert : récitals de musique andalouse à la Medersa Bou Inania, soirées soufies au Zaouia Moulay Idriss, marché nocturne de la Karaouiyine et ftour collectif pour 5 000 personnes sur la place Rcif avec la communauté de Fès.",
    cityName: "Fes", organizer: "Municipalité de Fès",
    ticketPrice: 0, isFeatured: true, status: "upcoming",
    coverImage: "https://images.unsplash.com/photo-1545167871-6e13c5b77e57?w=800&auto=format&fit=crop",
    location: { type: "Point", coordinates: [-4.9771, 34.0642] },
    dateFrom: "2026-03-01T19:00:00Z", dateTo: "2026-03-30T02:00:00Z",
  },
  // Agadir
  {
    title: "Souss Music Festival — Agadir",
    description: "Grand festival de musiques amazighes et du monde sur la Plage d'Agadir réunissant les meilleurs artistes de musique tachelhit (berbère du Souss), de reggae, d'afrobeat et de gnaoua. Scène principale sur la plage avec 20 000 spectateurs, scènes off dans les cafés de la médina d'Inezgane et ateliers de percussions.",
    cityName: "Agadir", organizer: "Conseil Régional Souss-Massa",
    ticketPrice: 0, isFeatured: false, status: "upcoming",
    coverImage: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop",
    location: { type: "Point", coordinates: [-9.5981, 30.4278] },
    dateFrom: "2026-08-20T17:00:00Z", dateTo: "2026-08-23T02:00:00Z",
  },
  // Tanger
  {
    title: "Détroit Jazz Festival — Tanger",
    description: "Sur les hauteurs de la Kasbah de Tanger, avec vue sur le Détroit de Gibraltar et les côtes espagnoles, ce festival de jazz intimiste réunit 15 artistes internationaux pour 5 concerts au coucher du soleil. L'acoustique naturelle des remparts, le bruit des vagues et les lumières d'Algésiras en fond de scène créent une atmosphère unique.",
    cityName: "Tangier", organizer: "Institut Français de Tanger",
    ticketPrice: 180, isFeatured: false, status: "upcoming",
    coverImage: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&auto=format&fit=crop",
    location: { type: "Point", coordinates: [-5.8124, 35.7904] },
    dateFrom: "2026-07-10T19:30:00Z", dateTo: "2026-07-14T23:30:00Z",
  },
  // Ifrane
  {
    title: "Trail des Cèdres — Ifrane",
    description: "Course trail en altitude dans la cédraie du Moyen Atlas autour d'Ifrane avec 3 parcours : 8 km (rando famille), 21 km (semi-trail) et 45 km (ultra). Le tracé passe par les Cascades des Vierges, le lac Dayet Aoua et la réserve des singes magots. Ravitaillements en produits du terroir (miel, amandes, huile d'olive du Moyen Atlas).",
    cityName: "Ifrane", organizer: "Club Sportif d'Ifrane",
    ticketPrice: 120, isFeatured: false, status: "upcoming",
    coverImage: "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&auto=format&fit=crop",
    location: { type: "Point", coordinates: [-5.1080, 33.5333] },
    dateFrom: "2026-04-18T07:00:00Z", dateTo: "2026-04-18T17:00:00Z",
  },
  // Zagora
  {
    title: "Rallye des Roses — Zagora-Merzouga",
    description: "Raid 4x4 et moto de 5 jours traversant les paysages les plus spectaculaires du Maroc saharien : vallée du Drâa, gorges du Dadès, dunes de l'Erg Chebbi. Pas de compétition — la solidarité prime. Les participants transportent des denrées alimentaires et du matériel scolaire pour les villages traversés. Bivouacs en camping sauvage.",
    cityName: "Zagora", organizer: "Association Solidarité Sahara",
    ticketPrice: 2500, isFeatured: false, status: "upcoming",
    coverImage: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop",
    location: { type: "Point", coordinates: [-5.8400, 30.3322] },
    dateFrom: "2026-11-05T08:00:00Z", dateTo: "2026-11-09T18:00:00Z",
  },
  // El Jadida
  {
    title: "Festival des Arts de la Rue — El Jadida",
    description: "Dans les ruelles et sur les places de la Cité Portugaise classée UNESCO, des troupes de théâtre de rue, d'acrobates, de jongleurs, de musiciens et de conteurs d'Afrique, d'Europe et du monde arabe animent le patrimoine historique d'El Jadida pendant 4 jours. Spectacles gratuits, ateliers pour enfants et déambulations nocturnes aux flambeaux.",
    cityName: "El Jadida", organizer: "Association Cités et Gouvernements",
    ticketPrice: 0, isFeatured: false, status: "upcoming",
    coverImage: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&auto=format&fit=crop",
    location: { type: "Point", coordinates: [-8.5060, 33.2553] },
    dateFrom: "2026-07-16T17:00:00Z", dateTo: "2026-07-19T23:00:00Z",
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: "cityguide" });
  console.log("MongoDB connecté ✓\n");

  // ── 1. Villes ────────────────────────────────────────────────────────────────
  console.log("=== VILLES ===");
  let citiesAdded = 0;
  for (const c of NEW_CITIES) {
    const exists = await City.findOne({ slug: c.slug });
    if (exists) { console.log(`  ⏭  Existe déjà : ${c.name}`); continue; }
    await City.create(c);
    console.log(`  ✓  ${c.name}`);
    citiesAdded++;
  }
  console.log(`→ ${citiesAdded} villes ajoutées\n`);

  // ── 2. Catégories ────────────────────────────────────────────────────────────
  console.log("=== CATÉGORIES ===");
  const catMap = {};

  // Charger catégories existantes
  const existingCats = await Category.find({});
  existingCats.forEach(c => { catMap[c.slug] = c._id; });

  let catsAdded = 0;
  for (const c of NEW_CATEGORIES) {
    if (catMap[c.slug]) { console.log(`  ⏭  Existe déjà : ${c.name}`); continue; }
    const doc = await Category.create(c);
    catMap[c.slug] = doc._id;
    console.log(`  ✓  ${c.name}`);
    catsAdded++;
  }
  console.log(`→ ${catsAdded} catégories ajoutées\n`);

  // ── 3. Lieux ─────────────────────────────────────────────────────────────────
  console.log("=== LIEUX ===");

  // Recharger toutes les villes
  const allCities = await City.find({});
  const cityByName = {};
  allCities.forEach(c => { cityByName[c.name] = c._id; });

  let placesAdded = 0, placesSkipped = 0;
  for (const p of NEW_PLACES) {
    const cityId     = cityByName[p.cityName];
    const categoryId = catMap[p.categorySlug];

    if (!cityId) {
      console.warn(`  ⚠  Ville introuvable : "${p.cityName}" — ${p.name}`);
      placesSkipped++; continue;
    }
    if (!categoryId) {
      console.warn(`  ⚠  Catégorie introuvable : "${p.categorySlug}" — ${p.name}`);
      placesSkipped++; continue;
    }

    const exists = await Place.findOne({ name: p.name, cityId });
    if (exists) { console.log(`  ⏭  Existe déjà : ${p.name}`); continue; }

    const slug = p.name.toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    await Place.create({
      name: p.name, slug,
      categoryId, cityId,
      location:      p.location || { type: "Point", coordinates: [0, 0] },
      description:   p.description || "",
      address:       p.address || "",
      images:        p.images || [],
      averageRating: p.averageRating || 0,
      reviewCount:   p.reviewCount || 0,
      priceRange:    p.priceRange || "",
      isFeatured:    p.isFeatured || false,
      status: "active",
    });
    console.log(`  ✓  ${p.name} (${p.cityName})`);
    placesAdded++;
  }
  console.log(`→ ${placesAdded} lieux ajoutés, ${placesSkipped} ignorés\n`);

  // ── 4. Événements ────────────────────────────────────────────────────────────
  console.log("=== ÉVÉNEMENTS ===");
  let eventsAdded = 0, eventsSkipped = 0;
  for (const e of NEW_EVENTS) {
    const cityId = cityByName[e.cityName];
    if (!cityId) {
      console.warn(`  ⚠  Ville introuvable : "${e.cityName}" — ${e.title}`);
      eventsSkipped++; continue;
    }

    const exists = await Event.findOne({ title: e.title });
    if (exists) { console.log(`  ⏭  Existe déjà : ${e.title}`); continue; }

    await Event.create({
      title:       e.title,
      description: e.description || "",
      coverImage:  e.coverImage || "",
      organizer:   e.organizer || "",
      ticketPrice: e.ticketPrice ?? 0,
      location:    e.location || { type: "Point", coordinates: [0, 0] },
      cityId,
      dateRange: {
        from: new Date(e.dateFrom),
        to:   e.dateTo ? new Date(e.dateTo) : null,
      },
      status:     e.status || "upcoming",
      isFeatured: e.isFeatured || false,
    });
    console.log(`  ✓  ${e.title}`);
    eventsAdded++;
  }
  console.log(`→ ${eventsAdded} événements ajoutés, ${eventsSkipped} ignorés\n`);

  console.log("✅  Terminé !");
  console.log(`   Villes: +${citiesAdded}  |  Catégories: +${catsAdded}  |  Lieux: +${placesAdded}  |  Événements: +${eventsAdded}`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error("❌  Erreur :", err.message);
  process.exit(1);
});
