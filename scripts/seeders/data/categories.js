// ─────────────────────────────────────────────────────────────────────────────
//  categories.js — Professional icon-key system (NO emojis)
//
//  Icon values map to Lucide React component names on the frontend:
//  e.g. icon:"utensils" → import { Utensils } from "lucide-react"
//
//  Structure: 20 parent categories + 60 subcategories (3 per parent)
//  English-first  |  SEO-friendly slugs
// ─────────────────────────────────────────────────────────────────────────────

module.exports = [

  // ══════════════════════════════════════════════════════════════════════════
  //  PARENT CATEGORIES (20)
  // ══════════════════════════════════════════════════════════════════════════

  { key: "restaurants",      name: "Restaurants",          slug: "restaurants",      icon: "utensils"     },
  { key: "cafes",            name: "Cafes & Rooftops",     slug: "cafes",            icon: "coffee"       },
  { key: "hotels",           name: "Hotels",               slug: "hotels",           icon: "building-2"   },
  { key: "riads",            name: "Riads",                slug: "riads",            icon: "home"         },
  { key: "historical-sites", name: "Historical Sites",     slug: "historical-sites", icon: "landmark"     },
  { key: "museums",          name: "Museums & Culture",    slug: "museums",          icon: "library"      },
  { key: "beaches",          name: "Beaches",              slug: "beaches",          icon: "waves"        },
  { key: "nature",           name: "Nature & Landscapes",  slug: "nature",           icon: "tree-pine"    },
  { key: "desert",           name: "Desert Experiences",   slug: "desert",           icon: "sun"          },
  { key: "shopping",         name: "Shopping & Souks",     slug: "shopping",         icon: "shopping-bag" },
  { key: "wellness",         name: "Wellness & Spa",       slug: "wellness",         icon: "sparkles"     },
  { key: "nightlife",        name: "Nightlife",            slug: "nightlife",        icon: "moon"         },
  { key: "sports",           name: "Sports & Activities",  slug: "sports",           icon: "activity"     },
  { key: "coworking",        name: "Coworking",            slug: "coworking",        icon: "laptop"       },
  { key: "tours",            name: "Tours & Excursions",   slug: "tours",            icon: "map"          },
  { key: "photography",      name: "Photography Spots",    slug: "photography",      icon: "camera"       },
  { key: "family",           name: "Family Activities",    slug: "family",           icon: "users"        },
  { key: "religious-sites",  name: "Religious Sites",      slug: "religious-sites",  icon: "building"     },
  { key: "art-galleries",    name: "Art & Galleries",      slug: "art-galleries",    icon: "palette"      },
  { key: "local-food",       name: "Street Food & Markets",slug: "local-food",       icon: "store"        },

  // ══════════════════════════════════════════════════════════════════════════
  //  SUBCATEGORIES — Restaurants (3)
  // ══════════════════════════════════════════════════════════════════════════

  { key: "moroccan-cuisine", name: "Moroccan Cuisine",        slug: "moroccan-cuisine",  icon: "utensils",   parent: "restaurants" },
  { key: "fine-dining",      name: "Fine Dining",             slug: "fine-dining",       icon: "star",       parent: "restaurants" },
  { key: "seafood",          name: "Seafood & Fish",          slug: "seafood",           icon: "fish",       parent: "restaurants" },

  // ══════════════════════════════════════════════════════════════════════════
  //  SUBCATEGORIES — Cafes & Rooftops (3)
  // ══════════════════════════════════════════════════════════════════════════

  { key: "rooftop-cafes",    name: "Rooftop Cafes",           slug: "rooftop-cafes",     icon: "coffee",     parent: "cafes" },
  { key: "traditional-cafes",name: "Traditional Moroccan Cafes",slug:"traditional-cafes",icon: "cup-soda",   parent: "cafes" },
  { key: "specialty-coffee", name: "Specialty Coffee",        slug: "specialty-coffee",  icon: "bean",       parent: "cafes" },

  // ══════════════════════════════════════════════════════════════════════════
  //  SUBCATEGORIES — Hotels (3)
  // ══════════════════════════════════════════════════════════════════════════

  { key: "luxury-hotels",    name: "Luxury Hotels & Palaces", slug: "luxury-hotels",     icon: "crown",      parent: "hotels" },
  { key: "boutique-hotels",  name: "Boutique Hotels",         slug: "boutique-hotels",   icon: "building-2", parent: "hotels" },
  { key: "eco-lodges",       name: "Eco-Lodges & Glamping",   slug: "eco-lodges",        icon: "tent",       parent: "hotels" },

  // ══════════════════════════════════════════════════════════════════════════
  //  SUBCATEGORIES — Riads (3)
  // ══════════════════════════════════════════════════════════════════════════

  { key: "luxury-riads",     name: "Luxury Riads",            slug: "luxury-riads",      icon: "gem",        parent: "riads" },
  { key: "heritage-riads",   name: "Heritage Riads",          slug: "heritage-riads",    icon: "home",       parent: "riads" },
  { key: "guesthouse-riads", name: "Riad Guesthouses",        slug: "guesthouse-riads",  icon: "door-open",  parent: "riads" },

  // ══════════════════════════════════════════════════════════════════════════
  //  SUBCATEGORIES — Historical Sites (3)
  // ══════════════════════════════════════════════════════════════════════════

  { key: "medinas",          name: "Medinas & Old Towns",     slug: "medinas",           icon: "map-pin",    parent: "historical-sites" },
  { key: "palaces-kasbahs",  name: "Palaces & Kasbahs",       slug: "palaces-kasbahs",   icon: "castle",     parent: "historical-sites" },
  { key: "roman-ruins",      name: "Roman & Ancient Ruins",   slug: "roman-ruins",       icon: "columns",    parent: "historical-sites" },

  // ══════════════════════════════════════════════════════════════════════════
  //  SUBCATEGORIES — Museums (3)
  // ══════════════════════════════════════════════════════════════════════════

  { key: "art-museums",      name: "Art Museums",             slug: "art-museums",       icon: "frame",      parent: "museums" },
  { key: "history-museums",  name: "History & Archaeology",   slug: "history-museums",   icon: "scroll",     parent: "museums" },
  { key: "craft-museums",    name: "Crafts & Traditional Arts",slug:"craft-museums",     icon: "scissors",   parent: "museums" },

  // ══════════════════════════════════════════════════════════════════════════
  //  SUBCATEGORIES — Beaches (3)
  // ══════════════════════════════════════════════════════════════════════════

  { key: "atlantic-beaches", name: "Atlantic Beaches",        slug: "atlantic-beaches",  icon: "waves",      parent: "beaches" },
  { key: "med-beaches",      name: "Mediterranean Beaches",   slug: "med-beaches",       icon: "anchor",     parent: "beaches" },
  { key: "surf-spots",       name: "Surf Spots",              slug: "surf-spots",        icon: "wind",       parent: "beaches" },

  // ══════════════════════════════════════════════════════════════════════════
  //  SUBCATEGORIES — Nature (3)
  // ══════════════════════════════════════════════════════════════════════════

  { key: "mountains",        name: "Mountains & Atlas",       slug: "mountains",         icon: "mountain",   parent: "nature" },
  { key: "waterfalls",       name: "Waterfalls & Gorges",     slug: "waterfalls",        icon: "droplets",   parent: "nature" },
  { key: "national-parks",   name: "National Parks & Reserves",slug:"national-parks",   icon: "trees",      parent: "nature" },

  // ══════════════════════════════════════════════════════════════════════════
  //  SUBCATEGORIES — Desert (3)
  // ══════════════════════════════════════════════════════════════════════════

  { key: "desert-camps",     name: "Desert Camps",            slug: "desert-camps",      icon: "tent",       parent: "desert" },
  { key: "camel-trekking",   name: "Camel Trekking",          slug: "camel-trekking",    icon: "footprints", parent: "desert" },
  { key: "sand-dunes",       name: "Sand Dunes & Ergs",       slug: "sand-dunes",        icon: "sun",        parent: "desert" },

  // ══════════════════════════════════════════════════════════════════════════
  //  SUBCATEGORIES — Shopping (3)
  // ══════════════════════════════════════════════════════════════════════════

  { key: "souks",            name: "Souks & Bazaars",         slug: "souks",             icon: "store",      parent: "shopping" },
  { key: "berber-crafts",    name: "Berber Crafts & Rugs",    slug: "berber-crafts",     icon: "layers",     parent: "shopping" },
  { key: "argan-products",   name: "Argan & Natural Products",slug: "argan-products",    icon: "leaf",       parent: "shopping" },

  // ══════════════════════════════════════════════════════════════════════════
  //  SUBCATEGORIES — Wellness (3)
  // ══════════════════════════════════════════════════════════════════════════

  { key: "hammams",          name: "Traditional Hammams",     slug: "hammams",           icon: "thermometer",parent: "wellness" },
  { key: "luxury-spas",      name: "Luxury Spas",             slug: "luxury-spas",       icon: "sparkles",   parent: "wellness" },
  { key: "yoga-retreats",    name: "Yoga & Meditation",       slug: "yoga-retreats",     icon: "heart",      parent: "wellness" },

  // ══════════════════════════════════════════════════════════════════════════
  //  SUBCATEGORIES — Nightlife (3)
  // ══════════════════════════════════════════════════════════════════════════

  { key: "bars-lounges",     name: "Bars & Lounges",          slug: "bars-lounges",      icon: "glass-water",parent: "nightlife" },
  { key: "live-music",       name: "Live Music & Concerts",   slug: "live-music",        icon: "music-2",    parent: "nightlife" },
  { key: "clubs",            name: "Clubs & Dance Floors",    slug: "clubs",             icon: "music",      parent: "nightlife" },

  // ══════════════════════════════════════════════════════════════════════════
  //  SUBCATEGORIES — Sports (3)
  // ══════════════════════════════════════════════════════════════════════════

  { key: "hiking-trekking",  name: "Hiking & Trekking",       slug: "hiking-trekking",   icon: "footprints", parent: "sports" },
  { key: "kitesurfing",      name: "Kitesurfing & Windsurfing",slug:"kitesurfing",        icon: "wind",       parent: "sports" },
  { key: "golf",             name: "Golf",                    slug: "golf",              icon: "flag",       parent: "sports" },

  // ══════════════════════════════════════════════════════════════════════════
  //  SUBCATEGORIES — Coworking (3)
  // ══════════════════════════════════════════════════════════════════════════

  { key: "coworking-spaces", name: "Coworking Spaces",        slug: "coworking-spaces",  icon: "laptop",     parent: "coworking" },
  { key: "startup-hubs",     name: "Startup Hubs",            slug: "startup-hubs",      icon: "rocket",     parent: "coworking" },
  { key: "business-centers", name: "Business Centers",        slug: "business-centers",  icon: "briefcase",  parent: "coworking" },

  // ══════════════════════════════════════════════════════════════════════════
  //  SUBCATEGORIES — Tours (3)
  // ══════════════════════════════════════════════════════════════════════════

  { key: "city-tours",       name: "City Walking Tours",      slug: "city-tours",        icon: "map-pin",    parent: "tours" },
  { key: "desert-tours",     name: "Desert Safari Tours",     slug: "desert-tours",      icon: "compass",    parent: "tours" },
  { key: "food-tours",       name: "Food & Culinary Tours",   slug: "food-tours",        icon: "utensils",   parent: "tours" },

  // ══════════════════════════════════════════════════════════════════════════
  //  SUBCATEGORIES — Photography (3)
  // ══════════════════════════════════════════════════════════════════════════

  { key: "sunset-spots",     name: "Sunset & Sunrise Spots",  slug: "sunset-spots",      icon: "sunset",     parent: "photography" },
  { key: "rooftop-views",    name: "Rooftop & Terrace Views", slug: "rooftop-views",     icon: "building-2", parent: "photography" },
  { key: "street-photography",name:"Street Photography",      slug:"street-photography", icon: "camera",     parent: "photography" },

  // ══════════════════════════════════════════════════════════════════════════
  //  SUBCATEGORIES — Family (3)
  // ══════════════════════════════════════════════════════════════════════════

  { key: "theme-parks",      name: "Theme Parks & Attractions",slug:"theme-parks",       icon: "ferris-wheel",parent: "family" },
  { key: "kids-activities",  name: "Kids Activities",          slug: "kids-activities",  icon: "baby",       parent: "family" },
  { key: "family-beaches",   name: "Family-Friendly Beaches",  slug: "family-beaches",   icon: "umbrella",   parent: "family" },

  // ══════════════════════════════════════════════════════════════════════════
  //  SUBCATEGORIES — Religious Sites (3)
  // ══════════════════════════════════════════════════════════════════════════

  { key: "mosques",          name: "Mosques",                 slug: "mosques",           icon: "building",   parent: "religious-sites" },
  { key: "mausoleums",       name: "Mausoleums & Zaouias",    slug: "mausoleums",        icon: "monument",   parent: "religious-sites" },
  { key: "medersas",         name: "Quranic Schools",         slug: "medersas",          icon: "scroll-text",parent: "religious-sites" },

  // ══════════════════════════════════════════════════════════════════════════
  //  SUBCATEGORIES — Art & Galleries (3)
  // ══════════════════════════════════════════════════════════════════════════

  { key: "contemporary-art", name: "Contemporary Art Galleries",slug:"contemporary-art", icon: "frame",      parent: "art-galleries" },
  { key: "artisan-workshops",name: "Artisan Workshops",        slug: "artisan-workshops", icon: "hammer",     parent: "art-galleries" },
  { key: "street-art",       name: "Street Art & Murals",      slug: "street-art",        icon: "pen-tool",   parent: "art-galleries" },

  // ══════════════════════════════════════════════════════════════════════════
  //  SUBCATEGORIES — Local Food (3)
  // ══════════════════════════════════════════════════════════════════════════

  { key: "street-food-stalls",name:"Street Food Stalls",       slug:"street-food-stalls", icon: "store",      parent: "local-food" },
  { key: "food-markets",      name: "Food Markets & Souks",    slug: "food-markets",      icon: "shopping-cart",parent:"local-food" },
  { key: "bakeries",          name: "Traditional Bakeries",    slug: "bakeries",          icon: "wheat",      parent: "local-food" },
];
