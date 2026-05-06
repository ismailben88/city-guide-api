// ─────────────────────────────────────────────────────────────────────────────
//  patchEvents.js — Met à jour les événements existants avec les champs manquants
//  (ticketPrice, coverImage, description, organizer)
//
//  Usage : node scripts/patchEvents.js
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const mongoose = require("mongoose");
const Event    = require("../models/Event");

const PATCHES = [
  {
    title:       "Festival des Musiques du Monde El Jadida",
    description: "Grand rassemblement de musiciens du monde entier sur la scène de la plage d'El Jadida, mêlant gnaoua, jazz, flamenco et musiques africaines.",
    organizer:   "Ministère de la Culture",
    ticketPrice: 80,
    coverImage:  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&auto=format&fit=crop",
  },
  {
    title:       "Casablanca Food Festival",
    description: "Festival gastronomique rassemblant les meilleurs chefs marocains et internationaux pour célébrer la richesse culinaire du Royaume.",
    organizer:   "Fédération Nationale du Tourisme",
    ticketPrice: 120,
    coverImage:  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop",
  },
  {
    title:       "Nuit des Potiers de Safi",
    description: "Soirée unique où les ateliers de poterie ouvrent leurs portes en nocturne. Démonstrations de tournage, cuisson au bois et exposition-vente.",
    organizer:   "Coopérative Artisanale de Safi",
    ticketPrice: 50,
    coverImage:  "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&auto=format&fit=crop",
  },
  {
    title:       "Moussem de Moulay Idriss Zerhoun",
    description: "Grand pèlerinage annuel en l'honneur du fondateur de Fès, avec processions, fantasias équestres, souks et nuits de musique soufie.",
    organizer:   "Commune de Moulay Idriss",
    ticketPrice: 0,
    coverImage:  "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&auto=format&fit=crop",
  },
  {
    title:       "Festival International du Cinéma de Béni Mellal",
    description: "Festival dédié au cinéma marocain et africain, avec projections en plein air, rencontres avec cinéastes et ateliers de formation.",
    organizer:   "Université Sultan Moulay Slimane",
    ticketPrice: 30,
    coverImage:  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop",
  },
  {
    title:       "Marathon International de Casablanca",
    description: "Course podotable de 42 km traversant les quartiers historiques et modernes de Casablanca, avec catégories élite, amateurs et 10 km.",
    organizer:   "Royal Athletic Club",
    ticketPrice: 200,
    coverImage:  "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&auto=format&fit=crop",
  },
  {
    title:       "Festival de Jazz sur l'Atlantique Safi",
    description: "Festival de jazz en bord de mer avec des artistes de renommée internationale, ateliers musicaux et découverte de la scène jazz marocaine.",
    organizer:   "Institut Français de Safi",
    ticketPrice: 100,
    coverImage:  "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&auto=format&fit=crop",
  },
  {
    title:       "Salon des Arts Traditionnels de Fès",
    description: "Exposition-vente des meilleurs artisans de Fès : dinandiers, babouchiers, relieurs de manuscrits et brodeurs de la médina.",
    organizer:   "Chambre Artisanat Fès",
    ticketPrice: 40,
    coverImage:  "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800&auto=format&fit=crop",
  },
  {
    title:       "Fête des Cerises Sefrou",
    description: "Festival annuel depuis 1969 célébrant la récolte des cerises avec couronnement de la Reine, parades culturelles et animations folkloriques.",
    organizer:   "Province de Sefrou",
    ticketPrice: 0,
    coverImage:  "https://images.unsplash.com/photo-1528821128474-27f963b062bf?w=800&auto=format&fit=crop",
  },
  {
    title:       "Marrakech Biennale d'Art Contemporain",
    description: "Événement d'art contemporain biennal faisant de Marrakech une capitale culturelle mondiale. Installations, performances et expositions dans la médina.",
    organizer:   "Fondation Marrakech Biennale",
    ticketPrice: 60,
    coverImage:  "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&auto=format&fit=crop",
  },
  {
    title:       "Festival Gnaoua Essaouira",
    description: "Événement musical mondial mêlant musique gnaoua mystique et jazz international. 500 000 spectateurs attendus dans la médina d'Essaouira.",
    organizer:   "Association Gnaoua & Musiques",
    ticketPrice: 0,
    coverImage:  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop",
  },
  {
    title:       "Triathlon International d'Agadir",
    description: "Épreuve internationale de triathlon sur le front de mer d'Agadir : natation en mer, vélo et course à pied avec vue sur le Souss.",
    organizer:   "Fédération Royale de Triathlon",
    ticketPrice: 300,
    coverImage:  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop",
  },
  {
    title:       "Rallye du Maroc Meknès-Fès",
    description: "Étape du championnat du monde FIA de rally-raid traversant les plaines de Meknès et les forêts du Moyen Atlas dans un paysage époustouflant.",
    organizer:   "Royal Automobile Club du Maroc",
    ticketPrice: 0,
    coverImage:  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop",
  },
  {
    title:       "Salon du Cheval d'El Jadida",
    description: "Plus grand événement équestre d'Afrique. Fantasias royales, concours hippiques internationaux, exposition de races chevalines et artisanat équestre.",
    organizer:   "Société Royale d'Encouragement du Cheval",
    ticketPrice: 50,
    coverImage:  "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800&auto=format&fit=crop",
  },
  {
    title:       "Festival du Cinéma Africain de Khouribga",
    description: "Festival panafricain dédié au 7e art africain depuis 1977. Compétition officielle, rétrospectives, hommages et découverte du cinéma continental.",
    organizer:   "Centre Cinématographique Marocain",
    ticketPrice: 20,
    coverImage:  "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=800&auto=format&fit=crop",
  },
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: "cityguide" });
  console.log("MongoDB connecté ✓");

  let updated = 0;
  let skipped = 0;

  for (const patch of PATCHES) {
    const result = await Event.updateOne(
      { title: patch.title },
      {
        $set: {
          description: patch.description,
          organizer:   patch.organizer,
          ticketPrice: patch.ticketPrice,
          coverImage:  patch.coverImage,
        },
      }
    );

    if (result.matchedCount === 0) {
      console.warn(`  ⚠  Introuvable : "${patch.title}"`);
      skipped++;
    } else {
      console.log(`  ✓  Mis à jour : "${patch.title}"`);
      updated++;
    }
  }

  console.log(`\n✅  Terminé : ${updated} mis à jour, ${skipped} introuvables`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌  Erreur :", err.message);
  process.exit(1);
});
