// seed-v2.js — Enhanced demo seed for cityguide_v2
// Adds real images via Wikipedia API + translations for all data
// Usage: node scripts/seeders/seed-v2.js
// Database: cityguide_v2 (separate from original cityguide)

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const User         = require("../../models/User");
const City         = require("../../models/City");
const Category     = require("../../models/Category");
const Place        = require("../../models/Place");
const Event        = require("../../models/Event");
const GuideProfile = require("../../models/GuideProfile");
const Comment      = require("../../models/Comment");
const Score        = require("../../models/Score");
const Favorite     = require("../../models/Favorite");
const Media        = require("../../models/Media");
const Report       = require("../../models/Report");
const Notification = require("../../models/Notification");
const PendingRequest = require("../../models/PendingRequest");
const AdminLog     = require("../../models/AdminLog");

const USERS_DATA      = require("./data/users");
const CITIES_DATA     = require("./data/cities");
const CATEGORIES_DATA = require("./data/categories");
const PLACES_DATA     = require("./data/places");
const EVENTS_DATA     = require("./data/events");
const GUIDES_DATA     = require("./data/guides");

const userByKey     = {};
const cityBySlug    = {};
const categoryBySlug = {};

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const CLEAN_COLLECTIONS = [
  User, City, Category, Place, Event, GuideProfile,
  Comment, Score, Favorite, Media, Report, Notification,
  PendingRequest, AdminLog,
];

// ── Wikipedia image fetch ───────────────────────────────────────────────────
const WIKI_CACHE = {};

async function fetchWikiThumb(pageTitle) {
  if (WIKI_CACHE[pageTitle]) return WIKI_CACHE[pageTitle];
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "CityGuideV2/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const img = data.thumbnail?.source || null;
    WIKI_CACHE[pageTitle] = img;
    return img;
  } catch {
    return null;
  }
}

// Map of place slugs → Wikipedia page titles for thumbnail fetching
// First tries the exact title; if no thumbnail, falls back to city name
const WIKI_PAGES = {
  "mohammed-v-square-casablanca":    ["Mohammed V Square", "Casablanca"],
  "quartier-des-habous":             ["Hubous", "Casablanca"],
  "parc-de-la-ligue-arabe":          ["Arab League Park", "Casablanca"],
  "twin-center-casablanca":          ["Casablanca Twin Center", "Casablanca"],
  "bou-inania-madrasa-meknes":       ["Bou Inania Madrasa (Meknes)", "Meknes"],
  "villa-des-arts-de-casablanca":    ["Villa des Arts", "Casablanca"],
  "corniche-of-casablanca":          ["Corniche of Casablanca", "Casablanca"],
  "maison-de-la-photographie-de-marrakech": ["Maison de la Photographie", "Marrakech"],
  "andalusian-gardens-rabat":        ["Andalusian Gardens", "Rabat"],
  "kasbah-tangier":                  ["Kasbah of Tangier", "Tangier"],
  "medina-of-tangier":               ["Medina of Tangier", "Tangier"],
  "kasbah-of-chefchaouen":           ["Kasbah of Chefchaouen", "Chefchaouen"],
  "ras-el-ma-airfield":              ["Ras el Maa", "Chefchaouen"],
  "skala-de-la-ville":               ["Skala de la Ville", "Essaouira"],
  "sidi-mohammed-ben-abdallah-museum": ["Museum Sidi Mohammed Ben Abdallah", "Essaouira"],
  "essaouira-beach":                 ["Essaouira"],
  "agadir-beach":                    ["Agadir"],
  "souk-el-had-d-agadir":            ["Souk El Had", "Agadir"],
  "vallee-des-oiseaux-agadir":       ["Vallée des Oiseaux", "Agadir"],
  "atlas-corporation-studios":       ["Atlas Studios", "Ouarzazate"],
  "fint-oasis":                      ["Fint Oasis", "Ouarzazate"],
  "lac-dayet-aoua":                  ["Dayet Aoua", "Ifrane"],
  "archaeological-museum-of-tetouan": ["Archaeological Museum of Tetouan", "Tetouan"],
  "portuguese-cistern-el-jadida":    ["Portuguese Cistern (El Jadida)", "El Jadida"],
};

// ── Translations ───────────────────────────────────────────────────────────
function makeTranslations(name, region) {
  const frMap = {
    "Marrakech": "Marrakech", "Fes": "Fès", "Meknes": "Meknès",
    "Rabat": "Rabat", "Casablanca": "Casablanca", "Tangier": "Tanger",
    "Chefchaouen": "Chefchaouen", "Tetouan": "Tétouan", "Agadir": "Agadir",
    "Essaouira": "Essaouira", "El Jadida": "El Jadida", "Ouarzazate": "Ouarzazate",
    "Merzouga": "Merzouga", "Ifrane": "Ifrane", "Dakhla": "Dakhla",
    "Saidia": "Saïdia",
  };
  const frRegion = region ? region : "";
  const arMap = {
    "Marrakech": "مراكش", "Fes": "فاس", "Meknes": "مكناس",
    "Rabat": "الرباط", "Casablanca": "الدار البيضاء", "Tangier": "طنجة",
    "Chefchaouen": "شفشاون", "Tetouan": "تطوان", "Agadir": "أكادير",
    "Essaouira": "الصويرة", "El Jadida": "الجديدة", "Ouarzazate": "ورزازات",
    "Merzouga": "مرزوكة", "Ifrane": "إفران", "Dakhla": "الداخلة",
    "Saidia": "السعيدية",
  };
  const arName = arMap[name] || name;
  const arRegion = region ? region : "";
  return {
    fr: { name: frMap[name] || name, region: frRegion },
    en: { name, region: region },
    ar: { name: arName, region: arRegion },
  };
}

