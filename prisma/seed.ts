// Seed the interest taxonomy (FR-5) and a small demo dataset so the app is
// explorable right after `npm run dev`. Idempotent: safe to run repeatedly.
//
// Run via: npm run db:seed
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

// Starter taxonomy — categories + subcategory tags. This is a deliberate
// starter set (~150 tags); the BRD targets 150–300 and flags taxonomy curation
// as ongoing content work with a dedicated owner (Section 13).
const TAXONOMY: Record<string, string[]> = {
  cooking_food: ["Baking", "Grilling & BBQ", "Fermentation", "Cocktails & mixology", "Hot sauce", "Cheese", "Vegan cooking", "Meal prep"],
  coffee_tea: ["Espresso", "Pour-over", "Cold brew", "Loose-leaf tea", "Matcha"],
  outdoors: ["Hiking", "Camping", "Rock climbing", "Kayaking", "Fishing", "Trail running", "Backpacking", "Skiing & snowboarding"],
  gaming: ["PC gaming", "Console gaming", "Retro games", "Tabletop RPGs", "Handheld gaming", "Game streaming"],
  tech_gadgets: ["Smart home", "Wearables", "Drones", "3D printing", "Mechanical keyboards", "Audio gear", "E-readers"],
  music: ["Vinyl records", "Live concerts", "Playing guitar", "Playing piano", "Music production", "Vinyl DJing", "Singing"],
  reading_books: ["Fiction", "Sci-fi & fantasy", "Mystery & thriller", "Poetry", "History", "Graphic novels", "Cookbooks", "Self-development"],
  art_craft: ["Painting", "Pottery & ceramics", "Knitting & crochet", "Calligraphy", "Woodworking", "Embroidery", "Jewelry making", "Candle making"],
  fitness_wellness: ["Yoga", "Running", "Weightlifting", "Cycling", "Pilates", "Meditation", "Rock climbing gym", "Swimming"],
  fashion_style: ["Sneakers", "Watches", "Vintage fashion", "Minimalist style", "Streetwear", "Sustainable fashion"],
  home_decor: ["Candles & scents", "Houseplants", "Ceramics", "Wall art", "Cozy textiles", "Minimalist decor"],
  travel: ["Road trips", "Backpacking abroad", "City breaks", "Camping trips", "Foodie travel", "Beach holidays"],
  gardening: ["Houseplants", "Herb gardening", "Succulents", "Vegetable gardening", "Bonsai"],
  pets: ["Dogs", "Cats", "Aquariums", "Birds", "Small pets"],
  photography: ["Film photography", "Instant cameras", "Landscape photography", "Portrait photography", "Astrophotography"],
  board_games: ["Strategy games", "Party games", "Cooperative games", "Chess", "Puzzles"],
  beauty_grooming: ["Skincare", "Fragrance", "Makeup", "Beard care", "Haircare", "Nail care"],
  movies_tv: ["Film buff", "Anime", "Documentaries", "Classic cinema", "Home theatre"],
  sports: ["Football / soccer", "Basketball", "Tennis", "Golf", "Running events", "Cycling races", "Baseball"],
  science_learning: ["Astronomy", "Languages", "Robotics", "History buff", "Nature & wildlife", "Puzzles & logic"],
  diy_tools: ["Woodworking", "Home improvement", "Electronics tinkering", "Car maintenance", "Leathercraft"],
  collecting: ["Trading cards", "Vinyl records", "Sneakers", "Coins & stamps", "Model kits", "Funko / figures"],
  mindfulness: ["Meditation", "Journaling", "Yoga", "Breathwork", "Tarot & astrology"],
  kids_family: ["Board games", "Arts & crafts", "STEM toys", "Outdoor play", "Story books"],
};

function slugify(category: string, label: string): string {
  const base = label
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${category}-${base}`;
}

async function seedTaxonomy() {
  let count = 0;
  for (const [category, labels] of Object.entries(TAXONOMY)) {
    for (const label of labels) {
      const slug = slugify(category, label);
      await prisma.interestTag.upsert({
        where: { slug },
        update: { label, category },
        create: { slug, label, category },
      });
      count++;
    }
  }
  return count;
}

async function seedDemo() {
  const passwordHash = await bcrypt.hash("password123", 10);

  // Demo Giver (a real, claimed account you can log in as).
  const giver = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      name: "Demo Giver",
      email: "demo@example.com",
      passwordHash,
      claimStatus: "claimed",
    },
  });

  // Demo unclaimed Receiver (created by the Giver adding a target, FR-12).
  const receiver = await prisma.user.upsert({
    where: { email: "alex@example.com" },
    update: {},
    create: {
      name: "Alex (unclaimed)",
      email: "alex@example.com",
      claimStatus: "unclaimed",
    },
  });

  await prisma.friendEdge.upsert({
    where: { userAId_userBId: { userAId: giver.id, userBId: receiver.id } },
    update: {},
    create: { userAId: giver.id, userBId: receiver.id, status: "invited" },
  });

  await prisma.relationshipContext.upsert({
    where: { rankerId_subjectId: { rankerId: giver.id, subjectId: receiver.id } },
    update: {},
    create: {
      rankerId: giver.id,
      subjectId: receiver.id,
      relationshipType: "close_friend",
      sharedInterests: JSON.stringify(["Hiking", "Coffee"]),
    },
  });

  // Pre-invite interest contributions about the receiver (Flow 2 seed data).
  const demoInterests: { category: string; label: string }[] = [
    { category: "coffee_tea", label: "Espresso" },
    { category: "outdoors", label: "Hiking" },
    { category: "cooking_food", label: "Baking" },
  ];
  for (const di of demoInterests) {
    const slug = slugify(di.category, di.label);
    const existing = await prisma.interest.findFirst({
      where: { ownerId: receiver.id, taxonomyTag: slug },
    });
    if (!existing) {
      await prisma.interest.create({
        data: {
          ownerId: receiver.id,
          contributedById: giver.id,
          taxonomyTag: slug,
        },
      });
    }
  }

  return { giver: giver.email, receiver: receiver.email };
}

async function main() {
  const tags = await seedTaxonomy();
  const demo = await seedDemo();
  console.log(`Seeded ${tags} interest tags.`);
  console.log(`Demo login: ${demo.giver} / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
