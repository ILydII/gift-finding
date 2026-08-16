import { prisma } from "@/lib/prisma";
import { RELATIONSHIP_CLOSENESS } from "@/lib/constants";
import type {
  RecommendationInput,
  InterestSignal,
  WishlistSignal,
} from "@/lib/recommendation";

// Impure counterpart to the pure engine (src/lib/recommendation.ts): reads a
// receiver's three signal streams from the DB and shapes them into the engine's
// RecommendationInput. The §4.4 aggregation itself lives in the engine so it
// stays unit-testable; this file only gathers the raw per-tag material.

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(d: Date): number {
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / DAY_MS));
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** The friend edge must belong to the requesting Giver (they added this person). */
export async function giverOwnsReceiver(
  giverId: string,
  receiverId: string,
): Promise<boolean> {
  const edge = await prisma.friendEdge.findUnique({
    where: { userAId_userBId: { userAId: giverId, userBId: receiverId } },
  });
  return Boolean(edge);
}

export async function buildRecommendationInput(
  giverId: string,
  receiverId: string,
  opts: {
    occasion?: string | null;
    budgetOverride?: number | null;
    styleOverride?: { philosophyTags?: string[]; riskTolerance?: string | null } | null;
  },
): Promise<RecommendationInput> {
  const [
    receiver,
    wishlist,
    interests,
    rankings,
    relationship,
    note,
    milestones,
    style,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: receiverId } }),
    prisma.wishlistItem.findMany({
      where: { ownerId: receiverId, visibility: "public" },
    }),
    prisma.interest.findMany({ where: { ownerId: receiverId } }),
    prisma.interestRanking.findMany({ where: { subjectId: receiverId } }),
    prisma.relationshipContext.findUnique({
      where: { rankerId_subjectId: { rankerId: giverId, subjectId: receiverId } },
    }),
    prisma.friendNote.findFirst({
      where: { ownerId: giverId, subjectId: receiverId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.milestoneEntry.findMany({
      where: { ownerId: giverId, subjectId: receiverId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.giftingStyleProfile.findUnique({ where: { userId: giverId } }),
  ]);

  // Resolve taxonomy labels/categories for the slugs in play.
  const slugs = [
    ...new Set(interests.map((i) => i.taxonomyTag).filter((s): s is string => Boolean(s))),
  ];
  const tags = slugs.length
    ? await prisma.interestTag.findMany({ where: { slug: { in: slugs } } })
    : [];
  const tagMeta = new Map(tags.map((t) => [t.slug, { label: t.label, category: t.category }]));

  // ---- Aggregate the three streams per interest tag (raw material for §4.4) ----
  // A "tag" groups every Interest row (across contributors) that shares the same
  // taxonomy slug (or free-text). Rankings attach via interestId.
  const interestById = new Map(interests.map((i) => [i.id, i]));

  type Acc = {
    tag: string;
    label: string;
    category: string | null;
    receiverSelf: { present: boolean; confidence?: "big_passion" | "casual" | null };
    requestingGiver: { present: boolean; rankValue: number | null };
    community: { rankValue: number | null }[];
    latest: Date;
  };
  const byTag = new Map<string, Acc>();

  const keyFor = (i: (typeof interests)[number]): string =>
    i.taxonomyTag ?? `free:${(i.freeText ?? "").toLowerCase()}`;

  for (const i of interests) {
    const key = keyFor(i);
    const meta = i.taxonomyTag ? tagMeta.get(i.taxonomyTag) : undefined;
    const label = meta?.label ?? i.freeText ?? i.taxonomyTag ?? "an interest";
    const category = meta?.category ?? null;
    let acc = byTag.get(key);
    if (!acc) {
      acc = {
        tag: key,
        label,
        category,
        receiverSelf: { present: false, confidence: null },
        requestingGiver: { present: false, rankValue: null },
        community: [],
        latest: i.updatedAt,
      };
      byTag.set(key, acc);
    }
    if (i.updatedAt > acc.latest) acc.latest = i.updatedAt;
    // Receiver self-tagged this interest (contributed it about themselves).
    if (i.contributedById === receiverId) {
      acc.receiverSelf.present = true;
      acc.receiverSelf.confidence =
        (i.selfConfidenceFlag as "big_passion" | "casual" | null) ?? acc.receiverSelf.confidence;
    }
    // The requesting Giver contributed this interest (even before ranking it).
    if (i.contributedById === giverId) acc.requestingGiver.present = true;
  }

  for (const r of rankings) {
    const interest = interestById.get(r.interestId);
    if (!interest) continue;
    const key = keyFor(interest);
    const acc = byTag.get(key);
    if (!acc) continue;
    if (r.updatedAt > acc.latest) acc.latest = r.updatedAt;

    if (r.rankerId === giverId) {
      acc.requestingGiver.present = true;
      // A "not sure" giver rank stays present but carries no ordinal weight.
      acc.requestingGiver.rankValue = r.confidenceUnsure ? null : r.rankValue;
    } else if (r.rankerId !== receiverId) {
      // Community — abstentions ("not sure") are excluded from aggregation (§4.3).
      if (!r.confidenceUnsure) acc.community.push({ rankValue: r.rankValue });
    }
  }

  const interestSignals: InterestSignal[] = [...byTag.values()]
    // Drop tags that are pure community abstentions with no first-party signal.
    .filter(
      (a) =>
        a.receiverSelf.present ||
        a.requestingGiver.present ||
        a.community.length > 0,
    )
    .map((a) => ({
      tag: a.tag,
      label: a.label,
      category: a.category,
      receiverSelf: a.receiverSelf.present ? a.receiverSelf : undefined,
      requestingGiver: a.requestingGiver.present ? a.requestingGiver : undefined,
      community: a.community,
      recencyDays: daysSince(a.latest),
    }));

  const wishlistSignals: WishlistSignal[] = wishlist.map((w) => ({
    title: w.title,
    price: w.price,
    link: w.link,
  }));

  // Pull the gift-idea note from a milestone matching this occasion, else the
  // most recent one (BRD Flow 6.2).
  const occ = opts.occasion?.toLowerCase() ?? "";
  const milestone =
    milestones.find((m) => occ && m.occasionLabel.toLowerCase().includes(occ)) ??
    milestones[0];

  const relType = relationship?.relationshipType ?? null;

  // Gifting style: the saved profile is the default, but a per-request override
  // (from the gift-finder form) wins — style/budget belong to the gift, not the account.
  const ov = opts.styleOverride;
  const giverStyle =
    style || ov
      ? {
          philosophyTags: ov?.philosophyTags?.length
            ? ov.philosophyTags
            : style
              ? parseJsonArray(style.philosophyTags)
              : [],
          riskTolerance: ov?.riskTolerance ?? style?.riskTolerance ?? null,
          budgetMin: style?.defaultBudgetMin ?? null,
          budgetMax: style?.defaultBudgetMax ?? null,
        }
      : null;

  return {
    wishlist: wishlistSignals,
    interests: interestSignals,
    receiver: { name: receiver?.name ?? null, birthYear: receiver?.birthYear ?? null },
    giverStyle,
    occasion: opts.occasion ?? null,
    relationship: relType
      ? {
          type: relType,
          closeness: RELATIONSHIP_CLOSENESS[relType] ?? 0.5,
          sharedInterests: parseJsonArray(relationship?.sharedInterests),
        }
      : null,
    giverNote: note?.noteText ?? null,
    giftIdeaNote: milestone?.giftIdeaNote ?? null,
    budgetOverride: opts.budgetOverride ?? null,
  };
}