function catTranslations(name) {
  const frMap = {
    "Restaurants": "Restaurants", "Cafes & Rooftops": "Cafés & Rooftops",
    "Hotels": "Hôtels", "Riads": "Riads",
    "Historical Sites": "Sites Historiques", "Museums & Culture": "Musées & Culture",
    "Beaches": "Plages", "Nature & Landscapes": "Nature & Paysages",
    "Desert Experiences": "Expériences Désertiques", "Shopping & Souks": "Shopping & Souks",
    "Wellness & Spa": "Bien-être & Spa", "Nightlife": "Vie Nocturne",
    "Sports & Activities": "Sports & Activités", "Coworking": "Coworking",
    "Tours & Excursions": "Tours & Excursions", "Photography Spots": "Spots Photo",
    "Family Activities": "Activités Familiales", "Religious Sites": "Sites Religieux",
    "Art & Galleries": "Art & Galeries", "Street Food & Markets": "Street Food & Marchés",
    "Moroccan Cuisine": "Cuisine Marocaine", "Fine Dining": "Gastronomie",
    "Seafood & Fish": "Fruits de Mer & Poisson", "Rooftop Cafes": "Cafés sur les Toits",
    "Traditional Moroccan Cafes": "Cafés Marocains Traditionnels",
    "Specialty Coffee": "Café de Spécialité", "Luxury Hotels & Palaces": "Hôtels de Luxe & Palais",
    "Boutique Hotels": "Hôtels Boutique", "Eco-Lodges & Glamping": "Éco-Lodges & Glamping",
    "Luxury Riads": "Riads de Luxe", "Heritage Riads": "Riads Historiques",
    "Riad Guesthouses": "Maisons d'Hôtes Riad", "Medinas & Old Towns": "Médinas & Vieilles Villes",
    "Palaces & Kasbahs": "Palais & Kasbahs", "Roman & Ancient Ruins": "Ruines Romaines & Antiques",
    "Art Museums": "Musées d'Art", "History & Archaeology": "Histoire & Archéologie",
    "Crafts & Traditional Arts": "Artisanat & Arts Traditionnels",
    "Atlantic Beaches": "Plages Atlantiques", "Mediterranean Beaches": "Plages Méditerranéennes",
    "Surf Spots": "Spots de Surf", "Mountains & Atlas": "Montagnes & Atlas",
    "Waterfalls & Gorges": "Cascades & Gorges", "National Parks & Reserves": "Parcs Nationaux & Réserves",
    "Desert Camps": "Camps Désertiques", "Camel Trekking": "Randonnées à Chameau",
    "Sand Dunes & Ergs": "Dunes de Sable & Ergs", "Souks & Bazaars": "Souks & Bazars",
    "Berber Crafts & Rugs": "Artisanat Berbère & Tapis", "Argan & Natural Products": "Argan & Produits Naturels",
    "Traditional Hammams": "Hammams Traditionnels", "Luxury Spas": "Spas de Luxe",
    "Yoga & Meditation": "Yoga & Méditation", "Bars & Lounges": "Bars & Salons",
    "Live Music & Concerts": "Musique Live & Concerts", "Clubs & Dance Floors": "Clubs & Pistes de Danse",
    "Hiking & Trekking": "Randonnée & Trekking", "Kitesurfing & Windsurfing": "Kitesurf & Windsurf",
    "Golf": "Golf", "Coworking Spaces": "Espaces de Coworking",
    "Startup Hubs": "Pôles Startups", "Business Centers": "Centres d'Affaires",
    "City Walking Tours": "Visites à Pied de la Ville", "Desert Safari Tours": "Safaris Désertiques",
    "Food & Culinary Tours": "Tours Gastronomiques", "Sunset & Sunrise Spots": "Spots Coucher & Lever de Soleil",
    "Rooftop & Terrace Views": "Vues sur les Toits & Terrasses", "Street Photography": "Photographie de Rue",
    "Theme Parks & Attractions": "Parcs d'Attractions", "Kids Activities": "Activités pour Enfants",
    "Family-Friendly Beaches": "Plages Familiales", "Mosques": "Mosquées",
    "Mausoleums & Zaouias": "Mausolées & Zaouias", "Quranic Schools": "Écoles Coraniques",
    "Contemporary Art Galleries": "Galeries d'Art Contemporain", "Artisan Workshops": "Ateliers d'Artisanat",
    "Street Art & Murals": "Street Art & Fresques", "Street Food Stalls": "Étalages de Street Food",
    "Food Markets & Souks": "Marchés Alimentaires & Souks", "Traditional Bakeries": "Boulangeries Traditionnelles",
  };
  const arMap = {
    "Restaurants": "مطاعم", "Cafes & Rooftops": "مقاهي & أسطح", "Hotels": "فنادق",
    "Riads": "رياض", "Historical Sites": "مواقع تاريخية", "Museums & Culture": "متاحف & ثقافة",
    "Beaches": "شواطئ", "Nature & Landscapes": "طبيعة & مناظر", "Desert Experiences": "تجارب صحراوية",
    "Shopping & Souks": "تسوق & أسواق", "Wellness & Spa": "عناية & سبا", "Nightlife": "حياة ليلية",
    "Sports & Activities": "رياضة & أنشطة", "Coworking": "مساحات عمل مشتركة",
    "Tours & Excursions": "جولات & رحلات", "Photography Spots": "مواقع تصوير",
    "Family Activities": "أنشطة عائلية", "Religious Sites": "مواقع دينية",
    "Art & Galleries": "فن & صالات عرض", "Street Food & Markets": "طعام الشارع & أسواق",
    "Moroccan Cuisine": "مطبخ مغربي", "Fine Dining": "مأكولات راقية",
    "Seafood & Fish": "مأكولات بحرية & سمك", "Rooftop Cafes": "مقاهي على الأسطح",
    "Traditional Moroccan Cafes": "مقاهي مغربية تقليدية", "Specialty Coffee": "قهوة متخصصة",
    "Luxury Hotels & Palaces": "فنادق فاخرة & قصور", "Boutique Hotels": "فنادق بوتيك",
    "Eco-Lodges & Glamping": "نزل بيئية & تخييم فاخر", "Luxury Riads": "رياض فاخرة",
    "Heritage Riads": "رياض تراثية", "Riad Guesthouses": "بيوت ضيافة رياض",
    "Medinas & Old Towns": "مدن قديمة & أسواق", "Palaces & Kasbahs": "قصور & قصبات",
    "Roman & Ancient Ruins": "آثار رومانية & قديمة", "Art Museums": "متاحف فنية",
    "History & Archaeology": "تاريخ & آثار", "Crafts & Traditional Arts": "حرف & فنون تقليدية",
    "Atlantic Beaches": "شواطئ أطلسية", "Mediterranean Beaches": "شواطئ متوسطية",
    "Surf Spots": "مواقع ركوب الأمواج", "Mountains & Atlas": "جبال & أطلس",
    "Waterfalls & Gorges": "شلالات & أودية", "National Parks & Reserves": "متنزهات وطنية & محميات",
    "Desert Camps": "مخيمات صحراوية", "Camel Trekking": "رحلات الجمال",
    "Sand Dunes & Ergs": "كثبان رملية", "Souks & Bazaars": "أسواق & بازارات",
    "Berber Crafts & Rugs": "حرف أمازيغية & سجاد", "Argan & Natural Products": "أرغان & منتجات طبيعية",
    "Traditional Hammams": "حمامات تقليدية", "Luxury Spas": "سبا فاخر",
    "Yoga & Meditation": "يوجا & تأمل", "Bars & Lounges": "بارات & صالات",
    "Live Music & Concerts": "موسيقى حية & حفلات", "Clubs & Dance Floors": "نوادٍ & حلقات رقص",
    "Hiking & Trekking": "تنزه & رحلات", "Kitesurfing & Windsurfing": "ركوب الأمواج بالطائرات",
    "Golf": "جولف", "Coworking Spaces": "مساحات عمل مشتركة",
    "Startup Hubs": "مراكز الشركات الناشئة", "Business Centers": "مراكز أعمال",
    "City Walking Tours": "جولات مشي في المدينة", "Desert Safari Tours": "جولات سفاري صحراوية",
    "Food & Culinary Tours": "جولات طهي", "Sunset & Sunrise Spots": "مواقع غروب & شروق الشمس",
    "Rooftop & Terrace Views": "إطلالات على الأسطح", "Street Photography": "تصوير الشوارع",
    "Theme Parks & Attractions": "متنزهات ترفيهية & معالم جذب", "Kids Activities": "أنشطة للأطفال",
    "Family-Friendly Beaches": "شواطئ عائلية", "Mosques": "مساجد",
    "Mausoleums & Zaouias": "أضرحة & زوايا", "Quranic Schools": "مدارس قرآنية",
    "Contemporary Art Galleries": "صالات عرض فنية معاصرة", "Artisan Workshops": "ورش حرفية",
    "Street Art & Murals": "فن الشارع & جداريات", "Street Food Stalls": "أكشاك طعام الشارع",
    "Food Markets & Souks": "أسواق طعام", "Traditional Bakeries": "مخابز تقليدية",
  };
  return {
    fr: { name: frMap[name] || name },
    en: { name },
    ar: { name: arMap[name] || name },
  };
}

