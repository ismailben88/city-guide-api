#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
//  fetch-wiki-places.js
//
//  Fetches REAL images + GPS + descriptions for Moroccan places from the
//  Wikipedia REST API, then writes a ready-to-use seeder file.
//
//  WHY Wikipedia API:
//    · originalimage.source  →  real, verified Wikimedia Commons URL
//    · coordinates.lat/.lon  →  actual GPS from the article geo-tag
//    · extract               →  factual English description
//    Zero invented filenames — if Wikipedia has it, it exists.
//
//  USAGE:
//    node backend/scripts/fetch-wiki-places.js [--dry-run]
//
//  OUTPUT:
//    backend/scripts/seeders/data/places-enriched.js
//    Then: node backend/scripts/seeders/seed.js
// ─────────────────────────────────────────────────────────────────────────────
"use strict";
const https = require("https");
const fs    = require("fs");
const path  = require("path");

// ─────────────────────────────────────────────────────────────────────────────
//  ANSI terminal helpers  (no external packages)
// ─────────────────────────────────────────────────────────────────────────────
const isTTY = process.stdout.isTTY;
const A = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  dim:    "\x1b[2m",
  // foreground
  red:    "\x1b[31m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  blue:   "\x1b[34m",
  cyan:   "\x1b[36m",
  white:  "\x1b[37m",
  gray:   "\x1b[90m",
  // bg
  bgAmber:"\x1b[48;2;201;151;74m",
  // cursor
  up:     (n = 1) => `\x1b[${n}A`,
  col0:   "\r",
  clrLine:"\x1b[2K",
};

const c = {
  green:  (s) => isTTY ? `${A.green}${s}${A.reset}`  : s,
  yellow: (s) => isTTY ? `${A.yellow}${s}${A.reset}` : s,
  red:    (s) => isTTY ? `${A.red}${s}${A.reset}`    : s,
  cyan:   (s) => isTTY ? `${A.cyan}${s}${A.reset}`   : s,
  gray:   (s) => isTTY ? `${A.gray}${s}${A.reset}`   : s,
  dim:    (s) => isTTY ? `${A.dim}${s}${A.reset}`    : s,
  bold:   (s) => isTTY ? `${A.bold}${s}${A.reset}`   : s,
};

function write(s)    { process.stdout.write(s); }
function writeln(s = "") { process.stdout.write(s + "\n"); }
function clearLine() { if (isTTY) write(A.clrLine + A.col0); }

// ─────────────────────────────────────────────────────────────────────────────
//  Spinner
// ─────────────────────────────────────────────────────────────────────────────
const SPIN_FRAMES = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
let _spinFrame = 0;
let _spinTimer = null;
let _spinMsg   = "";

function spinStart(msg) {
  _spinMsg = msg;
  _spinFrame = 0;
  if (!isTTY) { write(`  ${msg} ...`); return; }
  _spinTimer = setInterval(() => {
    write(A.clrLine + A.col0 + c.cyan(SPIN_FRAMES[_spinFrame++ % SPIN_FRAMES.length]) + "  " + _spinMsg);
  }, 80);
}

