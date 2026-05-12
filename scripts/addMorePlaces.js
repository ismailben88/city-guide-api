// addMorePlaces.js — Enrichit les villes avec peu de lieux
// Non-destructif : upsert par nom + cityId
// Usage : node scripts/addMorePlaces.js

require("dotenv").config();
const mongoose = require("mongoose");
const City     = require("../models/City");
const Category = require("../models/Category");
const Place    = require("../models/Place");

const toSlug = (s) =>
  s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connecté ✓\n");

  // Build lookup maps
  const cities = await City.find({}, "name slug _id").lean();
  const cityMap = {};
  cities.forEach((c) => { cityMap[c.name] = c._id; });

  const categories = await Category.find({}, "name slug _id").lean();
  const catMap = {};
  categories.forEach((c) => { catMap[c.slug] = c._id; });

  const PLACES = [
    // ─── CHEFCHAOUEN ──────────────────────────────────────────────────────────
    {
      city: "Chefchaouen", cat: "site-historique",
      name: "Place Outa el Hammam",
      description: "The vibrant heart of Chefchaouen's blue medina, lined with cafés and overlooked by the Kasbah walls. Perfect for people-watching and sunset drinks.",
      address: "Place Outa el Hammam, Chefchaouen",
      coordinates: [35.1686, -5.2625],
      images: ["https://images.unsplash.com/photo-1548013146-72479768bada?w=800"],
      rating: 4.7, reviewCount: 312, priceLevel: 1, status: "active",
    },
    {
      city: "Chefchaouen", cat: "musee",
      name: "Kasbah Museum of Chefchaouen",
      description: "A 15th-century fortress turned ethnographic museum with Andalusian gardens, artifacts from the Spanish protectorate era, and panoramic tower views over the blue city.",
      address: "Place Outa el Hammam, Chefchaouen",
      coordinates: [35.1684, -5.2624],
      images: ["https://images.unsplash.com/photo-1548013146-72479768bada?w=800"],
      rating: 4.5, reviewCount: 198, priceLevel: 1, status: "active",
    },
    {
      city: "Chefchaouen", cat: "panorama-vue",
      name: "Spanish Mosque Viewpoint",
      description: "A 20-minute hike above the medina rewards you with the most iconic panorama of Chefchaouen's blue rooftops against the Rif mountains — best at golden hour.",
      address: "Jbel Lalla Chafaa, Chefchaouen",
      coordinates: [35.1720, -5.2600],
      images: ["https://images.unsplash.com/photo-1548013146-72479768bada?w=800"],
      rating: 4.9, reviewCount: 521, priceLevel: 0, status: "active",
    },
    {
      city: "Chefchaouen", cat: "activites-sports",
      name: "Ras El Maa Waterfall",
      description: "A refreshing natural spring and small waterfall at the edge of the medina where locals do laundry the traditional way. Great starting point for Rif mountain hikes.",
      address: "Ras El Maa, Chefchaouen",
      coordinates: [35.1705, -5.2658],
      images: ["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"],
      rating: 4.6, reviewCount: 245, priceLevel: 0, status: "active",
    },
    {
      city: "Chefchaouen", cat: "riad-stay",
      name: "Riad Lina & Spa Chefchaouen",
      description: "Boutique riad nestled in the blue medina with traditional tilework, an indoor hammam and spa, and stunning rooftop views. Authentic Andalusian-Moroccan architecture.",
      address: "Quartier Andalou, Chefchaouen",
      coordinates: [35.1690, -5.2630],
      images: ["https://images.unsplash.com/photo-1548013146-72479768bada?w=800"],
      rating: 4.8, reviewCount: 156, priceLevel: 3, status: "active",
    },

    // ─── DAKHLA ───────────────────────────────────────────────────────────────
    {
      city: "Dakhla", cat: "activites-sports",
      name: "Dakhla Kitesurf & Windsurf Spot",
      description: "One of the world's top kitesurfing destinations — a 40 km lagoon with flat water, consistent trade winds, and schools for all levels. Host to the annual Dakhla Attitude Festival.",
      address: "Lagune de Dakhla, Route de la Lagune",
      coordinates: [23.7000, -15.9500],
      images: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800"],
      rating: 4.9, reviewCount: 634, priceLevel: 2, status: "active",
    },
    {
      city: "Dakhla", cat: "plage",
      name: "Plage de la Lagune Blanche",
      description: "A pristine white-sand beach on Dakhla's sheltered lagoon with crystal-clear turquoise water, ideal for swimming, paddleboarding, and watching kiteboarders fly.",
      address: "Lagune de Dakhla, Dakhla",
      coordinates: [23.7200, -15.9200],
      images: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800"],
      rating: 4.8, reviewCount: 287, priceLevel: 0, status: "active",
    },
    {
      city: "Dakhla", cat: "restaurant",
      name: "Restaurant Safia — Fruits de Mer",
      description: "The freshest Atlantic seafood in Dakhla: grilled lobster, sea bass, oysters from the lagoon, and octopus salad. Unpretentious, local favourite.",
      address: "Rue des Pêcheurs, Dakhla",
      coordinates: [23.7140, -15.9360],
      images: ["https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800"],
      rating: 4.7, reviewCount: 189, priceLevel: 2, status: "active",
    },

    // ─── ASILAH ───────────────────────────────────────────────────────────────
    {
      city: "Asilah", cat: "plage",
      name: "Plage Paradise d'Asilah",
      description: "A beautiful Atlantic beach just south of the medina walls, famous for its clear water, golden sand, and the dramatic contrast of the white-and-blue medina in the background.",
      address: "Route côtière, Asilah",
      coordinates: [35.4650, -6.0330],
      images: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800"],
      rating: 4.7, reviewCount: 312, priceLevel: 0, status: "active",
    },
    {
      city: "Asilah", cat: "galerie-art",
      name: "Palais de la Culture d'Asilah",
      description: "Host venue of the famous Moussem cultural festival, this palace features year-round contemporary art exhibitions by Moroccan and international artists.",
      address: "Médina d'Asilah",
      coordinates: [35.4650, -6.0360],
      images: ["https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=800"],
      rating: 4.5, reviewCount: 134, priceLevel: 0, status: "active",
    },
    {
      city: "Asilah", cat: "cafe",
      name: "Café Atlas — Terrasse des Remparts",
      description: "A charming rooftop café perched on the 15th-century Portuguese ramparts with uninterrupted views of the Atlantic Ocean and the medina. Famous for its mint tea and harcha.",
      address: "Remparts Nord, Asilah",
      coordinates: [35.4658, -6.0370],
      images: ["https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800"],
      rating: 4.6, reviewCount: 223, priceLevel: 1, status: "active",
    },

    // ─── AL HOCEIMA ───────────────────────────────────────────────────────────
    {
      city: "Al Hoceima", cat: "plage",
      name: "Plage Quemado",
      description: "Al Hoceima's main beach in a sheltered bay with Mediterranean-blue water, fine sand, and a lively beach promenade. Crystal-clear enough for snorkelling.",
      address: "Baie d'Al Hoceima, Al Hoceima",
      coordinates: [35.2500, -3.9200],
      images: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800"],
      rating: 4.7, reviewCount: 389, priceLevel: 0, status: "active",
    },
    {
      city: "Al Hoceima", cat: "plage",
      name: "Plage Torres (Cala Iris)",
      description: "One of Morocco's most pristine Mediterranean beaches — a small, hidden cove accessible by boat or mountain road, with turquoise water and dramatic cliff scenery.",
      address: "Cala Iris, Parc National d'Al Hoceima",
      coordinates: [35.1600, -4.3200],
      images: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800"],
      rating: 4.9, reviewCount: 156, priceLevel: 0, status: "active",
    },
    {
      city: "Al Hoceima", cat: "marche-souk",
      name: "Marché Municipal d'Al Hoceima",
      description: "A vibrant local market where Riffian fishermen sell the morning catch alongside vendors of spices, Rif honey, and traditional Amazigh textiles.",
      address: "Centre-ville, Al Hoceima",
      coordinates: [35.2490, -3.9270],
      images: ["https://images.unsplash.com/photo-1534482421-64566f976cfa?w=800"],
      rating: 4.4, reviewCount: 98, priceLevel: 1, status: "active",
    },

    // ─── ZAGORA ───────────────────────────────────────────────────────────────
    {
      city: "Zagora", cat: "desert-dunes",
      name: "Dunes de M'Hamid — Erg Chegaga",
      description: "Morocco's most remote and spectacular desert: vast golden dunes stretching to the Algerian border, accessible from Zagora via a full-day 4×4 excursion. Camel treks and bivouacs available.",
      address: "M'Hamid El Ghizlane, Zagora Province",
      coordinates: [29.5000, -6.0000],
      images: ["https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800"],
      rating: 4.9, reviewCount: 423, priceLevel: 2, status: "active",
    },
    {
      city: "Zagora", cat: "parc-jardin",
      name: "Palmeraie de Zagora",
      description: "A lush 10,000-hectare palm grove along the Drâa River — a verdant contrast to the surrounding desert. Bike or walk through irrigation channels past kasbahs and Berber villages.",
      address: "Palmeraie, Zagora",
      coordinates: [30.3300, -5.8400],
      images: ["https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800"],
      rating: 4.6, reviewCount: 189, priceLevel: 0, status: "active",
    },
    {
      city: "Zagora", cat: "site-historique",
      name: "Panneau Tombouctou 52 Jours",
      description: "The iconic road sign marking Zagora as the departure point for the 52-day trans-Saharan caravan route to Timbuktu. A legendary symbol of the old gold-and-salt trade routes.",
      address: "Route de M'Hamid, Zagora",
      coordinates: [30.3340, -5.8380],
      images: ["https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800"],
      rating: 4.3, reviewCount: 267, priceLevel: 0, status: "active",
    },

    // ─── TAROUDANT ────────────────────────────────────────────────────────────
    {
      city: "Taroudant", cat: "marche-souk",
      name: "Souk Berbère de Taroudant",
      description: "One of Morocco's most authentic Berber markets, selling hand-crafted leather goods, saffron from the Sous valley, argan oil, jewellery, and woven Amazigh rugs.",
      address: "Place Assarag, Taroudant",
      coordinates: [30.4705, -8.8770],
      images: ["https://images.unsplash.com/photo-1534482421-64566f976cfa?w=800"],
      rating: 4.7, reviewCount: 312, priceLevel: 1, status: "active",
    },
    {
      city: "Taroudant", cat: "riad-stay",
      name: "Palais Salam Hotel",
      description: "A legendary 16th-century pasha's palace converted into a luxury hotel, set inside Taroudant's ramparts with a large pool, orange-tree gardens, and traditional zellij interiors.",
      address: "Avenue El Mouqaouama, Taroudant",
      coordinates: [30.4720, -8.8760],
      images: ["https://images.unsplash.com/photo-1539020140153-e479b8e201e7?w=800"],
      rating: 4.6, reviewCount: 178, priceLevel: 3, status: "active",
    },
    {
      city: "Taroudant", cat: "activites-sports",
      name: "Circuit Vélo — Vallée du Sous",
      description: "Guided cycling tours through Taroudant's surrounding countryside: argan forests, saffron fields, Berber villages, and the foothills of the Anti-Atlas mountains.",
      address: "Départ: Place Assarag, Taroudant",
      coordinates: [30.4730, -8.8740],
      images: ["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"],
      rating: 4.8, reviewCount: 134, priceLevel: 1, status: "active",
    },

    // ─── TIZNIT ───────────────────────────────────────────────────────────────
    {
      city: "Tiznit", cat: "site-historique",
      name: "Source Bleue de Lalla Tiznit",
      description: "The sacred spring and small mosque at the origin of the city's founding legend — Queen Lalla Tiznit is said to have appeared here. A peaceful oasis within the medina.",
      address: "Médina de Tiznit",
      coordinates: [29.6975, -9.7315],
      images: ["https://images.unsplash.com/photo-1509099381441-ea3c0cf98b94?w=800"],
      rating: 4.5, reviewCount: 145, priceLevel: 0, status: "active",
    },
    {
      city: "Tiznit", cat: "marche-souk",
      name: "Quartier des Bijoutiers de Tiznit",
      description: "Tiznit is the silver capital of Morocco — this artisan quarter is filled with workshops where Amazigh jewellers craft iconic fibulas, khamsa pendants, and Berber necklaces.",
      address: "Souk des Bijoutiers, Tiznit",
      coordinates: [29.6985, -9.7325],
      images: ["https://images.unsplash.com/photo-1534482421-64566f976cfa?w=800"],
      rating: 4.7, reviewCount: 221, priceLevel: 1, status: "active",
    },
    {
      city: "Tiznit", cat: "plage",
      name: "Plage d'Aglou",
      description: "A wild Atlantic beach 14 km from Tiznit, famous for its dramatic rock formations, surf breaks, and the traditional troglodyte fishing village carved into the cliffs.",
      address: "Aglou Plage, Tiznit Province",
      coordinates: [29.8100, -9.8400],
      images: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800"],
      rating: 4.6, reviewCount: 178, priceLevel: 0, status: "active",
    },

    // ─── IFRANE ───────────────────────────────────────────────────────────────
    {
      city: "Ifrane", cat: "activites-sports",
      name: "Station de Ski Michlifen",
      description: "Morocco's premier ski resort at 2 000 m altitude in the Middle Atlas. Two pistes, ski rentals, and a mountain lodge — skiing from December to February.",
      address: "Michlifen, Ifrane Province",
      coordinates: [33.4667, -5.1167],
      images: ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800"],
      rating: 4.5, reviewCount: 267, priceLevel: 2, status: "active",
    },
    {
      city: "Ifrane", cat: "parc-jardin",
      name: "Lac Dayet Aoua",
      description: "A stunning Middle Atlas lake surrounded by cedar forests, home to migratory birds including flamingos and storks. Perfect for picnics, fishing, and birdwatching.",
      address: "Route d'Azrou, Ifrane Province",
      coordinates: [33.5800, -5.0200],
      images: ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800"],
      rating: 4.7, reviewCount: 189, priceLevel: 0, status: "active",
    },
    {
      city: "Ifrane", cat: "panorama-vue",
      name: "Parc des Cèdres d'Azrou",
      description: "A 600-year-old cedar forest in the Middle Atlas, home to a famous troop of wild Barbary macaques. An extraordinary nature walk among the world's oldest Atlas cedar trees.",
      address: "Cèdre Gouraud, Azrou (15 km d'Ifrane)",
      coordinates: [33.4500, -5.2200],
      images: ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800"],
      rating: 4.8, reviewCount: 334, priceLevel: 0, status: "active",
    },

    // ─── MERZOUGA ─────────────────────────────────────────────────────────────
    {
      city: "Merzouga", cat: "desert-dunes",
      name: "Coucher de Soleil sur l'Erg Chebbi",
      description: "Climb the 150 m golden dunes of Erg Chebbi by camel or on foot at sunset for a view that seems to stretch to infinity. One of Morocco's most iconic experiences.",
      address: "Erg Chebbi, Merzouga",
      coordinates: [31.0900, -4.0000],
      images: ["https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800"],
      rating: 4.9, reviewCount: 712, priceLevel: 1, status: "active",
    },
    {
      city: "Merzouga", cat: "riad-stay",
      name: "Kasbah Mohayut — Bivouac Désert",
      description: "An authentic desert camp at the foot of the Erg Chebbi dunes: traditional nomadic tents, Berber music around the fire, camel rides at dawn, and a sky full of stars.",
      address: "Pied des dunes, Merzouga",
      coordinates: [31.0802, -4.0126],
      images: ["https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800"],
      rating: 4.8, reviewCount: 389, priceLevel: 2, status: "active",
    },

    // ─── ESSAOUIRA ────────────────────────────────────────────────────────────
    {
      city: "Essaouira", cat: "panorama-vue",
      name: "Port de Pêche d'Essaouira",
      description: "A working blue-painted fishing harbour where traditional wooden boats return at dawn. Watch fishermen unload the catch, buy fresh fish, and visit the boat-building workshops.",
      address: "Port d'Essaouira",
      coordinates: [31.5100, -9.7720],
      images: ["https://images.unsplash.com/photo-1539020140153-e479b8e201e7?w=800"],
      rating: 4.6, reviewCount: 423, priceLevel: 0, status: "active",
    },
    {
      city: "Essaouira", cat: "plage",
      name: "Plage de Sidi Kaouki",
      description: "A wild 25 km-long Atlantic beach south of Essaouira, beloved by surfers and windsurfers. The marabout tomb of Sidi Kaouki overlooks the waves — one of Morocco's most photographed spots.",
      address: "Sidi Kaouki, Essaouira Province",
      coordinates: [31.3700, -9.7900],
      images: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800"],
      rating: 4.8, reviewCount: 287, priceLevel: 0, status: "active",
    },
    {
      city: "Essaouira", cat: "galerie-art",
      name: "Galerie Damgaard",
      description: "The gallery that put Essaouira's Gnaoua and Sidi-Ghanem art movement on the world map. Discover works by the 'Painters of the Wind' — local self-taught artists with a psychedelic, spiritual style.",
      address: "Avenue Oqba Ibn Nafia, Essaouira",
      coordinates: [31.5130, -9.7690],
      images: ["https://images.unsplash.com/photo-1539020140153-e479b8e201e7?w=800"],
      rating: 4.7, reviewCount: 156, priceLevel: 0, status: "active",
    },

    // ─── MARRAKECH (boost to 12) ──────────────────────────────────────────────
    {
      city: "Marrakech", cat: "hammam-spa",
      name: "Hammam El Bacha",
      description: "A majestic 1920s hammam used by the court of Thami El Glaoui. Traditional black soap and kessa scrub in beautifully restored 700 m² of steam rooms and marble slabs.",
      address: "Rue Fatima Zohra, Médina, Marrakech",
      coordinates: [31.6340, -7.9910],
      images: ["https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800"],
      rating: 4.8, reviewCount: 534, priceLevel: 1, status: "active",
    },
    {
      city: "Marrakech", cat: "parc-jardin",
      name: "Jardin Majorelle & Musée Yves Saint Laurent",
      description: "Cobalt-blue Art Deco villa and garden designed by Jacques Majorelle, later saved by Yves Saint Laurent. A botanical sanctuary with cacti, bamboo groves, and the world-class YSL museum.",
      address: "Rue Yves Saint Laurent, Marrakech",
      coordinates: [31.6421, -8.0034],
      images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
      rating: 4.7, reviewCount: 2341, priceLevel: 2, status: "active",
    },
    {
      city: "Marrakech", cat: "restaurant",
      name: "Nomad Restaurant",
      description: "A modern rooftop restaurant reinterpreting Moroccan classics: lamb pastilla, spiced cauliflower, and date cheesecake. Stunning views over the medina rooftops from three open terraces.",
      address: "1 Derb Aajane, Médina, Marrakech",
      coordinates: [31.6295, -7.9850],
      images: ["https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800"],
      rating: 4.6, reviewCount: 876, priceLevel: 2, status: "active",
    },
    {
      city: "Marrakech", cat: "site-historique",
      name: "Tombeaux Saadiens",
      description: "Hidden for centuries behind a sealed gate, these 16th-century royal tombs were rediscovered in 1917. Exquisite cedar wood ceilings and Italian Carrara marble carved into magnificent funerary chambers.",
      address: "Rue de la Kasbah, Marrakech",
      coordinates: [31.6190, -7.9886],
      images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
      rating: 4.5, reviewCount: 1234, priceLevel: 1, status: "active",
    },

    // ─── FES (boost to 10) ────────────────────────────────────────────────────
    {
      city: "Fes", cat: "site-historique",
      name: "Tanneries Chouara",
      description: "The world's oldest functioning leather tannery — a spectacular medieval sight of stone vats dyed in vivid colours. Watch from the leather shop terraces above and buy traditional babouches.",
      address: "Quartier des Tanneurs, Fès el-Bali",
      coordinates: [34.0637, -4.9726],
      images: ["https://images.unsplash.com/photo-1539020140153-e479b8e201e7?w=800"],
      rating: 4.7, reviewCount: 1876, priceLevel: 0, status: "active",
    },
    {
      city: "Fes", cat: "musee",
      name: "Musée Dar Batha",
      description: "A 19th-century Hispano-Moorish palace housing a superb collection of Fasi craftsmanship: zellij, carved stucco, embroidered fabrics, and astronomical instruments from the Karaouine Library.",
      address: "Place de l'Istiqlal, Fès el-Bali",
      coordinates: [34.0644, -4.9807],
      images: ["https://images.unsplash.com/photo-1539020140153-e479b8e201e7?w=800"],
      rating: 4.5, reviewCount: 367, priceLevel: 1, status: "active",
    },
    {
      city: "Fes", cat: "cafe",
      name: "Café Clock Fès",
      description: "A beloved cultural hub inside a restored riad serving fusion Moroccan food — the famous camel burger — alongside storytelling evenings, calligraphy workshops, and live Gnaoua music.",
      address: "7 Derb el Magana, Talaa Kbira, Fès",
      coordinates: [34.0640, -4.9780],
      images: ["https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800"],
      rating: 4.7, reviewCount: 489, priceLevel: 1, status: "active",
    },

    // ─── TANGIER (boost to 7) ─────────────────────────────────────────────────
    {
      city: "Tangier", cat: "site-historique",
      name: "Grottes d'Hercule",
      description: "A legendary sea cave 15 km from Tangier where Hercules was said to have rested before his labours. The sea-facing opening resembles the outline of Africa — a stunning natural sculpture.",
      address: "Cap Spartel, Route des Grottes d'Hercule",
      coordinates: [35.7600, -5.9200],
      images: ["https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=800"],
      rating: 4.6, reviewCount: 578, priceLevel: 1, status: "active",
    },
    {
      city: "Tangier", cat: "cafe",
      name: "Café Hafa",
      description: "A legendary hillside café since 1921 where Paul Bowles, the Rolling Stones, and the Beat Generation came to sip mint tea. Terraced clifftop seating with views over the Strait of Gibraltar.",
      address: "Marshan, Tangier",
      coordinates: [35.7900, -5.8200],
      images: ["https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800"],
      rating: 4.8, reviewCount: 743, priceLevel: 1, status: "active",
    },
    {
      city: "Tangier", cat: "musee",
      name: "Musée de la Légation Américaine",
      description: "The oldest American public property outside the US (1821) — a museum of Tangier's cosmopolitan diplomatic history, Beat Generation manuscripts, and Moroccan-American cultural exchange.",
      address: "8 Rue d'Amérique, Médina, Tangier",
      coordinates: [35.7895, -5.8078],
      images: ["https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=800"],
      rating: 4.5, reviewCount: 234, priceLevel: 0, status: "active",
    },

    // ─── AGADIR (boost to 7) ──────────────────────────────────────────────────
    {
      city: "Agadir", cat: "plage",
      name: "Plage d'Agadir — Baie des Lumières",
      description: "A 10 km crescent of golden sand backed by resort hotels, beach clubs, and watersports. The best sun-and-sea destination on Morocco's Atlantic coast, with 300 days of sunshine per year.",
      address: "Corniche d'Agadir",
      coordinates: [30.4000, -9.6000],
      images: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800"],
      rating: 4.7, reviewCount: 1243, priceLevel: 1, status: "active",
    },
    {
      city: "Agadir", cat: "site-historique",
      name: "Kasbah d'Agadir Oufella",
      description: "The ruins of a 16th-century hilltop fort above the city, largely destroyed in the 1960 earthquake. The site offers panoramic views of the bay and an open-air museum of the pre-earthquake city.",
      address: "Colline d'Oufella, Agadir",
      coordinates: [30.4300, -9.6100],
      images: ["https://images.unsplash.com/photo-1539020140153-e479b8e201e7?w=800"],
      rating: 4.6, reviewCount: 456, priceLevel: 1, status: "active",
    },
    {
      city: "Agadir", cat: "marche-souk",
      name: "Souk El Had d'Agadir",
      description: "The largest souk in southern Morocco with 6,000 stalls spread over 15 hectares: argan products, Sous Valley honey and saffron, traditional djellabas, and fresh produce.",
      address: "Avenue du Souss, Agadir",
      coordinates: [30.4150, -9.5980],
      images: ["https://images.unsplash.com/photo-1534482421-64566f976cfa?w=800"],
      rating: 4.5, reviewCount: 567, priceLevel: 1, status: "active",
    },

    // ─── CASABLANCA (boost to 9) ──────────────────────────────────────────────
    {
      city: "Casablanca", cat: "site-historique",
      name: "Mosquée Hassan II",
      description: "The world's third-largest mosque with a 210 m minaret visible from 50 km away, built on a promontory above the Atlantic Ocean. Guided tours reveal the stunning carved cedar, marble, and zellige interior.",
      address: "Boulevard Sidi Mohammed Ben Abdallah, Casablanca",
      coordinates: [33.6086, -7.6327],
      images: ["https://images.unsplash.com/photo-1539020140153-e479b8e201e7?w=800"],
      rating: 4.9, reviewCount: 4521, priceLevel: 1, status: "active",
    },
    {
      city: "Casablanca", cat: "cafe",
      name: "Café Central — Ancienne Médina",
      description: "A classic Casablancan café in the old medina, in operation since the French protectorate era. Slow coffee, chess games, and the pulse of the real Casablanca away from the modern boulevards.",
      address: "Ancienne Médina, Casablanca",
      coordinates: [33.5990, -7.6120],
      images: ["https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800"],
      rating: 4.4, reviewCount: 234, priceLevel: 1, status: "active",
    },
    {
      city: "Casablanca", cat: "panorama-vue",
      name: "Corniche d'Ain Diab",
      description: "Casablanca's stylish seafront promenade lined with restaurants, beach clubs, and bars. The place to watch the Atlantic sunset with the Hassan II Mosque glowing in the distance.",
      address: "Boulevard de la Corniche, Ain Diab, Casablanca",
      coordinates: [33.5950, -7.6680],
      images: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800"],
      rating: 4.6, reviewCount: 678, priceLevel: 2, status: "active",
    },

    // ─── RABAT (boost to 8) ───────────────────────────────────────────────────
    {
      city: "Rabat", cat: "parc-jardin",
      name: "Jardins Exotiques de Rabat (Bouknadel)",
      description: "A 4-hectare paradise of tropical, Japanese, and Andalusian gardens 10 km north of Rabat, with bamboo groves, lily ponds, and hundreds of exotic plant species.",
      address: "Route de Kenitra, Bouknadel",
      coordinates: [34.0900, -6.7800],
      images: ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800"],
      rating: 4.5, reviewCount: 289, priceLevel: 1, status: "active",
    },
    {
      city: "Rabat", cat: "musee",
      name: "Musée Mohammed VI d'Art Moderne",
      description: "Morocco's premier contemporary art museum with a permanent collection of modern Moroccan masters alongside rotating international exhibitions — a world-class cultural institution in the heart of the capital.",
      address: "Avenue Bab Doukkala, Rabat",
      coordinates: [34.0211, -6.8325],
      images: ["https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=800"],
      rating: 4.7, reviewCount: 412, priceLevel: 1, status: "active",
    },
    {
      city: "Rabat", cat: "restaurant",
      name: "Dar Zitoun — Cuisine Marocaine",
      description: "An elegant 17th-century riad restaurant in the Oudayas medina serving refined Moroccan cuisine: pigeon bastilla, lamb mrouzia, and orange-blossom pastilla dessert. Exceptional setting.",
      address: "Oudayas, Rabat",
      coordinates: [34.0342, -6.8388],
      images: ["https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800"],
      rating: 4.8, reviewCount: 356, priceLevel: 3, status: "active",
    },

    // ─── MEKNES (boost to 6) ──────────────────────────────────────────────────
    {
      city: "Meknes", cat: "site-historique",
      name: "Grenier Royal Heri es-Souani",
      description: "Moulay Ismail's colossal 17th-century granary and stables — a monumental feat of architecture with 40+ massive barrel-vaulted rooms that once stored grain and housed 12,000 horses.",
      address: "Heri es-Souani, Meknes",
      coordinates: [33.8900, -5.5600],
      images: ["https://images.unsplash.com/photo-1539020140153-e479b8e201e7?w=800"],
      rating: 4.6, reviewCount: 312, priceLevel: 1, status: "active",
    },
    {
      city: "Meknes", cat: "site-historique",
      name: "Bab Mansour — Porte Monumentale",
      description: "The most magnificent city gate in North Africa — a triumphal arch built in 1732 by Moulay Ismail, decorated with green-and-white zellige tiles and carved marble columns pillaged from Volubilis.",
      address: "Place El Hedim, Meknes",
      coordinates: [33.8950, -5.5550],
      images: ["https://images.unsplash.com/photo-1539020140153-e479b8e201e7?w=800"],
      rating: 4.8, reviewCount: 567, priceLevel: 0, status: "active",
    },
    {
      city: "Meknes", cat: "marche-souk",
      name: "Souk Sebbat de Meknes",
      description: "A covered medina market specialising in traditional footwear (babouches, sandals) alongside copperware, lanterns, and Meknes speciality wines — the city is Morocco's wine capital.",
      address: "Médina de Meknes",
      coordinates: [33.8938, -5.5472],
      images: ["https://images.unsplash.com/photo-1534482421-64566f976cfa?w=800"],
      rating: 4.4, reviewCount: 198, priceLevel: 1, status: "active",
    },

    // ─── EL JADIDA (boost to 5) ───────────────────────────────────────────────
    {
      city: "El Jadida", cat: "site-historique",
      name: "Citerne Portugaise d'El Jadida",
      description: "A breathtaking 16th-century underground cistern with gothic vaulted columns reflected in a shallow pool of water — made famous by Orson Welles' Othello (1952). A UNESCO World Heritage site.",
      address: "Cité Portugaise, El Jadida",
      coordinates: [33.2570, -8.5050],
      images: ["https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=800"],
      rating: 4.8, reviewCount: 623, priceLevel: 1, status: "active",
    },
    {
      city: "El Jadida", cat: "plage",
      name: "Plage d'El Jadida",
      description: "A wide Atlantic beach stretching 5 km from the old Portuguese city walls. Popular for surfing, beach volleyball, and evening strolls — well-serviced with beach clubs and restaurants.",
      address: "El Jadida plage",
      coordinates: [33.2450, -8.5100],
      images: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800"],
      rating: 4.5, reviewCount: 412, priceLevel: 0, status: "active",
    },
    {
      city: "El Jadida", cat: "restaurant",
      name: "Restaurant Le Tit — Poissons Grillés",
      description: "A legendary seafood spot on the Atlantic corniche, grilling the day's catch over open charcoal. Try the chermoula-marinated dorade and the house fish soup — locals queue up every evening.",
      address: "Corniche d'El Jadida",
      coordinates: [33.2540, -8.5080],
      images: ["https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800"],
      rating: 4.7, reviewCount: 345, priceLevel: 1, status: "active",
    },

    // ─── NADOR (boost to 5) ───────────────────────────────────────────────────
    {
      city: "Nador", cat: "plage",
      name: "Plage de Marchica — Mar Chica",
      description: "The Mar Chica lagoon is one of the Mediterranean's largest — 25 km of calm, shallow turquoise water perfect for swimming, kayaking, and flamingo-watching at sunset.",
      address: "Lagune Mar Chica, Nador",
      coordinates: [35.1600, -2.9000],
      images: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800"],
      rating: 4.7, reviewCount: 287, priceLevel: 0, status: "active",
    },
    {
      city: "Nador", cat: "activites-sports",
      name: "Cap des Trois Fourches",
      description: "A dramatic rocky cape at the tip of a peninsula east of Nador, offering spectacular Mediterranean views, cliff diving, and one of Morocco's best spots for watching the sunrise over the sea.",
      address: "Cap des Trois Fourches, Nador Province",
      coordinates: [35.4000, -2.9700],
      images: ["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"],
      rating: 4.8, reviewCount: 189, priceLevel: 0, status: "active",
    },
    {
      city: "Nador", cat: "marche-souk",
      name: "Souk Hebdomadaire de Nador",
      description: "The weekly Thursday and Sunday market drawing Riffians from across the region: fresh produce, livestock, traditional Riffian pottery, and cheap Spanish goods from Melilla.",
      address: "Quartier Industriel, Nador",
      coordinates: [35.1750, -2.9300],
      images: ["https://images.unsplash.com/photo-1534482421-64566f976cfa?w=800"],
      rating: 4.3, reviewCount: 134, priceLevel: 1, status: "active",
    },

    // ─── OUARZAZATE (boost to 6) ──────────────────────────────────────────────
    {
      city: "Ouarzazate", cat: "site-historique",
      name: "Kasbah de Tifoultoute",
      description: "A magnificent restored 20th-century pasha's kasbah on a hill above the Drâa valley, used as a film set for Lawrence of Arabia. Now a hotel with a terrace restaurant and museum.",
      address: "Route de Marrakech, Ouarzazate",
      coordinates: [30.9500, -6.9300],
      images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
      rating: 4.5, reviewCount: 267, priceLevel: 2, status: "active",
    },
    {
      city: "Ouarzazate", cat: "galerie-art",
      name: "Musée du Cinéma — CLA Studios",
      description: "Ouarzazate is 'Hollywood of Africa' — this museum at the Atlas Corporation Studios houses original sets from Gladiator, Game of Thrones, Babel, and other blockbusters filmed in the region.",
      address: "Route de Marrakech km 5, Ouarzazate",
      coordinates: [30.9350, -6.8700],
      images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
      rating: 4.6, reviewCount: 334, priceLevel: 1, status: "active",
    },
    {
      city: "Ouarzazate", cat: "panorama-vue",
      name: "Lac de barrage el Mansour Eddahbi",
      description: "A large reservoir on the edge of town reflecting the Atlas mountains and kasbahs — a stunning sunset viewpoint and habitat for flamingos and wading birds.",
      address: "Route d'Agdz, Ouarzazate",
      coordinates: [30.8900, -6.8300],
      images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
      rating: 4.5, reviewCount: 189, priceLevel: 0, status: "active",
    },
  ];

  console.log(`\n=== LIEUX (${PLACES.length} à traiter) ===`);
  let added = 0, skipped = 0, errors = 0;

  for (const p of PLACES) {
    const cityId = cityMap[p.city];
    if (!cityId) { console.log(`  ⚠  Ville introuvable: "${p.city}" — ${p.name}`); errors++; continue; }

    const catId = catMap[p.cat];
    if (!catId) { console.log(`  ⚠  Catégorie introuvable: "${p.cat}" — ${p.name}`); errors++; continue; }

    const exists = await Place.findOne({ name: p.name, cityId }).lean();
    if (exists) { console.log(`  ⏭  Existe déjà : ${p.name}`); skipped++; continue; }

    // generate unique slug: name + city suffix to avoid collisions
    let slug = toSlug(p.name);
    const slugExists = await Place.findOne({ slug }).lean();
    if (slugExists) slug = `${slug}-${toSlug(p.city)}`;

    await Place.create({
      name: p.name,
      slug,
      description: p.description,
      address: p.address,
      cityId,
      categoryId: catId,
      location: { type: "Point", coordinates: [p.coordinates[1], p.coordinates[0]] },
      images: p.images,
      coverImage: p.images[0],
      rating: p.rating,
      reviewCount: p.reviewCount,
      priceLevel: p.priceLevel,
      status: p.status,
    });
    console.log(`  ✅  Ajouté : ${p.name} (${p.city})`);
    added++;
  }

  console.log(`\n✅  Terminé ! +${added} lieux ajoutés | ${skipped} existants | ${errors} erreurs\n`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error("❌ ", e.message); process.exit(1); });