// ── French descriptions for places ──────────────────────────────────────────
const PLACE_FR = {
  "hassan-ii-mosque":                { n: "Mosquée Hassan II", d: "La mosquée Hassan II est un chef-d'œuvre d'architecture moderne marocaine à Casablanca. Inaugurée en 1993, elle est l'une des plus grandes mosquées du monde avec un minaret de 210 mètres. Son emplacement en bord d'océan Atlantique lui confère une atmosphère unique, surtout au coucher du soleil." },
  "casablanca-cathedral":            { n: "Cathédrale du Sacré-Cœur", d: "Ancienne église catholique située à l'ouest du parc de la Ligue Arabe, la cathédrale du Sacré-Cœur de Casablanca est un magnifique exemple d'architecture Art déco des années 1930. Désacralisée, elle sert aujourd'hui de lieu d'exposition culturelle." },
  "mohammed-v-square-casablanca":    { d: "La place Mohammed V est le cœur administratif et architectural de Casablanca. Entourée de bâtiments coloniaux majestueux — palais de justice, préfecture, banques — elle illustre le génie architectural franco-marocain du début du XXe siècle." },
  "quartier-des-habous":             { n: "Quartier des Habous", d: "Le quartier des Habous, également appelé Nouvelle Médina, est un quartier traditionnel construit par les Français dans les années 1920. Ses ruelles abritent des artisans, des échoppes et des cafés qui perpétuent l'artisanat marocain traditionnel." },
  "corniche-of-casablanca":          { n: "Corniche de Casablanca", d: "La Corniche de Casablanca est une promenade animée le long de l'océan Atlantique, bordée de restaurants, cafés, hôtels et clubs de plage. C'est un lieu de sortie prisé des Casablancais, surtout en soirée." },
  "parc-de-la-ligue-arabe":          { n: "Parc de la Ligue Arabe", d: "Le parc de la Ligue Arabe est le plus grand espace vert du centre-ville de Casablanca. Aménagé sur le modèle des jardins français et anglais, il offre une oasis de calme avec ses fontaines, ses palmiers et ses allées ombragées." },
  "villa-des-arts-de-casablanca":    { n: "Villa des Arts de Casablanca", d: "La Villa des Arts est un centre d'art contemporain installé dans un magnifique bâtiment Art déco des années 1930. Elle accueille des expositions temporaires d'artistes marocains et internationaux, ainsi que des ateliers éducatifs." },
  "twin-center-casablanca":          { n: "Twin Center", d: "Le Twin Center est un ensemble de deux tours jumelles emblematic du quartier d'affaires de Casablanca. Avec 115 mètres de hauteur, ce complexe abrite des bureaux, un hôtel 5 étoiles et offre une vue panoramique imprenable sur la ville." },
  "jemaa-el-fnaa":                   { n: "Place Jemaa el-Fna", d: "La place Jemaa el-Fna est le cœur battant de Marrakech, classée au patrimoine immatériel de l'UNESCO. Le jour, elle s'anime de charmeurs de serpents et de marchands de jus d'orange. La nuit, elle se transforme en un gigantesque restaurant en plein air sous les étoiles." },
  "kutubiyya-mosque":                { n: "Mosquée Koutoubia", d: "La mosquée Koutoubia est le plus grand édifice religieux de Marrakech et un chef-d'œuvre de l'architecture almohade. Son minaret de 77 mètres, visible de toute la ville, a servi de modèle à la Giralda de Séville et à la tour Hassan de Rabat." },
  "bahia-palace":                    { n: "Palais de la Bahia", d: "Le palais de la Bahia est un joyau de l'architecture marocaine du XIXe siècle. Construit par le grand vizir Si Moussa, ses jardins andalous, ses cours intérieures et ses plafonds en cèdre peint offrent un aperçu de la vie aristocratique marocaine." },
  "el-badi-palace":                  { n: "Palais El Badi", d: "Le palais El Badi, construit au XVIe siècle par le sultan Ahmed al-Mansour, était un palais de réception somptueux orné d'or, d'onyx et de marbre italien. Aujourd'hui en ruines, ses vastes cours et ses jardins accueillent le festival annuel du folklore." },
  "saadian-tombs":                   { n: "Tombeaux Saâdiens", d: "Les tombeaux saâdiens sont un ensemble funéraire royal du XVIe siècle, découverts en 1917. Leur mausolée principal, orné de stucs délicats et de mosaïques zellige, abrite les sépultures du sultan Ahmed al-Mansour et de sa famille." },
  "ben-youssef-madrasa":             { n: "Médersa Ben Youssef", d: "La médersa Ben Youssef est l'une des plus grandes écoles coraniques d'Afrique du Nord, fondée au XIVe siècle. Son architecture éblouit par ses zelliges, ses plafonds en cèdre sculpté et sa cour intérieure ornée de marbre blanc." },
  "majorelle-garden":                { n: "Jardin Majorelle", d: "Le Jardin Majorelle, créé par le peintre français Jacques Majorelle dans les années 1920, est un enchantement de couleurs et de botanique. Acquise par Yves Saint Laurent et Pierre Bergé en 1980, la villa bleu Majorelle attire des visiteurs du monde entier." },
  "menara-gardens":                  { n: "Jardins de la Ménara", d: "Les jardins de la Ménara sont un vaste espace verdoyant au pied de l'Atlas, aménagé au XIIe siècle par les Almohades. Leur grand bassin entouré de cyprès et d'oliviers offre un cadre idyllique, surtout au coucher du soleil sur les montagnes." },
  "marrakech-museum":                { n: "Musée de Marrakech", d: "Le Musée de Marrakech est installé dans le palais Mnebbi, un superbe exemple d'architecture traditionnelle marocaine du XIXe siècle. Ses expositions d'art contemporain et d'artisanat marocain sont présentées autour d'un patio central à coupole." },
  "dar-si-said":                     { n: "Dar Si Saïd", d: "Le musée Dar Si Saïd, installé dans un palais du XIXe siècle, présente une riche collection d'artisanat marocain : tapis berbères, bijoux, armes, poteries et boiseries sculptées de tout le royaume." },
  "agdal-gardens":                   { n: "Jardins de l'Agdal", d: "Les jardins de l'Agdal sont de vastes vergers royaux datant du XIIe siècle, s'étendant sur 340 hectares au sud de la médina de Marrakech. Leurs bassins et canaux d'irrigation alimentent des oliviers, orangers et grenadiers centenaires." },
  "maison-de-la-photographie-de-marrakech": { n: "Maison de la Photographie de Marrakech", d: "La Maison de la Photographie est un musée dédié à la photographie ancienne du Maroc, installé dans un riad traditionnel. Sa collection de plus de 10 000 clichés des XIXe et XXe siècles raconte l'histoire visuelle du royaume." },
  "university-of-al-qarawiyyin":            { n: "Université Al Quaraouiyine", d: "Fondée en 859 par Fatima al-Fihriya, l'université Al Quaraouiyine est la plus ancienne université en activité au monde. Son architecture mêle styles idrisside, almohade et mérinide, avec une salle de prière pouvant accueillir 20 000 fidèles." },
  "fes-el-bali":                             { n: "Fès el-Bali", d: "Fès el-Bali, la plus ancienne des trois médinas de Fès, est un labyrinthe enchanté de ruelles pavées, de souks animés et de monuments historiques. Classée au patrimoine mondial de l'UNESCO, elle est considérée comme le cœur spirituel et culturel du Maroc." },
  "bou-inania-madrasa":                      { n: "Médersa Bou Inania", d: "La médersa Bou Inania, construite au XIVe siècle par le sultan mérinide Bou Inan, est la seule médersa de Fès encore utilisée comme lieu de culte. Son architecture somptueuse — stucs, zelliges, bois de cèdre — en fait un chef-d'œuvre de l'art mérinide." },
  "chouara-tannery":                         { n: "Tannerie Chouara", d: "La tannerie Chouara est l'une des plus anciennes tanneries de Fès, datant du XIIe siècle. Ses cuves de pierre remplies de teintures naturelles offrent un spectacle fascinant — un véritable voyage dans le Maroc médiéval toujours en activité." },
  "zawiya-of-moulay-idris-ii":               { n: "Zaouïa de Moulay Idriss II", d: "La zaouïa de Moulay Idriss II abrite le tombeau du saint fondateur de Fès. Lieu de pèlerinage majeur, son sanctuaire orné de zelliges et de plafonds peints est un havre de spiritualité au cœur de la médina." },
  "dar-batha":                               { n: "Musée Dar Batha", d: "Le musée Dar Batha est installé dans un palais d'été du XIXe siècle à Fès. Sa collection exceptionnelle d'arts décoratifs marocains comprend des céramiques, des broderies, des bijoux et des boiseries sculptées." },
  "bab-bou-jeloud":                          { n: "Bab Bou Jeloud", d: "Bab Bou Jeloud est la porte monumentale ornée de zelliges bleus et verts qui marque l'entrée principale de la médina de Fès. Construite en 1913 dans un style néo-mauresque, elle est le point de départ idéal pour explorer la vieille ville." },
  "marinid-tombs":                           { n: "Tombeaux Mérinides", d: "Les tombeaux mérinides perchés sur la colline au nord de Fès offrent la plus belle vue panoramique sur la ville. Bien que en ruines, ces vestiges du XIVe siècle sont un lieu privilégié pour admirer le coucher du soleil sur la médina." },
  "funduq-al-najjarin":                      { n: "Fondouk Nejjarine", d: "Le Fondouk Nejjarine est une ancienne auberge du XVIIIe siècle magnifiquement restaurée, abritant aujourd'hui un musée des arts et métiers du bois. Sa cour intérieure à trois étages est un exemple parfait d'architecture des fondouks marocains." },
  "al-attarine-madrasa":                     { n: "Médersa Al Attarine", d: "La médersa Al Attarine, construite au XIVe siècle par le sultan mérinide Abou Saïd, est un joyau de l'architecture islamique. Son patio intime décoré de zelliges, stucs et bois de cèdre sculpté est d'une beauté saisissante." },
  "hassan-tower":                            { n: "Tour Hassan", d: "La Tour Hassan est le minaret inachevé d'une mosquée gigantesque commencée au XIIe siècle par le sultan Yacoub al-Mansour. Entourée de centaines de colonnes, elle domine la ville de Rabat et offre un spectacle émouvant au coucher du soleil." },
  "kasbah-of-the-udayas":                    { n: "Kasbah des Oudayas", d: "La Kasbah des Oudayas est une forteresse du XIIe siècle aux ruelles bleues et blanches, perchée sur l'embouchure du Bou Regreg à Rabat. Ses jardins andalous, son musée et sa vue sur l'océan en font un lieu incontournable." },
  "mausoleum-of-mohammed-v":                 { n: "Mausolée Mohammed V", d: "Le mausolée Mohammed V est un chef-d'œuvre de l'architecture marocaine contemporaine. Sa toiture en tuiles vertes, ses zelliges raffinés et la tombe en marbre blanc du roi Hassan II en font un lieu de recueillement majestueux." },
  "chellah":                                 { n: "Chellah", d: "Le Chellah est un site archéologique fascinant mêlant ruines romaines et nécropole mérinide, au sud de Rabat. Ses vestiges antiques et ses jardins fleuris, habités par des cigognes, créent une atmosphère hors du temps." },
  "museum-of-history-and-civilizations":     { n: "Musée de l'Histoire et des Civilisations", d: "Le Musée de l'Histoire et des Civilisations de Rabat présente des collections archéologiques couvrant de la préhistoire à l'époque islamique. Les pièces maîtresses incluent la statue en bronze de Ptolémée et les mosaïques romaines de Volubilis." },
  "mohammed-vi-museum-of-modern-and-contemporary-art": { n: "Musée Mohammed VI d'Art Moderne et Contemporain", d: "Le Musée Mohammed VI est le premier musée d'envergure dédié à l'art moderne et contemporain au Maroc. Inauguré en 2014, il accueille des expositions d'artistes marocains et internationaux dans un bâtiment résolument contemporain." },
  "andalusian-gardens-rabat":                { n: "Jardins Andalous de Rabat", d: "Les jardins andalous de Rabat sont un havre de paix situé à l'entrée de la Kasbah des Oudayas. Aménagés à l'image des jardins de Grenade, ils offrent des allées ombragées de palmiers et d'orangers, avec vue sur l'océan." },
  "cape-spartel":                            { n: "Cap Spartel", d: "Le cap Spartel marque le point de rencontre de l'océan Atlantique et de la mer Méditerranée, à l'ouest de Tanger. Son phare du XIXe siècle et ses falaises spectaculaires offrent un cadre naturel époustouflant." },
  "cave-of-hercules":                        { n: "Grottes d'Hercule", d: "Les grottes d'Hercule, situées près du cap Spartel, sont une formation géologique unique dont l'ouverture en forme d'Afrique donne sur l'océan. Selon la mythologie, Hercule s'y serait reposé après ses douze travaux." },
  "american-legation-tangier":               { n: "Légation Américaine de Tanger", d: "La Légation Américaine de Tanger est le premier bien diplomatique américain acquis à l'étranger et le seul monument national américain hors des États-Unis. Ce musée fascinant retrace l'histoire des relations américano-marocaines depuis 1777." },
  "grand-socco":                             { n: "Grand Socco", d: "Le Grand Socco (Place du Grand Marché) est une place animée à l'entrée de la médina de Tanger, où se mêlent marchands de fruits, cafés et bâtiments Art déco. C'est le point de départ idéal pour explorer Tanger." },
  "kasbah-tangier":                          { n: "Kasbah de Tanger", d: "La Kasbah de Tanger est un quartier perché sur la colline la plus haute de la ville, offrant une vue spectaculaire sur le détroit de Gibraltar. Ses ruelles blanches, son palais et ses jardins en font un lieu chargé d'histoire." },
  "medina-of-tangier":                       { n: "Médina de Tanger", d: "La médina de Tanger est un labyrinthe pittoresque de ruelles escarpées allant du Grand Socco à la Kasbah. Moins touristique que d'autres médinas marocaines, elle conserve une authenticité et une atmosphère unique mêlant influences marocaines et européennes." },
  "cafe-hafa":                               { n: "Café Hafa", d: "Le Café Hafa, fondé en 1921, est une institution tangéroise perché sur une falaise surplombant le détroit de Gibraltar. Ses terrasses étagées ont accueilli des écrivains comme Paul Bowles et des musiciens comme les Rolling Stones." },
  "bab-mansur-al-alj":                       { n: "Bab Mansour el-Aleuj", d: "Bab Mansour est la porte monumentale de l'ancienne médina de Meknès, considérée comme l'une des plus belles portes du Maroc. Ornée de zelliges, de marbre et de colonnes antiques, elle fut achevée en 1732 par le sultan Moulay Ismail." },
  "mausoleum-of-moulay-ismail":              { n: "Mausolée de Moulay Ismail", d: "Le mausolée de Moulay Ismail est le tombeau du sultan alaouite qui fit de Meknès sa capitale impériale au XVIIe siècle. Le sanctuaire, orné de plafonds peints et de zelliges, est ouvert aux visiteurs non-musulmans." },
  "heri-es-swani":                           { n: "Heri es-Swani", d: "Les greniers Heri es-Swani sont les impressionnantes écuries et greniers construits par Moulay Ismail pour nourrir sa cavalerie de 12 000 chevaux. Leurs voûtes et leurs immenses salles témoignent de la puissance de l'empire ismaélien." },
  "volubilis":                               { n: "Volubilis", d: "Volubilis est le plus grand site archéologique romain du Maroc, classé au patrimoine mondial de l'UNESCO. Ses magnifiques mosaïques, son arc de triomphe et son capitole racontent l'histoire de la province romaine de Maurétanie Tingitane." },
  "bou-inania-madrasa-meknes":               { n: "Médersa Bou Inania de Meknès", d: "La médersa Bou Inania de Meknès, construite au XIVe siècle, est un exemple remarquable de l'architecture mérinide. Sa cour décorée de zelliges, stucs et bois de cèdre sculpté est d'une élégance rare." },
  "dar-jamai-museum":                        { n: "Musée Dar Jamai", d: "Le musée Dar Jamai, installé dans un palais du XIXe siècle à Meknès, présente des collections d'arts décoratifs marocains : broderies, bijoux, armes et instruments de musique traditionnels." },
  "chefchaouen":                             { n: "Chefchaouen", d: "Chefchaouen, la perle bleue du Rif, est une ville enchanteresse dont les ruelles sont peintes dans toutes les nuances de bleu. Fondée au XVe siècle par des réfugiés andalous, elle offre une atmosphère paisible et des paysages montagneux à couper le souffle." },
  "kasbah-of-chefchaouen":                   { n: "Kasbah de Chefchaouen", d: "La Kasbah de Chefchaouen est une forteresse du XVe siècle au cœur de la médina bleue. Elle abrite un musée d'artisanat local et un jardin andalou paisible, avec une vue magnifique depuis sa tour." },
  "ras-el-ma-airfield":                      { n: "Ras el-Maa", d: "Ras el-Maa est la source naturelle qui alimente Chefchaouen en eau, située à l'entrée de la médina. Ce lieu pittoresque est bordé de petits restaurants traditionnels et d'ateliers d'artisans." },
  "talassemtane-national-park":              { n: "Parc National de Talassemtane", d: "Le parc national de Talassemtane est une réserve naturelle protégée dans le massif du Rif, près de Chefchaouen. Ses forêts de sapins, ses gorges profondes et ses sentiers de randonnée en font un paradis pour les amoureux de la nature." },
  "essaouira":                               { n: "Essaouira", d: "Essaouira, l'ancienne Mogador, est une cité côtière au charme envoûtant avec sa médina fortifiée classée à l'UNESCO. Ses ruelles animées, ses remparts battus par les vents et son port de pêche coloré attirent les visiteurs en quête d'authenticité." },
  "skala-de-la-ville":                       { n: "Skala de la Ville", d: "La Skala de la Ville est la promenade de remparts d'Essaouira, offrant une vue imprenable sur l'océan Atlantique et les îles Purpuraires. Ses canons portugais du XVIIIe siècle veillent sur le port de pêche." },
  "sidi-mohammed-ben-abdallah-museum":       { n: "Musée Sidi Mohammed Ben Abdallah", d: "Le musée Sidi Mohammed Ben Abdallah d'Essaouira est installé dans un riad du XIXe siècle. Ses collections d'artisanat local — bijoux berbères, instruments de musique gnaoua, costumes traditionnels — racontent l'histoire de la région." },
  "essaouira-beach":                         { n: "Plage d'Essaouira", d: "La plage d'Essaouira est une vaste étendue de sable fin bordée par les vents alizés, idéale pour le kitesurf et le windsurf. Moins fréquentée que d'autres plages marocaines, elle offre un cadre naturel préservé." },
  "agadir-beach":                            { n: "Plage d'Agadir", d: "La plage d'Agadir est l'une des plus belles plages du Maroc, avec plus de 10 kilomètres de sable fin bordé d'une promenade animée. Ses eaux calmes et son ensoleillement exceptionnel en font une destination balnéaire de premier choix." },
  "agadir-oufla":                            { n: "Agadir Oufella", d: "Agadir Oufella est le site de l'ancienne kasbah d'Agadir, détruite par le tremblement de terre de 1960. Perchée sur la colline, elle offre une vue panoramique à 360 degrés sur la ville, la baie et l'océan Atlantique." },
  "souk-el-had-d-agadir":                    { n: "Souk El Had d'Agadir", d: "Le Souk El Had est le plus grand marché couvert du Maroc, avec plus de 3 000 échoppes réparties par quartiers spécialisés. On y trouve de tout : épices, fruits, vêtements, artisanat et produits locaux." },
  "vallee-des-oiseaux-agadir":               { n: "Vallée des Oiseaux", d: "La Vallée des Oiseaux est un parc animalier au cœur d'Agadir, idéal pour les familles. Sur plusieurs hectares, elle abrite des centaines d'espèces d'oiseaux, des tortues et des petits mammifères dans un cadre paysager agréable." },
  "ait-benhaddou":                           { n: "Ksar Aït Benhaddou", d: "Le ksar d'Aït Benhaddou est un village fortifié en pisé classé au patrimoine mondial de l'UNESCO, chef-d'œuvre de l'architecture présaharienne. C'est le décor de nombreux films célèbres dont Gladiator, Game of Thrones et Lawrence d'Arabie." },
  "kasbah-taourirt":                         { n: "Kasbah Taourirt", d: "La Kasbah Taourirt est l'un des plus beaux exemples d'architecture de pisé de la vallée du Dadès, située à Ouarzazate. Ses appartements décorés, ses cours intérieures et ses toits-terrasses offrent un voyage dans le temps." },
  "atlas-corporation-studios":               { n: "Atlas Studios", d: "Atlas Studios est le plus grand studio de cinéma d'Afrique, situé à Ouarzazate. Surnommé le Hollywood du désert, il a servi de décor à des films légendaires comme Lawrence d'Arabie, Cléopâtre et Gladiator." },
  "fint-oasis":                              { n: "Oasis de Fint", d: "L'oasis de Fint est un véritable havre de verdure à quelques kilomètres d'Ouarzazate. Ses palmeraies, ses cultures en terrasses et ses maisons en pisé offrent un contraste saisissant avec le paysage semi-aride environnant." },
  "erg-chebbi":                              { n: "Erg Chebbi", d: "L'Erg Chebbi est un massif de dunes de sable spectaculaire près de Merzouga, atteignant jusqu'à 150 mètres de hauteur. Ses dunes changeantes, dorées au lever et au coucher du soleil, offrent un paysage saharien de carte postale." },
  "merzouga":                                { n: "Merzouga", d: "Merzouga est un village saharien aux portes de l'Erg Chebbi, point de départ idéal pour les excursions dans le désert. Ses camps de tentes berbères, ses balades à chameau et ses nuits étoilées attirent les voyageurs du monde entier." },
  "ifrane-national-park":                    { n: "Parc National d'Ifrane", d: "Le parc national d'Ifrane est une réserve naturelle du Moyen Atlas abritant des forêts de cèdres centenaires, des lacs d'altitude et une faune variée dont le singe magot. C'est un paradis pour la randonnée et l'observation de la nature." },
  "ifrane":                                  { n: "Ifrane", d: "Surnommée la Suisse du Maroc, Ifrane est une station de montagne au climat alpin, réputée pour ses maisons de style chalet, ses jardins fleuris et ses pistes de ski en hiver. Sa propreté et son cadre verdoyant en font une destination prisée." },
  "lac-dayet-aoua":                          { n: "Lac Dayet Aoua", d: "Le lac Dayet Aoua est un lac naturel d'altitude situé dans le parc national d'Ifrane. En hiver et au printemps, il se remplit d'eau et attire de nombreux oiseaux migrateurs, offrant un spectacle naturel paisible." },
  "tetouan":                                 { n: "Tétouan", d: "Tétouan est une ville du nord du Maroc au riche patrimoine andalou, avec une médina classée à l'UNESCO. Ses ruelles blanchies à la chaux, ses places ombragées et ses ateliers d'artisanat en font une destination culturelle authentique." },
  "archaeological-museum-of-tetouan":        { n: "Musée Archéologique de Tétouan", d: "Le Musée Archéologique de Tétouan présente des collections remarquables d'objets préhistoriques, phéniciens, romains et islamiques découverts dans le nord du Maroc, dont les célèbres mosaïques de Lixus." },
  "portuguese-cistern-el-jadida":            { n: "Citerne Portugaise d'El Jadida", d: "La citerne portugaise d'El Jadida est un vestige mystérieux de l'occupation portugaise au XVIe siècle. Ses voûtes gothiques et son jeu de reflets dans l'eau créent une atmosphère envoûtante, immortalisée par Orson Welles dans son film Othello." },
  "el-jadida":                               { n: "El Jadida", d: "El Jadida, l'ancienne Mazagan portugaise, est une ville côtière dont la cité portugaise fortifiée est classée à l'UNESCO. Ses remparts, sa citerne et ses plages en font une destination idéale pour une escapade alliant histoire et détente." },
};
// ── French descriptions for events ──────────────────────────────────────────
const EVENT_FR = [
  { t: "Festival International du Film de Marrakech (FIFM)", d: "L'un des festivals de cinéma les plus glamours du monde, le FIFM attire à Marrakech chaque novembre les plus grandes stars hollywoodiennes et les cinéastes du monde entier. Projections en plein air sur Jemaa el-Fna, masterclasses et la prestigieuse cérémonie des Étoiles d'Or font de cet événement un incontournable du calendrier culturel." },
  { t: "Marathon International de Marrakech", d: "L'un des marathons les plus pittoresques d'Afrique, attirant plus de 10 000 coureurs de 60 pays. Le parcours serpente entre les remparts antiques, la palmeraie et les murs roses de la médina, avec un départ et une arrivée sur la place Jemaa el-Fna." },
  { t: "Marrakech du Rire", d: "Fondé par l'humoriste Jamel Debbouze, Marrakech du Rire est le premier festival de stand-up d'Afrique du Nord. Des humoristes de renommée internationale se produisent dans les plus beaux riads et théâtres de la ville rouge." },
  { t: "Biennale de Marrakech", d: "La Biennale de Marrakech transforme la médina en une immense galerie d'art contemporain, avec des installations in situ, performances et expositions dans les riads, les souks et les espaces publics de la ville." },
  { t: "Atlas Electronic Festival", d: "Un festival de musique électronique de pointe, installé dans un cadre naturel spectaculaire au pied de l'Atlas. Les plus grands DJs internationaux enflamment la scène alors que le soleil se couche derrière les montagnes." },
  { t: "Festival des Arts Populaires de Marrakech", d: "L'un des plus anciens festivals culturels du Maroc, le Festival des Arts Populaires anime la place Jemaa el-Fna avec des spectacles de musique gnaoua, danses folkloriques, acrobates et orchestres andalous." },
  { t: "Mawazine — Rythmes du Monde", d: "L'un des plus grands festivals de musique du monde par sa fréquentation, Mawazine rassemble plus de 2,5 millions de spectateurs à Rabat. Beyoncé, Rihanna, Drake et Carlos Santana ont foulé ses sept scènes." },
  { t: "Festival Jazz au Chellah", d: "Un festival de jazz à l'atmosphère unique, installé dans la nécropole antique du Chellah. Les concerts en plein air dans ce cadre romain et mérinide, sous les étoiles et les cigognes, créent une expérience musicale inoubliable." },
  { t: "Marathon International de Rabat", d: "Le marathon de la capitale suit un parcours exceptionnel à travers les sites classés à l'UNESCO de Rabat, passant par la Tour Hassan, la Kasbah des Oudayas et les rives du Bou Regreg." },
  { t: "Fête du Trône", d: "La fête nationale la plus importante du Maroc, célébrant l'anniversaire de l'intronisation du roi Mohammed VI. À Rabat, le palais royal accueille des cérémonies officielles, tandis que la ville s'illumine de concerts et de feux d'artifice." },
  { t: "L'Boulevard — Festival de Culture Urbaine", d: "Le festival pionnier de la musique urbaine au Maroc, L'Boulevard rassemble hip-hop, rock et électro à Casablanca. Au programme : concerts, expositions de street art, compétitions de skateboard et battles de danse." },
  { t: "Casa Fashion Week", d: "L'événement de mode le plus prestigieux du Maroc, Casa Fashion Week présente les créations des plus grands stylistes marocains et internationaux. Défilés, showrooms et rencontres professionnelles animent Casablanca pendant une semaine." },
  { t: "Salon International du Meuble et du Design d'Intérieur", d: "Le plus grand salon professionnel du Maroc pour l'ameublement et l'architecture d'intérieur. Plus de 500 exposants et 50 000 visiteurs venus d'Afrique et du Moyen-Orient." },
  { t: "Festival de Fès des Musiques Sacrées du Monde", d: "L'un des festivals les plus profonds spirituellement au monde, réunissant maîtres soufis, chœurs gospel, moines tibétains et artistes flamenco dans les somptueux palais de la médina de Fès." },
  { t: "Forum de Fès — Afrique et Monde Numérique", d: "Un forum international réunissant dirigeants africains, entrepreneurs tech et universitaires pour discuter de la transformation numérique et de l'avenir de l'écosystème technologique africain." },
  { t: "Festival de Musique Andalouse de Fès", d: "Une célébration de la musique andalouse marocaine, héritage des musulmans et juifs expulsés d'Espagne. Les orchestres interprètent les répertoires Malhun et Gharnati dans les madrasas historiques de Fès." },
  { t: "Festival Gnaoua et Musiques du Monde d'Essaouira", d: "Le plus grand festival gnaoua du monde, attirant plus de 500 000 visiteurs à Essaouira. Les maîtres gnaoua mêlent leurs rituels sacrés aux sonorités jazz, blues et reggae internationales." },
  { t: "Coupe du Monde de Kite et Windsurf d'Essaouira", d: "Une compétition internationale de kitesurf dans les alizés légendaires d'Essaouira. Les meilleurs riders mondiaux s'affrontent en freestyle et slalom devant les remparts de la médina." },
  { t: "Timitar — Festival des Signes et Cultures", d: "Le plus grand festival de musique amazighe du monde, célébrant la culture berbère sur la plage d'Agadir. Artistes marocains et musiciens du monde entier se produisent en concerts gratuits." },
  { t: "Compétition Internationale de Surf d'Agadir", d: "Une compétition de surf de niveau mondial au spot légendaire d'Anchor Point à Taghazout. Les surfeurs professionnels du WSL compétitionnent dans l'un des plus beaux décors naturels de la planète." },
  { t: "Festival Tanjazz", d: "L'un des festivals de jazz les plus appréciés d'Afrique, Tanjazz investit les lieux mythiques de Tanger : le Café Hafa, le musée de la Kasbah et les jardins Mendoubia." },
  { t: "Moussem Culturel International d'Assilah", d: "Un festival artistique unique où des peintres du monde entier transforment les murs de la médina d'Assilah en une galerie d'art à ciel ouvert. Une expérience communautaire et artistique exceptionnelle." },
  { t: "Festival International du Film de Meknès", d: "Un festival de cinéma en plein essor dédié au documentaire et à la fiction, mettant en lumière les cinémas africain et arabe dans les lieux historiques de Meknès." },
  { t: "Marathon des Sables", d: "Considérée comme la course à pied la plus difficile du monde, le Marathon des Sables est un ultra-trail de 250 km en 6 jours dans le Sahara marocain. Une aventure humaine extrême." },
  { t: "Sahara Music Festival", d: "Un festival de musique de trois jours au cœur des dunes de l'Erg Chebbi, mêlant musiques sahariennes et berbères aux sonorités électroniques. Une expérience de concert unique sous la Voie lactée." },
  { t: "Dakhla Downwinder Kite Festival", d: "La plus grande course de kitesurf downwind du monde, sur 35 km le long du lagon de Dakhla. Plus de 300 compétiteurs participent à cet événement IKA dans des conditions de vent exceptionnelles." },
  { t: "Festival International du Film de Montagne de Chefchaouen", d: "Un festival de documentaires dédié aux cultures de montagne et à l'aventure, projeté dans la ville bleue. Films d'expédition, randonnées et débats avec des alpinistes du monde entier." },
];