function spinStop() {
  if (_spinTimer) { clearInterval(_spinTimer); _spinTimer = null; }
  if (isTTY) clearLine();
  else write("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
//  Progress bar
// ─────────────────────────────────────────────────────────────────────────────
function progressBar(done, total, width = 36) {
  const pct   = total ? done / total : 0;
  const filled = Math.round(pct * width);
  const empty  = width - filled;
  const bar    = c.green("█".repeat(filled)) + c.dim("░".repeat(empty));
  const label  = `${String(done).padStart(3)}/${total}`;
  const pctStr = `${Math.round(pct * 100)}%`.padStart(4);
  return `  ${bar}  ${c.bold(pctStr)}  ${c.gray(label)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  PLACE CATALOGUE  — Wikipedia title · city · category · fallback GPS
// ─────────────────────────────────────────────────────────────────────────────
const CATALOGUE = [

  // ─── CASABLANCA ───────────────────────────────────────────────────────────
  { wiki:"Hassan II Mosque",             city:"casablanca", cat:"mosques",           address:"Bd Sidi Mohammed Ben Abdallah, Casablanca",       fb:[33.6086,-7.6327], featured:true,  rating:4.9, reviews:48000 },
  { wiki:"Casablanca Cathedral",         city:"casablanca", cat:"history-museums",   address:"Rue du Capitaine Vibert, Casablanca",              fb:[33.5887,-7.6107], featured:false, rating:4.3, reviews:3200  },
  { wiki:"Mohammed V Square, Casablanca",city:"casablanca", cat:"medinas",           address:"Place Mohammed V, Casablanca",                     fb:[33.5916,-7.6129], featured:false, rating:4.2, reviews:2800  },
  { wiki:"Quartier des Habous",          city:"casablanca", cat:"medinas",           address:"Quartier des Habous, Casablanca",                  fb:[33.5784,-7.6076], featured:false, rating:4.5, reviews:5100  },
  { wiki:"Corniche of Casablanca",       city:"casablanca", cat:"atlantic-beaches",  address:"Boulevard de la Corniche, Casablanca",             fb:[33.6014,-7.6701], featured:true,  rating:4.4, reviews:9800  },
  { wiki:"Parc de la Ligue Arabe",       city:"casablanca", cat:"national-parks",    address:"Boulevard Mohammed V, Casablanca",                 fb:[33.5908,-7.6254], featured:false, rating:4.1, reviews:2100  },
  { wiki:"Villa des Arts de Casablanca", city:"casablanca", cat:"contemporary-art",  address:"316 Boulevard Brahim Roudani, Casablanca",         fb:[33.5893,-7.6156], featured:false, rating:4.2, reviews:1400  },
  { wiki:"Twin Center, Casablanca",      city:"casablanca", cat:"medinas",           address:"Angle Bd Zerktouni et Al Massira, Casablanca",     fb:[33.5778,-7.6409], featured:false, rating:4.0, reviews:1800  },

  // ─── MARRAKECH ────────────────────────────────────────────────────────────
  { wiki:"Djemaa el-Fna",               city:"marrakech",  cat:"medinas",           address:"Place Jemaa el-Fna, Médina, Marrakech",           fb:[31.6258,-7.9897], featured:true,  rating:4.9, reviews:52000 },
  { wiki:"Koutoubia Mosque",            city:"marrakech",  cat:"mosques",           address:"Avenue Mohammed V, Marrakech",                    fb:[31.6238,-7.9942], featured:true,  rating:4.8, reviews:19000 },
  { wiki:"Bahia Palace",                city:"marrakech",  cat:"palaces-kasbahs",   address:"Rue Riad Zitoun el Jedid, Médina, Marrakech",     fb:[31.6209,-7.9816], featured:true,  rating:4.7, reviews:13200 },
  { wiki:"El Badi Palace",              city:"marrakech",  cat:"palaces-kasbahs",   address:"Ksibat Nhass, Médina, Marrakech",                 fb:[31.6177,-7.9878], featured:false, rating:4.5, reviews:7800  },
  { wiki:"Saadian Tombs",               city:"marrakech",  cat:"mausoleums",        address:"Rue de la Kasbah, Médina, Marrakech",             fb:[31.6169,-7.9901], featured:false, rating:4.6, reviews:9900  },
  { wiki:"Ben Youssef Madrasa",         city:"marrakech",  cat:"medersas",          address:"Ben Youssef, Médina, Marrakech",                  fb:[31.6335,-7.9875], featured:true,  rating:4.7, reviews:11000 },
  { wiki:"Majorelle Garden",            city:"marrakech",  cat:"national-parks",    address:"Rue Yves Saint Laurent, Guéliz, Marrakech",        fb:[31.6425,-8.0033], featured:true,  rating:4.8, reviews:22000 },
  { wiki:"Menara Gardens",              city:"marrakech",  cat:"national-parks",    address:"Avenue de la Menara, Marrakech",                  fb:[31.6059,-8.0262], featured:false, rating:4.4, reviews:6200  },
  { wiki:"Marrakesh Museum",            city:"marrakech",  cat:"art-museums",       address:"Place Ben Youssef, Médina, Marrakech",            fb:[31.6329,-7.9876], featured:false, rating:4.5, reviews:4800  },
  { wiki:"Dar Si Said Museum",          city:"marrakech",  cat:"craft-museums",     address:"Derb Si Said, Médina, Marrakech",                 fb:[31.6217,-7.9821], featured:false, rating:4.4, reviews:3900  },
  { wiki:"Agdal Gardens",               city:"marrakech",  cat:"national-parks",    address:"Agdal, Marrakech",                               fb:[31.5974,-7.9906], featured:false, rating:4.3, reviews:2800  },
  { wiki:"Maison de la Photographie de Marrakech", city:"marrakech", cat:"art-museums", address:"46 Rue Ahal Fes, Médina, Marrakech",         fb:[31.6325,-7.9872], featured:false, rating:4.5, reviews:2600  },

  // ─── FES ──────────────────────────────────────────────────────────────────
  { wiki:"Al-Qarawiyyin",               city:"fes",        cat:"mosques",           address:"Rue Al Qarawiyyin, Fès",                         fb:[34.0648,-4.9739], featured:true,  rating:4.8, reviews:14000 },
  { wiki:"Fes el Bali",                 city:"fes",        cat:"medinas",           address:"Médina, Fès el-Bali",                            fb:[34.0648,-4.9739], featured:true,  rating:4.9, reviews:21000 },
  { wiki:"Bou Inania Madrasa",          city:"fes",        cat:"medersas",          address:"Talaa Kebira, Fès",                              fb:[34.0637,-4.9770], featured:true,  rating:4.7, reviews:8200  },
  { wiki:"Chouara Tannery",             city:"fes",        cat:"artisan-workshops", address:"Hay Lablida, Fès",                               fb:[34.0649,-4.9679], featured:true,  rating:4.7, reviews:17000 },
  { wiki:"Zawiya of Moulay Idris II",   city:"fes",        cat:"mosques",           address:"Rue Zawiya, Fès el-Bali",                        fb:[34.0644,-4.9741], featured:false, rating:4.6, reviews:4200  },
  { wiki:"Dar Batha",                   city:"fes",        cat:"craft-museums",     address:"Place de l'Istiqlal, Fès",                       fb:[34.0627,-4.9778], featured:false, rating:4.4, reviews:2900  },
  { wiki:"Bab Bou Jeloud",              city:"fes",        cat:"medinas",           address:"Bab Bou Jeloud, Fès",                            fb:[34.0641,-4.9785], featured:false, rating:4.6, reviews:7300  },
  { wiki:"Marinid Tombs",               city:"fes",        cat:"mausoleums",        address:"Borj Nord, Fès",                                 fb:[34.0680,-4.9798], featured:false, rating:4.3, reviews:3200  },
  { wiki:"Nejjarine Museum of Wooden Arts and Crafts", city:"fes", cat:"craft-museums", address:"Place Nejjarine, Fès",                      fb:[34.0646,-4.9734], featured:false, rating:4.5, reviews:4100  },
  { wiki:"Al-Attarine Madrasa",         city:"fes",        cat:"medersas",          address:"Fès el-Bali",                                   fb:[34.0641,-4.9744], featured:false, rating:4.5, reviews:3600  },

  // ─── RABAT ────────────────────────────────────────────────────────────────
  { wiki:"Hassan Tower",                city:"rabat",      cat:"mausoleums",        address:"Avenue Moulay Hassan, Rabat",                    fb:[34.0249,-6.8223], featured:true,  rating:4.8, reviews:18000 },
  { wiki:"Kasbah of the Udayas",        city:"rabat",      cat:"palaces-kasbahs",   address:"Kasbah des Oudayas, Rabat",                      fb:[34.0322,-6.8353], featured:true,  rating:4.7, reviews:11000 },
  { wiki:"Mausoleum of Mohammed V",     city:"rabat",      cat:"mausoleums",        address:"Place Hassan II, Rabat",                         fb:[34.0248,-6.8226], featured:true,  rating:4.8, reviews:15000 },
  { wiki:"Chellah",                     city:"rabat",      cat:"roman-ruins",       address:"Avenue Yacoub El Mansour, Rabat",                fb:[33.9963,-6.8296], featured:false, rating:4.5, reviews:5600  },
  { wiki:"Archaeological Museum of Rabat", city:"rabat",   cat:"history-museums",   address:"23 Rue Brihi, Rabat",                            fb:[34.0133,-6.8370], featured:false, rating:4.3, reviews:2800  },
  { wiki:"Mohammed VI Museum of Modern and Contemporary Art", city:"rabat", cat:"art-museums", address:"Avenue Mohammed VI, Rabat",           fb:[34.0210,-6.8349], featured:false, rating:4.6, reviews:4500  },
  { wiki:"Andalusian Gardens, Rabat",   city:"rabat",      cat:"national-parks",    address:"Kasbah des Oudayas, Rabat",                      fb:[34.0320,-6.8355], featured:false, rating:4.5, reviews:3100  },

  // ─── TANGER ───────────────────────────────────────────────────────────────
  { wiki:"Cap Spartel",                 city:"tangier",     cat:"sunset-spots",      address:"Cap Spartel, Tanger",                            fb:[35.7877,-5.9258], featured:true,  rating:4.7, reviews:8900  },
  { wiki:"Cave of Hercules",            city:"tangier",     cat:"mountains",         address:"Route du Cap Spartel, Tanger",                   fb:[35.7819,-5.9234], featured:false, rating:4.5, reviews:7200  },
  { wiki:"Tangier American Legation",  city:"tangier",     cat:"history-museums",   address:"8 Zankat America, Tanger",                       fb:[35.7793,-5.8119], featured:false, rating:4.4, reviews:2100  },
  { wiki:"Grand Socco",                city:"tangier",     cat:"medinas",           address:"Place du Grand Socco, Tanger",                   fb:[35.7795,-5.8106], featured:false, rating:4.3, reviews:4400  },
  { wiki:"Kasbah, Tangier",            city:"tangier",     cat:"palaces-kasbahs",   address:"Kasbah, Tanger",                                 fb:[35.7826,-5.8121], featured:false, rating:4.4, reviews:3800  },
  { wiki:"Medina of Tangier",          city:"tangier",     cat:"medinas",           address:"Médina, Tanger",                                 fb:[35.7800,-5.8100], featured:false, rating:4.5, reviews:5500  },
  { wiki:"Café Hafa",                   city:"tangier",     cat:"rooftop-cafes",     address:"Avenue Hafa, Tanger",                            fb:[35.7992,-5.8172], featured:false, rating:4.6, reviews:3200  },

  // ─── MEKNES ───────────────────────────────────────────────────────────────
  { wiki:"Bab Mansour",                 city:"meknes",     cat:"medinas",           address:"Place Lalla Aouda, Meknès",                      fb:[33.8942,-5.5598], featured:true,  rating:4.7, reviews:7800  },
  { wiki:"Mausoleum of Moulay Ismail",  city:"meknes",     cat:"mausoleums",        address:"Bab Filala, Meknès",                             fb:[33.8934,-5.5620], featured:true,  rating:4.6, reviews:6200  },
  { wiki:"Heri es-Souani",              city:"meknes",     cat:"palaces-kasbahs",   address:"Avenue Moulay Ismail, Meknès",                   fb:[33.8891,-5.5538], featured:false, rating:4.4, reviews:3100  },
  { wiki:"Volubilis",                   city:"meknes",     cat:"roman-ruins",       address:"Volubilis, près de Meknès",                      fb:[34.0728,-5.5556], featured:true,  rating:4.8, reviews:11000 },
  { wiki:"Bou Inania Madrasa, Meknès",  city:"meknes",     cat:"medersas",          address:"Médina, Meknès",                                 fb:[33.8955,-5.5617], featured:false, rating:4.5, reviews:2800  },
  { wiki:"Dar Jamai Museum",            city:"meknes",     cat:"craft-museums",     address:"Place Lalla Aouda, Meknès",                      fb:[33.8940,-5.5601], featured:false, rating:4.4, reviews:2100  },

  // ─── CHEFCHAOUEN ──────────────────────────────────────────────────────────
  { wiki:"Chefchaouen",                 city:"chefchaouen",cat:"medinas",           address:"Médina, Chefchaouen",                            fb:[35.1699,-5.2694], featured:true,  rating:4.9, reviews:28000 },
  { wiki:"Kasbah of Chefchaouen",       city:"chefchaouen",cat:"palaces-kasbahs",   address:"Place Outa el Hammam, Chefchaouen",              fb:[35.1705,-5.2682], featured:false, rating:4.6, reviews:7500  },
  { wiki:"Ras El Maa",                  city:"chefchaouen",cat:"waterfalls",        address:"Ras El Maa, Chefchaouen",                        fb:[35.1721,-5.2612], featured:false, rating:4.7, reviews:5300  },
  { wiki:"Talassemtane National Park",  city:"chefchaouen",cat:"national-parks",    address:"Talassemtane, Chefchaouen",                      fb:[35.0800,-5.1800], featured:false, rating:4.6, reviews:2800  },

  // ─── ESSAOUIRA ────────────────────────────────────────────────────────────
  { wiki:"Essaouira",                   city:"essaouira",  cat:"medinas",           address:"Médina, Essaouira",                              fb:[31.5085,-9.7595], featured:true,  rating:4.8, reviews:19000 },
  { wiki:"Skala de la Ville",           city:"essaouira",  cat:"medinas",           address:"Rue de la Skala, Essaouira",                     fb:[31.5133,-9.7706], featured:false, rating:4.7, reviews:9200  },
  { wiki:"Sidi Mohammed Ben Abdallah Museum", city:"essaouira", cat:"history-museums", address:"Rue Laalouj, Essaouira",                     fb:[31.5072,-9.7587], featured:false, rating:4.4, reviews:2300  },
  { wiki:"Essaouira Beach",             city:"essaouira",  cat:"surf-spots",        address:"Plage d'Essaouira, Essaouira",                   fb:[31.5000,-9.7700], featured:false, rating:4.6, reviews:8100  },

  // ─── AGADIR ───────────────────────────────────────────────────────────────
  { wiki:"Agadir Beach",                city:"agadir",     cat:"atlantic-beaches",  address:"Plage d'Agadir, Agadir",                         fb:[30.4079,-9.6027], featured:true,  rating:4.7, reviews:22000 },
  { wiki:"Agadir Oufella",              city:"agadir",     cat:"palaces-kasbahs",   address:"Agadir Oufella, Agadir",                         fb:[30.4394,-9.6015], featured:false, rating:4.5, reviews:5800  },
  { wiki:"Souk El Had d'Agadir",        city:"agadir",     cat:"souks",             address:"Avenue du 29 Février, Agadir",                   fb:[30.4181,-9.5948], featured:false, rating:4.4, reviews:4200  },
  { wiki:"Vallée des Oiseaux, Agadir",  city:"agadir",     cat:"national-parks",    address:"Avenue du Général Kettani, Agadir",              fb:[30.4180,-9.5998], featured:false, rating:4.3, reviews:3100  },

  // ─── OUARZAZATE ───────────────────────────────────────────────────────────
  { wiki:"Ait Benhaddou",               city:"ouarzazate", cat:"medinas",           address:"Aït Benhaddou, Ouarzazate",                      fb:[31.0472,-7.1289], featured:true,  rating:4.9, reviews:19000 },
  { wiki:"Taourirt Kasbah",             city:"ouarzazate", cat:"palaces-kasbahs",   address:"Avenue Mohammed V, Ouarzazate",                  fb:[30.9190,-6.8967], featured:true,  rating:4.7, reviews:8200  },
  { wiki:"Atlas Corporation Studios",   city:"ouarzazate", cat:"city-tours",        address:"Avenue Mohammed VI, Ouarzazate",                 fb:[30.9197,-6.9146], featured:false, rating:4.5, reviews:6100  },
  { wiki:"Fint Oasis",                  city:"ouarzazate", cat:"mountains",         address:"Oasis de Fint, Ouarzazate",                      fb:[30.9100,-6.8500], featured:false, rating:4.6, reviews:2800  },

  // ─── MERZOUGA ─────────────────────────────────────────────────────────────
  { wiki:"Erg Chebbi",                  city:"merzouga",   cat:"sand-dunes",        address:"Erg Chebbi, Merzouga",                           fb:[31.1500,-3.9700], featured:true,  rating:4.9, reviews:24000 },
  { wiki:"Merzouga",                    city:"merzouga",   cat:"camel-trekking",    address:"Merzouga, Maroc",                                fb:[31.0800,-4.0100], featured:false, rating:4.7, reviews:9800  },

  // ─── IFRANE ───────────────────────────────────────────────────────────────
  { wiki:"Ifrane National Park",        city:"ifrane",     cat:"national-parks",    address:"Ifrane National Park, Ifrane",                   fb:[33.5228,-5.1067], featured:true,  rating:4.7, reviews:5800  },
  { wiki:"Ifrane",                      city:"ifrane",     cat:"mountains",         address:"Ifrane, Maroc",                                  fb:[33.5333,-5.1000], featured:false, rating:4.6, reviews:4100  },
  { wiki:"Lac Dayet Aoua",              city:"ifrane",     cat:"waterfalls",        address:"Lac Dayet Aoua, près d'Ifrane",                  fb:[33.5500,-5.0700], featured:false, rating:4.5, reviews:2200  },

  // ─── TETOUAN ──────────────────────────────────────────────────────────────
  { wiki:"Medina of Tétouan",           city:"tetouan",    cat:"medinas",           address:"Médina, Tétouan",                                fb:[35.5699,-5.3714], featured:true,  rating:4.7, reviews:7800  },
  { wiki:"Archaeological Museum of Tetouan", city:"tetouan", cat:"history-museums", address:"Tétouan",                                       fb:[35.5713,-5.3676], featured:false, rating:4.3, reviews:1900  },

  // ─── EL-JADIDA ────────────────────────────────────────────────────────────
  { wiki:"Portuguese Cistern, El Jadida", city:"el-jadida", cat:"roman-ruins",     address:"Médina Portugaise, El Jadida",                   fb:[33.2498,-8.5043], featured:true,  rating:4.6, reviews:4800  },
  { wiki:"El Jadida",                   city:"el-jadida",  cat:"medinas",           address:"El Jadida, Maroc",                               fb:[33.2549,-8.5080], featured:false, rating:4.4, reviews:3200  },
];

const TOTAL = CATALOGUE.length;
const DRY   = process.argv.includes("--dry-run");

// ─────────────────────────────────────────────────────────────────────────────
//  Network helpers
// ─────────────────────────────────────────────────────────────────────────────
function fetchWiki(title, attempt = 0) {
  return new Promise((resolve) => {
    const enc = encodeURIComponent(title.replace(/\s/g, "_"));
    const opts = {
      hostname: "en.wikipedia.org",
      path:     `/api/rest_v1/page/summary/${enc}`,
      headers:  { "User-Agent": "CityGuideV1/1.0", Accept: "application/json" },
    };
    const req = https.get(opts, (res) => {
      let raw = "";
      res.on("data", (ch) => (raw += ch));
      res.on("end", () => {
        // 429 = rate-limited; 5xx = server error → retry with backoff
        if (res.statusCode === 429 || res.statusCode >= 500) {
          if (attempt < 3) {
            const wait = 3000 + attempt * 2000;
            setTimeout(() => fetchWiki(title, attempt + 1).then(resolve), wait);
          } else resolve(null);
          return;
        }
        let data;
        try { data = JSON.parse(raw); } catch {
          // Plain-text rate-limit body ("You are making too many requests...")
          if (attempt < 3) {
            const wait = 3000 + attempt * 2000;
            setTimeout(() => fetchWiki(title, attempt + 1).then(resolve), wait);
          } else resolve(null);
          return;
        }
        resolve(data);
      });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(12000, () => { req.destroy(); resolve(null); });
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────
function slugify(s) {
  return s.toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function truncate(text, max = 480) {
  if (!text) return "";
  const clean = text.replace(/\n/g, " ").trim();
  const sents = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  let out = "";
  for (const s of sents) {
    if ((out + s).length > max) break;
    out += s;
  }
  return out.trim() || clean.slice(0, max) + "…";
}

function buildEntry(entry, wiki, image, lat, lng) {
  const title = wiki?.title || entry.wiki;
  const desc  = truncate(wiki?.extract);
  return {
    name:          title,
    slug:          slugify(title),
    city:          entry.city,
    category:      entry.cat,
    description:   desc || `${title} is a landmark in ${entry.city}, Morocco.`,
    address:       entry.address || "",
    images:        image ? [image] : [],
    location:      { type: "Point", coordinates: [+lng.toFixed(6), +lat.toFixed(6)] },
    priceRange:    "",
    isFeatured:    entry.featured  || false,
    averageRating: entry.rating    || 0,
    reviewCount:   entry.reviews   || 0,
    // kept for human review in output file, ignored by seed.js
    _src: image || "(no image — add manually)",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Header / Footer renders
// ─────────────────────────────────────────────────────────────────────────────
function printHeader() {
  const cities = [...new Set(CATALOGUE.map(p => p.city))].length;
  writeln();
  writeln(c.bold("  ╔══════════════════════════════════════════════════════════╗"));
  writeln(c.bold("  ║") + c.cyan(c.bold("  🌍  City Guide — Wikipedia Place Fetcher                ")) + c.bold("║"));
  writeln(c.bold("  ║") + c.gray(`     Fetching ${TOTAL} places · ${cities} cities · real images + GPS      `) + c.bold("║"));
  writeln(c.bold("  ╚══════════════════════════════════════════════════════════╝"));
  if (DRY) writeln(c.yellow("\n  ⚠  DRY RUN — no file will be written\n"));
  writeln();
}

function printCityHeader(city, count) {
  const label = `  ─── ${city.toUpperCase()} (${count} places)`;
  writeln(c.cyan(label) + c.gray(" " + "─".repeat(Math.max(0, 58 - label.length))));
}

function printStats(done, ok, noImg, notFound) {
  if (!isTTY) return;
  const bar  = progressBar(done, TOTAL);
  const stat = [
    c.green(`✓ ${ok} ok`),
    c.yellow(`⚠ ${noImg} no-img`),
    c.red(`✗ ${notFound} not-found`),
  ].join("   ");
  write(A.clrLine + A.col0 + bar + "\n");
  write(A.clrLine + A.col0 + "  " + stat + "\n");
}

function clearStats() {
  if (isTTY) write(A.up(2));
}

function printSummary(done, ok, noImg, notFound, elapsed, outPath) {
  writeln();
  writeln(c.bold("  ══════════════════════════════════════════════════════════"));
  writeln();
  if (notFound === 0 && noImg === 0) {
    writeln(c.green(c.bold("  ✅  All places fetched successfully!")));
  } else {
    writeln(c.green(c.bold("  ✅  Done")) + c.gray(` in ${(elapsed / 1000).toFixed(1)}s`));
  }
  writeln();
  writeln(c.bold("  Results:"));
  writeln(`    ${c.green("✓")}  ${c.bold(String(ok).padStart(3))}  with real Wikipedia image`);
  writeln(`    ${c.yellow("⚠")}  ${c.bold(String(noImg).padStart(3))}  no image found  ${c.dim("(add URL manually)")} `);
  writeln(`    ${c.red("✗")}  ${c.bold(String(notFound).padStart(3))}  article not found ${c.dim("(used fallback GPS)")}`);
  writeln();
  if (!DRY) {
    writeln(c.bold("  Output file:"));
    writeln(`    ${c.cyan(outPath)}`);
    writeln();
    writeln(c.bold("  Next steps:"));
    writeln(`    ${c.gray("1.")} Review ${c.cyan("places-enriched.js")} — spot-check a few images`);
    writeln(`    ${c.gray("2.")} ${c.dim("copy backend\\scripts\\seeders\\data\\places-enriched.js")}`);
    writeln(`         ${c.dim("     backend\\scripts\\seeders\\data\\places.js")}`);
    writeln(`    ${c.gray("3.")} ${c.cyan("node backend/scripts/seeders/seed.js")}`);
  }
  writeln();
  writeln(c.bold("  ══════════════════════════════════════════════════════════"));
  writeln();
}

// ─────────────────────────────────────────────────────────────────────────────
//  Output file generator
// ─────────────────────────────────────────────────────────────────────────────
function generateJS(places) {
  const cityGroups = {};
  for (const p of places) {
    (cityGroups[p.city] = cityGroups[p.city] || []).push(p);
  }

  const lines = [
    `// ─────────────────────────────────────────────────────────────────────────────`,
    `//  places-enriched.js — auto-generated by fetch-wiki-places.js`,
    `//  Date      : ${new Date().toISOString().slice(0, 10)}`,
    `//  Images    : real Wikimedia Commons URLs from Wikipedia REST API`,
    `//  GPS       : from Wikipedia geo-tags (fallback = curated coords)`,
    `//  Places    : ${places.length} across ${Object.keys(cityGroups).length} cities`,
    `// ─────────────────────────────────────────────────────────────────────────────`,
    ``,
    `module.exports = [`,
  ];

  for (const [city, list] of Object.entries(cityGroups)) {
    lines.push(``, `  // ${"═".repeat(68)}`, `  //  ${city.toUpperCase()}  (${list.length} places)`, `  // ${"═".repeat(68)}`, ``);
    for (const p of list) {
      const { _src, ...clean } = p;
      lines.push(
        `  {`,
        `    name:     ${JSON.stringify(clean.name)},`,
        `    slug:     ${JSON.stringify(clean.slug)},`,
        `    city:     ${JSON.stringify(clean.city)},`,
        `    category: ${JSON.stringify(clean.category)},`,
        `    description: ${JSON.stringify(clean.description)},`,
        `    address:  ${JSON.stringify(clean.address)},`,
        `    images:   ${JSON.stringify(clean.images)},`,
        `    // ${_src}`,
        `    location: { type: "Point", coordinates: [${clean.location.coordinates}] },`,
        `    priceRange: "", isFeatured: ${clean.isFeatured}, averageRating: ${clean.averageRating}, reviewCount: ${clean.reviewCount},`,
        `  },`,
      );
    }
  }

  lines.push(`];`, ``);
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  printHeader();

  const results = [];
  let ok = 0, noImg = 0, notFound = 0, done = 0;
  const t0 = Date.now();

  // Group by city to print city headers
  const cityOrder = [];
  const cityMap   = {};
  for (const e of CATALOGUE) {
    if (!cityMap[e.city]) { cityOrder.push(e.city); cityMap[e.city] = []; }
    cityMap[e.city].push(e);
  }

  // Print 2 blank lines for the stats block (we'll overwrite them live)
  if (isTTY) { writeln(); writeln(); }

  for (const city of cityOrder) {
    const entries = cityMap[city];

    // Clear stats, print city header, reprint stats underneath
    if (isTTY) clearStats();
    printCityHeader(city, entries.length);
    if (isTTY) { writeln(); writeln(); } // reserve 2 lines for stats

    for (const entry of entries) {
      // ── Spinner ───────────────────────────────────────────────────────────
      const label = `[${String(done + 1).padStart(3)}/${TOTAL}] ${entry.wiki}`;
      if (isTTY) clearStats();
      spinStart(label);

      const wiki  = DRY ? null : await fetchWiki(entry.wiki);
      spinStop();

      // ── Process result ────────────────────────────────────────────────────
      const image    = wiki?.originalimage?.source || wiki?.thumbnail?.source || null;
      const lat      = wiki?.coordinates?.lat  ?? entry.fb[0];
      const lng      = wiki?.coordinates?.lon  ?? entry.fb[1];
      const gotWiki  = !!wiki && wiki.type !== "disambiguation" && !!wiki.extract;
      const usedFb   = !wiki?.coordinates;

      // Status icon + line
      let icon, status;
      if (!gotWiki) {
        icon   = c.red("✗");
        status = c.red("not found") + c.dim(" · fallback GPS");
        notFound++;
      } else if (!image) {
        icon   = c.yellow("⚠");
        status = c.yellow("no image") + c.dim(usedFb ? " · fallback GPS" : " · wiki GPS");
        noImg++;
        ok++;
      } else {
        icon   = c.green("✓");
        status = c.green("image ✓") + c.dim(usedFb ? " · fallback GPS" : " · wiki GPS");
        ok++;
      }

      const nameCol  = (entry.wiki).padEnd(45);
      writeln(`  ${icon}  ${c.dim(`[${String(done + 1).padStart(3)}/${TOTAL}]`)} ${nameCol}  ${status}`);

      results.push(buildEntry(entry, wiki, image, lat, lng));
      done++;

      // ── Live stats ────────────────────────────────────────────────────────
      if (isTTY) {
        printStats(done, ok, noImg, notFound);
      }

      if (!DRY) await sleep(1100);
    }
  }

  // ── Write output ───────────────────────────────────────────────────────────
  const outPath = path.resolve(__dirname, "seeders/data/places-enriched.js");
  if (!DRY) {
    fs.writeFileSync(outPath, generateJS(results), "utf8");
  }

  printSummary(done, ok, noImg, notFound, Date.now() - t0, outPath);
}

main().catch((err) => {
  spinStop();
  writeln(c.red(`\n  ✗  Fatal error: ${err.message}`));
  process.exit(1);
});
