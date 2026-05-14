// 100 catégories — 20 parents + 80 enfants (5 par parent)
// Les enfants référencent leur parent via le champ `parent` (slug du parent)

module.exports = [
  // ══════════════════════════════════════════════════════════════════════════
  // PARENTS (20)
  // ══════════════════════════════════════════════════════════════════════════
  { key:"restauration",    name:"Restauration & Gastronomie", slug:"restauration",    icon:"🍽️" },
  { key:"hebergement",     name:"Hébergement",                slug:"hebergement",     icon:"🏠" },
  { key:"patrimoine",      name:"Sites Historiques & Patrimoine", slug:"patrimoine",  icon:"🏛️" },
  { key:"nature",          name:"Nature & Paysages",          slug:"nature",          icon:"🌿" },
  { key:"plages",          name:"Plages & Sports Nautiques",  slug:"plages",          icon:"🏖️" },
  { key:"shopping",        name:"Shopping & Artisanat",       slug:"shopping",        icon:"🛍️" },
  { key:"bienetre",        name:"Bien-être & Spa",            slug:"bienetre",        icon:"💆" },
  { key:"nocturne",        name:"Vie Nocturne & Divertissement", slug:"nocturne",     icon:"🌙" },
  { key:"religion",        name:"Sites Religieux & Spirituels", slug:"religion",      icon:"🕌" },
  { key:"art-musees",      name:"Art & Musées",               slug:"art-musees",      icon:"🎨" },
  { key:"sports",          name:"Sports & Activités",         slug:"sports",          icon:"🏃" },
  { key:"coworking",       name:"Coworking & Affaires",       slug:"coworking",       icon:"💻" },
  { key:"excursions",      name:"Excursions & Circuits",      slug:"excursions",      icon:"🗺️" },
  { key:"evenements",      name:"Événements & Festivals",     slug:"evenements",      icon:"🎉" },
  { key:"panoramas",       name:"Points de Vue & Panoramas",  slug:"panoramas",       icon:"📸" },
  { key:"street-food",     name:"Street Food & Marchés",      slug:"street-food",     icon:"🥙" },
  { key:"terroir",         name:"Agriculture & Terroir",      slug:"terroir",         icon:"🌾" },
  { key:"education",       name:"Éducation & Langue",         slug:"education",       icon:"📚" },
  { key:"transport",       name:"Transport & Mobilité",       slug:"transport",       icon:"🚌" },
  { key:"famille",         name:"Famille & Enfants",          slug:"famille",         icon:"❤️" },

  // ══════════════════════════════════════════════════════════════════════════
  // ENFANTS — Restauration (5)
  // ══════════════════════════════════════════════════════════════════════════
  { key:"cuisine-marocaine",      name:"Cuisine marocaine traditionnelle", slug:"cuisine-marocaine",      icon:"🥘", parent:"restauration" },
  { key:"fruits-de-mer",          name:"Fruits de mer & Poissons",         slug:"fruits-de-mer",          icon:"🦞", parent:"restauration" },
  { key:"gastronomique",          name:"Restaurants gastronomiques",       slug:"gastronomique",          icon:"⭐", parent:"restauration" },
  { key:"vegetarien",             name:"Végétarien & Vegan",               slug:"vegetarien",             icon:"🥗", parent:"restauration" },
  { key:"brunch-cafes",           name:"Cafés & Brunchs",                  slug:"brunch-cafes",           icon:"☕", parent:"restauration" },

  // ENFANTS — Hébergement (5)
  { key:"riads",                  name:"Riads & Dar traditionnels",        slug:"riads",                  icon:"🏡", parent:"hebergement" },
  { key:"hotels-luxe",            name:"Hôtels de luxe & Palaces",         slug:"hotels-luxe",            icon:"🏨", parent:"hebergement" },
  { key:"auberges",               name:"Auberges de jeunesse & Hostels",   slug:"auberges",               icon:"🛏️", parent:"hebergement" },
  { key:"maisons-hotes",          name:"Maisons d'hôtes & B&B",            slug:"maisons-hotes",          icon:"🏘️", parent:"hebergement" },
  { key:"eco-lodges",             name:"Glamping & Éco-lodges",            slug:"eco-lodges",             icon:"⛺", parent:"hebergement" },

  // ENFANTS — Patrimoine (5)
  { key:"medinas",                name:"Médinas & Vieilles villes",        slug:"medinas",                icon:"🧱", parent:"patrimoine" },
  { key:"palais-kasbah",          name:"Palais & Kasbahs",                 slug:"palais-kasbah",          icon:"🏰", parent:"patrimoine" },
  { key:"sites-romains",          name:"Sites archéologiques romains",     slug:"sites-romains",          icon:"🏺", parent:"patrimoine" },
  { key:"ksour",                  name:"Ksour & Greniers collectifs",      slug:"ksour",                  icon:"🔺", parent:"patrimoine" },
  { key:"remparts",               name:"Remparts & Fortifications",        slug:"remparts",               icon:"🗿", parent:"patrimoine" },

  // ENFANTS — Nature (5)
  { key:"atlas-montagne",         name:"Montagnes & Cols de l'Atlas",      slug:"atlas-montagne",         icon:"🏔️", parent:"nature" },
  { key:"desert-ergs",            name:"Désert & Ergs sahariens",          slug:"desert-ergs",            icon:"🏜️", parent:"nature" },
  { key:"gorges-canyons",         name:"Gorges & Canyons",                 slug:"gorges-canyons",         icon:"🪨", parent:"nature" },
  { key:"forets",                 name:"Forêts & Zones naturelles",        slug:"forets",                 icon:"🌲", parent:"nature" },
  { key:"cascades-sources",       name:"Cascades & Sources",               slug:"cascades-sources",       icon:"💧", parent:"nature" },

  // ENFANTS — Plages (5)
  { key:"plages-atlantique",      name:"Plages atlantiques",               slug:"plages-atlantique",      icon:"🌊", parent:"plages" },
  { key:"plages-mediterranee",    name:"Plages méditerranéennes",          slug:"plages-mediterranee",    icon:"🏊", parent:"plages" },
  { key:"surf-bodyboard",         name:"Surf & Bodyboard",                 slug:"surf-bodyboard",         icon:"🏄", parent:"plages" },
  { key:"kitesurf-windsurf",      name:"Kitesurf & Windsurf",              slug:"kitesurf-windsurf",      icon:"🪁", parent:"plages" },
  { key:"plongee",                name:"Plongée & Snorkeling",             slug:"plongee",                icon:"🤿", parent:"plages" },

  // ENFANTS — Shopping (5)
  { key:"souks",                  name:"Souks & Marchés traditionnels",    slug:"souks",                  icon:"🛒", parent:"shopping" },
  { key:"maroquinerie",           name:"Maroquinerie & Cuir",              slug:"maroquinerie",           icon:"👜", parent:"shopping" },
  { key:"bijoux-berberes",        name:"Bijoux & Argenterie berbère",      slug:"bijoux-berberes",        icon:"💍", parent:"shopping" },
  { key:"tapis-textiles",         name:"Tapis & Tissage",                  slug:"tapis-textiles",         icon:"🧶", parent:"shopping" },
  { key:"ceramiques",             name:"Céramiques & Poteries",            slug:"ceramiques",             icon:"🪔", parent:"shopping" },

  // ENFANTS — Bien-être (5)
  { key:"hammams",                name:"Hammams traditionnels",            slug:"hammams",                icon:"♨️", parent:"bienetre" },
  { key:"spas-luxe",              name:"Spas & Instituts de beauté",       slug:"spas-luxe",              icon:"💅", parent:"bienetre" },
  { key:"massages-argan",         name:"Massages & Soins à l'argan",       slug:"massages-argan",         icon:"🫧", parent:"bienetre" },
  { key:"yoga-meditation",        name:"Yoga & Méditation",                slug:"yoga-meditation",        icon:"🧘", parent:"bienetre" },
  { key:"thalasso",               name:"Thalassothérapie & Thermes",       slug:"thalasso",               icon:"🌊", parent:"bienetre" },

  // ENFANTS — Vie Nocturne (5)
  { key:"bars-lounges",           name:"Bars & Lounges",                   slug:"bars-lounges",           icon:"🍸", parent:"nocturne" },
  { key:"clubs",                  name:"Clubs & Discothèques",             slug:"clubs",                  icon:"🎧", parent:"nocturne" },
  { key:"cafes-concerts",         name:"Cafés-concerts & Live music",      slug:"cafes-concerts",         icon:"🎶", parent:"nocturne" },
  { key:"folklore",               name:"Spectacles de folklore marocain",  slug:"folklore",               icon:"🪘", parent:"nocturne" },
  { key:"cinemas-theatres",       name:"Cinémas & Théâtres",               slug:"cinemas-theatres",       icon:"🎭", parent:"nocturne" },

  // ENFANTS — Religion (5)
  { key:"mosquees",               name:"Mosquées historiques",             slug:"mosquees",               icon:"🕌", parent:"religion" },
  { key:"mausolees",              name:"Mausolées & Zaouïas",              slug:"mausolees",              icon:"⭐", parent:"religion" },
  { key:"synagogues",             name:"Synagogues & Patrimoine juif",     slug:"synagogues",             icon:"✡️", parent:"religion" },
  { key:"moussems",               name:"Moussems & Pèlerinages",           slug:"moussems",               icon:"🚶", parent:"religion" },
  { key:"medersas",               name:"Médersa & Enseignement islamique", slug:"medersas",               icon:"📖", parent:"religion" },

  // ENFANTS — Art & Musées (5)
  { key:"galeries",               name:"Galeries d'art contemporain",      slug:"galeries",               icon:"🖼️", parent:"art-musees" },
  { key:"musees-ethno",           name:"Musées ethnographiques",           slug:"musees-ethno",           icon:"🏛️", parent:"art-musees" },
  { key:"musees-archeo",          name:"Musées archéologiques",            slug:"musees-archeo",          icon:"⚱️", parent:"art-musees" },
  { key:"ateliers-artisans",      name:"Ateliers d'artisans",              slug:"ateliers-artisans",      icon:"🪆", parent:"art-musees" },
  { key:"street-art",             name:"Street art & Murale",              slug:"street-art",             icon:"🎨", parent:"art-musees" },

  // ENFANTS — Sports (5)
  { key:"randonnee",              name:"Randonnée & Trekking",             slug:"randonnee",              icon:"🥾", parent:"sports" },
  { key:"golf",                   name:"Golf & Sports de balle",           slug:"golf",                   icon:"⛳", parent:"sports" },
  { key:"equitation",             name:"Équitation & Fantasia",            slug:"equitation",             icon:"🐎", parent:"sports" },
  { key:"sports-extremes",        name:"Sports extrêmes & Escalade",       slug:"sports-extremes",        icon:"🧗", parent:"sports" },
  { key:"quad-4x4",               name:"Quad & 4×4 Désert",               slug:"quad-4x4",               icon:"🏎️", parent:"sports" },

  // ENFANTS — Coworking (5)
  { key:"espaces-coworking",      name:"Espaces de coworking",             slug:"espaces-coworking",      icon:"🖥️", parent:"coworking" },
  { key:"hubs-startup",           name:"Hubs d'innovation & Startups",     slug:"hubs-startup",           icon:"🚀", parent:"coworking" },
  { key:"centres-affaires",       name:"Centres d'affaires",               slug:"centres-affaires",       icon:"🏢", parent:"coworking" },
  { key:"campus",                 name:"Campus universitaires",            slug:"campus",                 icon:"🎓", parent:"coworking" },
  { key:"salles-conf",            name:"Salles de conférence",             slug:"salles-conf",            icon:"📊", parent:"coworking" },

  // ENFANTS — Excursions (5)
  { key:"circuits-4x4",           name:"Circuits en 4×4 & Quad",          slug:"circuits-4x4",           icon:"🚙", parent:"excursions" },
  { key:"dromadaire-trek",        name:"Trekking en dromadaire",           slug:"dromadaire-trek",        icon:"🐪", parent:"excursions" },
  { key:"circuits-culturels",     name:"Circuits culturels guidés",        slug:"circuits-culturels",     icon:"🗺️", parent:"excursions" },
  { key:"day-trips",              name:"Day trips & Demi-journées",        slug:"day-trips",              icon:"📅", parent:"excursions" },
  { key:"tours-photo",            name:"Tours photographiques",            slug:"tours-photo",            icon:"📷", parent:"excursions" },

  // ENFANTS — Événements (5)
  { key:"festivals-musique",      name:"Festivals de musique",             slug:"festivals-musique",      icon:"🎵", parent:"evenements" },
  { key:"festivals-cinema",       name:"Festivals de cinéma",              slug:"festivals-cinema",       icon:"🎬", parent:"evenements" },
  { key:"salons-expo",            name:"Salons & Expositions",             slug:"salons-expo",            icon:"🏟️", parent:"evenements" },
  { key:"fetes-locales",          name:"Fêtes locales & Moussems",         slug:"fetes-locales",          icon:"🎊", parent:"evenements" },
  { key:"events-sportifs",        name:"Événements sportifs",              slug:"events-sportifs",        icon:"🏆", parent:"evenements" },

  // ENFANTS — Panoramas (5)
  { key:"terrasses",              name:"Terrasses panoramiques",           slug:"terrasses",              icon:"🌅", parent:"panoramas" },
  { key:"sommets",                name:"Sommets & Points culminants",      slug:"sommets",                icon:"⛰️", parent:"panoramas" },
  { key:"falaises-cotes",         name:"Falaises & Côtes spectaculaires",  slug:"falaises-cotes",         icon:"🌊", parent:"panoramas" },
  { key:"vues-villes",            name:"Vues sur la ville",                slug:"vues-villes",            icon:"🏙️", parent:"panoramas" },
  { key:"couchers-soleil",        name:"Spots couchers de soleil",         slug:"couchers-soleil",        icon:"🌇", parent:"panoramas" },

  // ENFANTS — Street Food (5)
  { key:"marches-nocturnes",      name:"Marchés nocturnes",                slug:"marches-nocturnes",      icon:"🌛", parent:"street-food" },
  { key:"jus-frais",              name:"Jus frais & Smoothies",            slug:"jus-frais",              icon:"🍊", parent:"street-food" },
  { key:"grillades",              name:"Grillades & Brochettes",           slug:"grillades",              icon:"🍢", parent:"street-food" },
  { key:"patisseries",            name:"Pâtisseries & Msemen",             slug:"patisseries",            icon:"🥐", parent:"street-food" },
  { key:"soupes",                 name:"Soupes & Harira",                  slug:"soupes",                 icon:"🍲", parent:"street-food" },

  // ENFANTS — Terroir (5)
  { key:"coop-argan",             name:"Coopératives d'argan",             slug:"coop-argan",             icon:"🫒", parent:"terroir" },
  { key:"safran",                 name:"Plantations de safran",            slug:"safran",                 icon:"🌸", parent:"terroir" },
  { key:"olivaies",               name:"Olivaies & Huileries",             slug:"olivaies",               icon:"🫙", parent:"terroir" },
  { key:"dates-palmeraies",       name:"Palmeraies & Dattes",              slug:"dates-palmeraies",       icon:"🌴", parent:"terroir" },
  { key:"marches-producteurs",    name:"Marchés de producteurs",           slug:"marches-producteurs",    icon:"🥕", parent:"terroir" },

  // ENFANTS — Éducation (5)
  { key:"ecoles-arabe",           name:"Cours d'arabe & Darija",           slug:"ecoles-arabe",           icon:"🗣️", parent:"education" },
  { key:"cours-cuisine",          name:"Cours de cuisine marocaine",       slug:"cours-cuisine",          icon:"👨‍🍳", parent:"education" },
  { key:"ateliers-artisanat",     name:"Ateliers d'artisanat",             slug:"ateliers-artisanat",     icon:"🎭", parent:"education" },
  { key:"musees-peda",            name:"Musées pédagogiques",              slug:"musees-peda",            icon:"🔬", parent:"education" },
  { key:"centres-culturels",      name:"Centres culturels & Instituts",    slug:"centres-culturels",      icon:"🏛️", parent:"education" },

  // ENFANTS — Transport (5)
  { key:"gares",                  name:"Gares ferroviaires ONCF",          slug:"gares",                  icon:"🚂", parent:"transport" },
  { key:"aeroports",              name:"Aéroports",                        slug:"aeroports",              icon:"✈️", parent:"transport" },
  { key:"ports-maritimes",        name:"Ports & Liaisons maritimes",       slug:"ports-maritimes",        icon:"⛴️", parent:"transport" },
  { key:"location-voitures",      name:"Locations de voitures & Motos",    slug:"location-voitures",      icon:"🚗", parent:"transport" },
  { key:"bus-ctm",                name:"Bus & CTM longue distance",        slug:"bus-ctm",                icon:"🚌", parent:"transport" },

  // ENFANTS — Famille (5)
  { key:"parcs-attractions",      name:"Parcs d'attractions",              slug:"parcs-attractions",      icon:"🎡", parent:"famille" },
  { key:"zoos-aquariums",         name:"Zoos & Aquariums",                 slug:"zoos-aquariums",         icon:"🦁", parent:"famille" },
  { key:"activites-enfants",      name:"Activités pour enfants",           slug:"activites-enfants",      icon:"🎠", parent:"famille" },
  { key:"parcs-jeux",             name:"Parcs & Espaces de jeux",          slug:"parcs-jeux",             icon:"⛲", parent:"famille" },
  { key:"restaurants-familiaux",  name:"Restaurants familiaux",            slug:"restaurants-familiaux",  icon:"👨‍👩‍👧", parent:"famille" },
];