function placeTranslations(name, description, slug) {
  const fr = PLACE_FR[slug];
  if (fr && fr.n && fr.d) {
    return {
      fr: { name: fr.n, description: fr.d },
      en: { name, description: description || "" },
      ar: { name, description: description || "" },
    };
  }
  return {
    fr: { name: name, description: description || "" },
    en: { name, description: description || "" },
    ar: { name, description: description || "" },
  };
}

function eventTranslations(title, description, idx) {
  const fr = EVENT_FR[idx];
  if (fr && fr.t && fr.d) {
    return {
      fr: { title: fr.t, description: fr.d },
      en: { title, description: description || "" },
      ar: { title, description: description || "" },
    };
  }
  return {
    fr: { title, description: description || "" },
    en: { title, description: description || "" },
    ar: { title, description: description || "" },
  };
}

// ── Connect ───────────────────────────────────────────────────────────────────
async function connect() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: "cityguide_v2" });
  console.log("✓ MongoDB connected (cityguide_v2)\n");
}

async function clean() {
  console.log("▶  Cleaning cityguide_v2 database…");
  for (const Model of CLEAN_COLLECTIONS) {
    const { deletedCount } = await Model.deleteMany({});
    if (deletedCount) console.log(`   ${Model.modelName}: ${deletedCount} deleted`);
  }
  console.log("✓  Database cleaned\n");
}

