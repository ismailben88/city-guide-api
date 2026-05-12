require("dotenv").config();
const mongoose = require("mongoose");
const Place = require("../models/Place");
const City = require("../models/City");
const Category = require("../models/Category");

async function seed() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: "cityguide" });
  console.log("Connected to MongoDB");

  const marrakech = await City.findOne({ slug: "marrakech" });
  const fes = await City.findOne({ slug: "fes" });
  const agadir = await City.findOne({ slug: "agadir" });
  const rabat = await City.findOne({ slug: "rabat" });

  const categories = {};
  for (const slug of [
    "tourist-places",
    "restaurants",
    "hotels",
    "cafes",
    "beaches",
    "historical-places",
  ]) {
    const cat = await Category.findOne({ slug });
    if (cat) categories[slug] = cat._id;
  }

  const seedPlaces = [
    {
      name: "Jemaa el-Fnaa",
      slug: "jemaa-el-fnaa",
      categoryId: categories["tourist-places"],
      cityId: marrakech._id,
      description: "The famous bustling square in Marrakech with storytellers, musicians, food stalls, and vibrant atmosphere day and night.",
      address: "Jemaa el-Fnaa, Marrakech",
      averageRating: 4.6,
      reviewCount: 4521,
      isFeatured: true,
      status: "active",
    },
    {
      name: "Majorelle Garden",
      slug: "majorelle-garden",
      categoryId: categories["tourist-places"],
      cityId: marrakech._id,
      description: "Beautiful botanical garden with striking blue buildings, exotic plants, and the Berber Museum.",
      address: "Rue Yves Saint Laurent, Marrakech",
      averageRating: 4.7,
      reviewCount: 3890,
      isFeatured: true,
      status: "active",
    },
    {
      name: "Al Fassia",
      slug: "al-fassia",
      categoryId: categories.restaurants,
      cityId: marrakech._id,
      description: "Renowned traditional Moroccan restaurant run by women, serving authentic tagines and couscous.",
      address: "55 Boulevard Zerktouni, Marrakech",
      averageRating: 4.5,
      reviewCount: 1203,
      isFeatured: true,
      status: "active",
      priceRange: "$$",
    },
    {
      name: "La Mamounia",
      slug: "la-mamounia",
      categoryId: categories.hotels,
      cityId: marrakech._id,
      description: "Iconic luxury palace hotel with stunning gardens, spa, and world-class dining in the heart of Marrakech.",
      address: "Avenue Bab Jdid, Marrakech",
      averageRating: 4.8,
      reviewCount: 2100,
      isFeatured: true,
      status: "active",
      priceRange: "$$$$",
    },
    {
      name: "Café Clock",
      slug: "cafe-clock",
      categoryId: categories.cafes,
      cityId: marrakech._id,
      description: "Unique cultural café offering camel burgers, traditional music, storytelling, and cooking classes.",
      address: "Derb Chtouka, Marrakech",
      averageRating: 4.3,
      reviewCount: 890,
      isFeatured: false,
      status: "active",
      priceRange: "$$",
    },
    {
      name: "Bou Inania Madrasa",
      slug: "bou-inania-madrasa",
      categoryId: categories["historical-places"],
      cityId: fes._id,
      description: "Stunning 14th-century Islamic school with intricate zellij tilework, carved plaster, and cedar wood ceilings.",
      address: "Fes el-Bali, Fès",
      averageRating: 4.6,
      reviewCount: 1567,
      isFeatured: true,
      status: "active",
    },
    {
      name: "Agadir Beach",
      slug: "agadir-beach",
      categoryId: categories.beaches,
      cityId: agadir._id,
      description: "Long sandy crescent beach with promenade, water sports, and stunning Atlantic sunsets.",
      address: "Agadir Bay",
      averageRating: 4.4,
      reviewCount: 2100,
      isFeatured: true,
      status: "active",
    },
    {
      name: "Hassan Tower",
      slug: "hassan-tower",
      categoryId: categories["historical-places"],
      cityId: rabat._id,
      description: "Incomplete 12th-century minaret of an unfinished mosque, now a UNESCO World Heritage site.",
      address: "Rabat",
      averageRating: 4.5,
      reviewCount: 980,
      isFeatured: true,
      status: "active",
    },
    {
      name: "Le Jardin des Saveurs",
      slug: "le-jardin-des-saveurs",
      categoryId: categories.restaurants,
      cityId: agadir._id,
      description: "Elegant restaurant serving Moroccan-French fusion cuisine with a beautiful garden terrace.",
      address: "Agadir",
      averageRating: 4.3,
      reviewCount: 567,
      isFeatured: false,
      status: "active",
      priceRange: "$$$",
    },
  ];

  for (const place of seedPlaces) {
    const existing = await Place.findOne({ slug: place.slug });
    if (!existing) {
      await Place.create(place);
      console.log(`Created: ${place.name}`);
    } else {
      console.log(`Skipped (exists): ${place.name}`);
    }
  }

  console.log("\nSeed complete!");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
