// ─────────────────────────────────────────────────────────────────────────────
//  image-pool-queries.js — Wikimedia Commons search templates per category
//
//  Used by 4-fetch-images.js to build per-(city, category) image pools.
//  {CITY} is replaced with the actual city name.
//  Each list is tried in order; first 2 give the pool.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  byCategory: {
    // Restaurants & food
    restaurants:           ["restaurant {CITY} Morocco", "Moroccan tagine {CITY}"],
    "moroccan-cuisine":    ["Moroccan cuisine {CITY}", "tagine couscous Morocco"],
    "fine-dining":         ["fine dining Morocco", "restaurant {CITY} elegant"],
    seafood:               ["seafood Morocco fish market", "{CITY} fish port"],
    "local-food":          ["Moroccan street food", "food market {CITY} Morocco"],
    "street-food-stalls":  ["street food Morocco", "food stall {CITY}"],
    "food-markets":        ["Moroccan market {CITY}", "souk market Morocco food"],
    bakeries:              ["Moroccan bakery bread", "bakery {CITY} traditional"],

    // Cafés
    cafes:                 ["Moroccan cafe {CITY}", "cafe Morocco terrace"],
    "rooftop-cafes":       ["rooftop cafe Morocco {CITY}", "Moroccan rooftop terrace"],
    "traditional-cafes":   ["traditional Moroccan cafe", "mint tea Morocco"],
    "specialty-coffee":    ["coffee shop Morocco", "coffee {CITY}"],

    // Hotels & lodging
    hotels:                ["hotel {CITY} Morocco", "Moroccan hotel architecture"],
    "luxury-hotels":       ["luxury hotel Morocco", "palace hotel {CITY}"],
    "boutique-hotels":     ["boutique hotel Morocco", "design hotel {CITY}"],
    "eco-lodges":          ["eco-lodge Morocco desert", "Moroccan ecolodge"],
    riads:                 ["riad {CITY} Morocco", "Moroccan riad courtyard"],
    "luxury-riads":        ["luxury riad Morocco", "riad Marrakech traditional"],
    "heritage-riads":      ["heritage riad Morocco medina", "traditional riad architecture"],
    "guesthouse-riads":    ["riad guesthouse Morocco", "Moroccan guesthouse traditional"],

    // Historical sites
    medinas:               ["Medina {CITY} Morocco", "{CITY} old town"],
    "palaces-kasbahs":     ["Kasbah {CITY} Morocco", "palace Morocco architecture"],
    "roman-ruins":         ["Roman ruins Morocco", "archaeological site Morocco"],
    "historical-sites":    ["historical site {CITY} Morocco", "Morocco landmark"],

    // Religious sites
    mosques:               ["mosque {CITY} Morocco", "Moroccan mosque minaret"],
    mausoleums:            ["mausoleum {CITY} Morocco", "Moroccan tomb shrine"],
    medersas:              ["madrasa {CITY} Morocco", "Moroccan medersa architecture"],
    "religious-sites":     ["mosque Morocco {CITY}", "Moroccan shrine religious"],

    // Museums & art
    "art-museums":         ["art museum {CITY} Morocco", "Moroccan art gallery"],
    "history-museums":     ["history museum {CITY} Morocco", "Moroccan museum exhibition"],
    "craft-museums":       ["Moroccan crafts museum", "traditional crafts Morocco {CITY}"],
    "contemporary-art":    ["contemporary art Morocco", "Moroccan modern art gallery"],
    "artisan-workshops":   ["Moroccan artisan workshop", "{CITY} crafts traditional"],
    "street-art":          ["street art Morocco", "graffiti {CITY} murals"],
    "art-galleries":       ["art gallery Morocco {CITY}", "Moroccan painting"],

    // Beaches & water
    beaches:               ["beach {CITY} Morocco", "Moroccan coast beach"],
    "atlantic-beaches":    ["Atlantic beach Morocco", "{CITY} beach Atlantic"],
    "med-beaches":         ["Mediterranean beach Morocco", "{CITY} beach Mediterranean"],
    "surf-spots":          ["surfing Morocco {CITY}", "Morocco surf waves"],
    "family-beaches":      ["beach {CITY} Morocco family", "Moroccan coast"],

    // Nature
    mountains:             ["Atlas mountains {CITY} Morocco", "mountain landscape Morocco"],
    waterfalls:            ["waterfall Morocco {CITY}", "Moroccan cascade"],
    "national-parks":      ["national park Morocco {CITY}", "Moroccan nature reserve"],

    // Desert
    "sand-dunes":          ["Sahara dunes Morocco", "Erg Chebbi Merzouga sand"],
    "desert-camps":        ["desert camp Morocco Sahara", "Berber tent desert"],
    "camel-trekking":      ["camel Morocco Sahara", "camel trek desert Morocco"],

    // Shopping
    souks:                 ["souk {CITY} Morocco", "Moroccan market bazaar"],
    "berber-crafts":       ["Berber carpet Morocco", "Moroccan craft rug"],
    "argan-products":      ["argan oil Morocco", "Moroccan argan cosmetics"],
    shopping:              ["shopping {CITY} Morocco", "Moroccan souk"],

    // Wellness
    hammams:               ["hammam Morocco {CITY}", "Moroccan hammam traditional"],
    "luxury-spas":         ["luxury spa Morocco", "Moroccan spa {CITY}"],
    "yoga-retreats":       ["yoga Morocco retreat", "meditation Morocco"],
    wellness:              ["spa Morocco {CITY}", "Moroccan hammam wellness"],

    // Nightlife
    "bars-lounges":        ["bar lounge {CITY} Morocco", "Moroccan rooftop bar"],
    "live-music":          ["live music Morocco {CITY}", "Moroccan concert"],
    clubs:                 ["nightclub Morocco {CITY}", "Moroccan club dance"],
    nightlife:             ["nightlife {CITY} Morocco", "Moroccan bar lounge"],

    // Sports
    "hiking-trekking":     ["hiking Morocco {CITY}", "Atlas trekking trail"],
    kitesurfing:           ["kitesurfing Morocco", "windsurfing Essaouira Dakhla"],
    golf:                  ["golf course Morocco {CITY}", "Moroccan golf"],
    sports:                ["sports Morocco {CITY}", "Moroccan outdoor activity"],

    // Coworking
    "coworking-spaces":    ["coworking {CITY}", "office workspace Morocco"],
    "startup-hubs":        ["startup Morocco {CITY}", "tech hub Morocco"],
    "business-centers":    ["business center {CITY} Morocco", "office building Morocco"],
    coworking:             ["coworking Morocco {CITY}", "office Morocco modern"],

    // Tours
    "city-tours":          ["walking tour {CITY} Morocco", "Moroccan medina tour"],
    "desert-tours":        ["desert tour Morocco", "Sahara excursion {CITY}"],
    "food-tours":          ["food tour Morocco", "Moroccan culinary {CITY}"],
    tours:                 ["tour {CITY} Morocco", "Moroccan excursion"],

    // Photography / views
    "sunset-spots":        ["sunset {CITY} Morocco", "Moroccan sunset viewpoint"],
    "rooftop-views":       ["rooftop view {CITY}", "Moroccan terrace skyline"],
    "street-photography":  ["streets {CITY} Morocco", "Moroccan medina people"],
    photography:           ["{CITY} Morocco", "Moroccan landscape"],

    // Family
    "theme-parks":         ["theme park Morocco {CITY}", "Moroccan attraction water park"],
    "kids-activities":     ["family Morocco {CITY}", "Moroccan playground children"],
    family:                ["family {CITY} Morocco", "Moroccan family activity"],

    // Desert generic
    desert:                ["Sahara Morocco desert", "Moroccan dunes desert"],
    nature:                ["nature Morocco {CITY}", "Moroccan landscape"],
  },
  fallback: ["{CITY} Morocco", "Morocco landscape"],
};