// ── Seed functions ────────────────────────────────────────────────────────────
async function seedUsers() {
  console.log("▶  Seeding users…");
  for (const u of USERS_DATA) {
    const doc = await User.create({
      firstName:   u.firstName,
      lastName:    u.lastName,
      email:       u.email,
      passwordHash: u.password,
      role:        u.role  || "user",
      isGuide:     u.isGuide || false,
      isVerified:  u.isVerified !== undefined ? u.isVerified : true,
      isActive:    true,
      avatarUrl:   u.avatarUrl || "",
      bio:         u.bio || "",
      city:        u.city || "",
      phone:       u.phone || "",
      nationality: u.nationality || "",
      gender:      u.gender || "",
    });
    userByKey[u.key] = doc;
  }
  console.log(`✓  ${USERS_DATA.length} users seeded\n`);
}

async function seedCities() {
  console.log("▶  Seeding cities with translations…");
  for (const c of CITIES_DATA) {
    const doc = await City.create({
      name:     c.name,
      slug:     c.slug,
      region:   c.region || "",
      location: c.location,
      isActive: c.isActive !== undefined ? c.isActive : true,
      translations: makeTranslations(c.name, c.region),
      sourceLang: "en",
      translationStatus: "done",
    });
    cityBySlug[c.slug] = doc._id;
    if (c.key) cityBySlug[c.key] = doc._id;
  }
  console.log(`✓  ${CITIES_DATA.length} cities seeded\n`);
}

