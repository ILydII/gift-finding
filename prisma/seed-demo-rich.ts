// Enrich the demo receiver (Alex) with a full spread of signals so the
// recommendation page shows every origin + all four slot types. Idempotent.
// Run: npx tsx prisma/seed-demo-rich.ts   (uses .env DATABASE_URL)
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { buildRecommendationInput } from "@/lib/recommend-data";
import { generateRecommendations } from "@/lib/recommendation";

async function ensureUser(email: string, name: string) {
  return prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name, claimStatus: "claimed" },
  });
}

async function ensureEdge(aId: string, bId: string) {
  await prisma.friendEdge.upsert({
    where: { userAId_userBId: { userAId: aId, userBId: bId } },
    update: { status: "accepted" },
    create: { userAId: aId, userBId: bId, status: "accepted" },
  });
}

async function ensureInterest(
  ownerId: string,
  contributorId: string,
  slug: string,
  selfFlag: string | null = null,
) {
  let it = await prisma.interest.findFirst({
    where: { ownerId, contributedById: contributorId, taxonomyTag: slug },
  });
  if (!it) {
    it = await prisma.interest.create({
      data: { ownerId, contributedById: contributorId, taxonomyTag: slug, selfConfidenceFlag: selfFlag },
    });
  } else if (selfFlag && it.selfConfidenceFlag !== selfFlag) {
    it = await prisma.interest.update({ where: { id: it.id }, data: { selfConfidenceFlag: selfFlag } });
  }
  return it;
}

async function rank(rankerId: string, subjectId: string, interestId: string, rankValue: number) {
  await prisma.interestRanking.upsert({
    where: { rankerId_interestId: { rankerId, interestId } },
    update: { rankValue, confidenceUnsure: false, subjectId, contributedPreOrPost: "post_invite" },
    create: { rankerId, subjectId, interestId, rankValue, confidenceUnsure: false, contributedPreOrPost: "post_invite" },
  });
}

async function contribute(contributorId: string, subjectId: string, entries: [string, number][]) {
  for (const [slug, rv] of entries) {
    const it = await ensureInterest(subjectId, contributorId, slug);
    await rank(contributorId, subjectId, it.id, rv);
  }
}

async function main() {
  const giver = await prisma.user.findUnique({ where: { email: "demo@example.com" } });
  const alex = await prisma.user.findUnique({ where: { email: "alex@example.com" } });
  if (!giver || !alex) throw new Error("Base demo seed missing — run `npm run db:seed` first.");

  // Keep each origin in its own category so the four slots stay distinct:
  //   coffee → wishlist, baking → giver + self, hiking → community, vinyl → community.
  // Drop the giver's pre-seeded espresso + hiking so those categories come from
  // exactly one stream each (and hiking reads as crowd-corroborated, not giver-ranked).
  for (const slug of ["coffee_tea-espresso", "outdoors-hiking"]) {
    const it = await prisma.interest.findFirst({
      where: { ownerId: alex.id, contributedById: giver.id, taxonomyTag: slug },
    });
    if (it) {
      await prisma.interestRanking.deleteMany({ where: { interestId: it.id } });
      await prisma.interest.delete({ where: { id: it.id } });
    }
  }

  // Giver's own rank (Stream B, requesting_giver): baking is the giver's pick.
  await contribute(giver.id, alex.id, [["cooking_food-baking", 1]]);

  // Receiver self-tag (Stream A, receiver_self): Alex's own big passion.
  await ensureInterest(alex.id, alex.id, "cooking_food-baking", "big_passion");

  // Community corroboration (Stream C): three friends independently flag hiking,
  // so the crowd signal is strong and the rationale credits the count.
  const jordan = await ensureUser("jordan@demo.local", "Jordan");
  const riley = await ensureUser("riley@demo.local", "Riley");
  const sam = await ensureUser("sam@demo.local", "Sam");
  for (const c of [jordan, riley, sam]) await ensureEdge(c.id, alex.id);
  await contribute(jordan.id, alex.id, [
    ["outdoors-hiking", 1],
    ["outdoors-camping", 2],
  ]);
  await contribute(riley.id, alex.id, [
    ["outdoors-hiking", 1],
    ["music-vinyl-records", 2],
  ]);
  await contribute(sam.id, alex.id, [
    ["outdoors-hiking", 1],
    ["music-vinyl-records", 2],
  ]);

  // Shared interests: keep only "Hiking" (already covered by community, so no
  // duplicate candidate) — drop "Coffee" so it doesn't collide with the wishlist.
  await prisma.relationshipContext.updateMany({
    where: { rankerId: giver.id, subjectId: alex.id },
    data: { sharedInterests: JSON.stringify(["Hiking"]) },
  });

  // Receiver-declared wishlist item (Stream A certainty).
  const wl = await prisma.wishlistItem.findFirst({
    where: { ownerId: alex.id, title: "Fellow Stagg EKG pour-over kettle" },
  });
  if (!wl) {
    await prisma.wishlistItem.create({
      data: { ownerId: alex.id, title: "Fellow Stagg EKG pour-over kettle", price: 95, visibility: "public" },
    });
  }

  // Giver's private note (Stream B, keyword-matched → personally anchored).
  // Mentions baking only, so hiking's rationale stays credited to the crowd.
  const noteText =
    "Alex has really gotten into baking this year — something for that would land well.";
  const note = await prisma.friendNote.findFirst({ where: { ownerId: giver.id, subjectId: alex.id } });
  if (note) await prisma.friendNote.update({ where: { id: note.id }, data: { noteText } });
  else await prisma.friendNote.create({ data: { ownerId: giver.id, subjectId: alex.id, noteText } });

  // No milestone gift-idea note in this demo — a baking-themed one would
  // duplicate the baking slot. Clear any left over from an earlier run.
  await prisma.milestoneEntry.deleteMany({
    where: { ownerId: giver.id, subjectId: alex.id, occasionLabel: "Birthday" },
  });

  // Verify the resulting recommendation.
  const input = await buildRecommendationInput(giver.id, alex.id, { occasion: "birthday", budgetOverride: null });
  const out = generateRecommendations(input);
  console.log("\n=== Alex — birthday ===");
  out.suggestions.forEach((s, i) =>
    console.log(`  ${i + 1}. [${s.slotType}] ${s.title} ${s.priceEstimate ?? ""} — ${s.rationale} (${s.originTrace.join(", ")})`),
  );
  out.notices.forEach((n) => console.log("   · " + n));
  console.log("\nDemo enriched. Sign in as demo@example.com / password123 → Friends → Get ideas on Alex.");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
