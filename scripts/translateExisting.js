require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const mongoose        = require("mongoose");
const Place           = require("../models/Place");
const City            = require("../models/City");
const Category        = require("../models/Category");
const Event           = require("../models/Event");
const { translateFields } = require("../services/translate.service");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BATCH = 50;

const COLLECTIONS = [
  { Model: Place,    fields: ["name", "description", "address"], label: "Places"     },
  { Model: City,     fields: ["name", "region"],                 label: "Cities"     },
  { Model: Category, fields: ["name"],                           label: "Categories" },
  { Model: Event,    fields: ["title", "description"],           label: "Events"     },
];

const translateCollection = async ({ Model, fields, label }) => {
  const docs = await Model.find({ translationStatus: { $ne: "done" } }).lean();
  console.log(`\n[${label}] ${docs.length} document(s) à traduire`);

  if (docs.length === 0) return;

  let done = 0;
  let failed = 0;

  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH);

    await Promise.all(
      batch.map(async (doc) => {
        try {
          const toTranslate = {};
          fields.forEach((f) => { if (doc[f]) toTranslate[f] = doc[f]; });

          if (Object.keys(toTranslate).length === 0) {
            await Model.findByIdAndUpdate(doc._id, { translationStatus: "done" });
            done++;
            return;
          }

          const translations = await translateFields(toTranslate, doc.sourceLang || "fr");
          await Model.findByIdAndUpdate(doc._id, { translations, translationStatus: "done" });
          done++;
        } catch (err) {
          await Model.findByIdAndUpdate(doc._id, { translationStatus: "failed" });
          failed++;
          console.error(`  ✗ ${doc._id}: ${err.message}`);
        }
      })
    );

    console.log(`  [${label}] ${Math.min(i + BATCH, docs.length)}/${docs.length} traités`);
    if (i + BATCH < docs.length) await sleep(100);
  }

  console.log(`  ✓ ${done} traduits  ✗ ${failed} échoués`);
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✓ Connecté à MongoDB\n");

  for (const config of COLLECTIONS) {
    await translateCollection(config);
  }

  await mongoose.disconnect();
  console.log("\n✓ Migration terminée");
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