async function seedCategories() {
  console.log("▶  Seeding categories with translations…");

  for (const c of CATEGORIES_DATA.filter(c => !c.parent)) {
    const doc = await Category.create({
      name:   c.name,
      slug:   c.slug,
      icon:   c.icon || "",
      status: "active",
      translations: catTranslations(c.name),
      sourceLang: "en",
      translationStatus: "done",
    });
    categoryBySlug[c.slug] = doc._id;
    if (c.key) categoryBySlug[c.key] = doc._id;
  }

  for (const c of CATEGORIES_DATA.filter(c => c.parent)) {
    const parentId = categoryBySlug[c.parent] || null;
    if (!parentId) console.warn(`   WARN category "${c.slug}" — unknown parent: ${c.parent}`);
    const doc = await Category.create({
      name:     c.name,
      slug:     c.slug,
      icon:     c.icon || "",
      parentId,
      status:   "active",
      translations: catTranslations(c.name),
      sourceLang: "en",
      translationStatus: "done",
    });
    categoryBySlug[c.slug] = doc._id;
    if (c.key) categoryBySlug[c.key] = doc._id;
  }

  console.log(`✓  ${CATEGORIES_DATA.length} categories seeded\n`);
}

async function seedPlaces() {
  console.log("▶  Seeding places with Wikipedia thumbnails…");
  let count = 0, skipped = 0, imgFetched = 0;

  for (const p of PLACES_DATA) {
    const cityId     = cityBySlug[p.city];
    const categoryId = categoryBySlug[p.category];

    if (!cityId || !categoryId) {
      if (!cityId) console.warn(`   SKIP "${p.name}" — unknown city: ${p.city}`);
      if (!categoryId) console.warn(`   SKIP "${p.name}" — unknown category: ${p.category}`);
      skipped++;
      continue;
    }

    let images = p.images ? [...p.images] : [];

    // Fetch real image from Wikipedia if missing
    if (images.length === 0) {
      const key = p.slug || slugify(p.name);
      const titles = WIKI_PAGES[key] || [];
      for (const title of titles) {
        const img = await fetchWikiThumb(title);
        if (img) {
          images = [img];
          imgFetched++;
          console.log(`   ✓ ${p.name}`);
          break;
        }
      }
    }

    await Place.create({
      name:               p.name,
      slug:               p.slug || slugify(p.name),
      categoryId,
      cityId,
      description:        p.description || "",
      address:            p.address     || "",
      images,
      location:           p.location    || { type: "Point", coordinates: [0, 0] },
      priceRange:         p.priceRange  || "",
      isFeatured:         p.isFeatured  || false,
      averageRating:      p.averageRating || 0,
      reviewCount:        p.reviewCount   || 0,
      status:             "active",
      isVerifiedBusiness: false,
      translations: placeTranslations(p.name, p.description, p.slug || slugify(p.name)),
      sourceLang: "en",
      translationStatus: "done",
    });
    count++;
  }

  console.log(`✓  ${count} places seeded (${imgFetched} Wikipedia thumbnails fetched, ${skipped} skipped)\n`);
}

async function seedEvents() {
  console.log("▶  Seeding events…");
  let count = 0, skipped = 0;

  for (let idx = 0; idx < EVENTS_DATA.length; idx++) {
    const e  = EVENTS_DATA[idx];
    const cityId = cityBySlug[e.city];
    if (!cityId) {
      console.warn(`   SKIP event "${e.title}" — unknown city: ${e.city}`);
      skipped++;
      continue;
    }

    const doc = await Event.create({
      title:       e.title,
      description: e.description  || "",
      coverImage:  e.coverImage   || "",
      organizer:   e.organizer    || "",
      ticketPrice: e.ticketPrice  ?? 0,
      location:    e.location     || { type: "Point", coordinates: [0, 0] },
      cityId,
      dateRange: {
        from: new Date(e.dateRange.from),
        to:   e.dateRange.to ? new Date(e.dateRange.to) : undefined,
      },
      category:    e.category     || "other",
      status:     e.status     || "upcoming",
      isFeatured: e.isFeatured || false,
      translations: eventTranslations(e.title, e.description, idx),
      sourceLang: "en",
      translationStatus: "done",
    });
    count++;
  }

  console.log(`✓  ${count} events seeded${skipped ? ` (${skipped} skipped)` : ""}\n`);
}

async function seedGuides() {
  console.log("▶  Seeding guide profiles…");
  let count = 0, skipped = 0;

  for (const g of GUIDES_DATA) {
    const user = userByKey[g.userKey];
    if (!user) {
      console.warn(`   SKIP guide — unknown user key: ${g.userKey}`);
      skipped++;
      continue;
    }

    const cityIds = (g.cities || [])
      .map((slug) => cityBySlug[slug])
      .filter(Boolean);

    await GuideProfile.create({
      userId:               user._id,
      tagline:              g.tagline              || "",
      bio:                  g.bio                  || "",
      bannerUrl:            g.bannerUrl            || "",
      specialties:          g.specialties          || [],
      spokenLanguages:      g.spokenLanguages      || [],
      cityIds,
      pricePerHour:         g.pricePerHour         || 0,
      isCurrentlyAvailable: g.isCurrentlyAvailable ?? true,
      verificationStatus:   g.verificationStatus   || "verified",
      averageRating:        g.averageRating        || 0,
      reviewCount:          g.reviewCount          || 0,
      schedule:             g.schedule             || [],
      unavailableDates:     g.unavailableDates      || [],
    });
    count++;
  }

  console.log(`✓  ${count} guide profiles seeded${skipped ? ` (${skipped} skipped)` : ""}\n`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  try {
    await connect();
    await clean();

    await seedUsers();
    await seedCities();
    await seedCategories();
    await seedPlaces();
    await seedEvents();
    await seedGuides();

    console.log("════════════════════════════════════════");
    console.log("✅  V2 Seed completed successfully!");
    console.log("    Database: cityguide_v2");
    console.log("    Users:      " + USERS_DATA.length);
    console.log("    Cities:     " + CITIES_DATA.length);
    console.log("    Categories: " + CATEGORIES_DATA.length);
    console.log("    Places:     " + PLACES_DATA.length);
    console.log("    Events:     " + EVENTS_DATA.length);
    console.log("    Guides:     " + GUIDES_DATA.length);
    console.log("════════════════════════════════════════");
    console.log("\nAdmin credentials:");
    console.log("  Email:    admin@cityguide.ma");
    console.log("  Password: Admin1234!");
    console.log("════════════════════════════════════════\n");

  } catch (err) {
    console.error("❌  Seed failed:", err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
