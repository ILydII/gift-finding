// -----------------------------------------------------------------------------
// V1 recommendation engine — Processing & Output layer.
//
// Implements docs/PRD-processing-and-output.md:
//   §4.4  origin-weighted cross-stream aggregation (specificity/corroboration
//         outrank volume; five agreeing contributors can't out-vote one
//         specific first-party note)
//   §5    a five-stage pipeline: candidate generation → milestone gate →
//         relationship gate → gifting-style re-rank → final composite score
//   §6    fixed four-slot output (certainty / personally-anchored / 2 diversified)
//   §7    a single-origin, traceable one-line rationale per slot
//
// Pure function: structured signals in, ranked suggestions out. No DB or network
// here so it stays fast (BRD §11: "a few seconds", "heuristic scoring pass") and
// unit-testable. The impure signal-loading lives in src/lib/recommend-data.ts.
//
// Naming (PRD §12 reconciliation): camelCase fields, snake_case enum-like values.
// -----------------------------------------------------------------------------

export type Tier = "low" | "medium" | "high";
export type SlotType = "certainty" | "personally_anchored" | "diversified";

/** Origin streams that can feed a candidate — named for the rationale layer (§7). */
export type OriginStream =
  | "wishlist" // Stream A — receiver-declared item
  | "receiver_self" // Stream A — receiver's own self-tagged interest
  | "requesting_giver" // Stream B — this giver's own rank/interest
  | "giver_note" // Stream B — keyword-matched from the giver's private note
  | "shared_interest" // Stream B — a shared activity for this specific pair
  | "gift_idea_note" // Stream B — the milestone gift-idea note
  | "community" // Stream C — other friends' aggregated rankings
  | "giver_style" // gifting-style influence on the pick
  | "fallback"; // no real signal — honest category-level default

const TIER_RANK: Record<Tier, number> = { low: 0, medium: 1, high: 2 };

// ---------------------------------------------------------------------------
// Inputs (built by the loader). InterestSignal is the *raw* per-tag material;
// §4.4 aggregation happens inside the engine so it stays testable end to end.
// ---------------------------------------------------------------------------

export type InterestSignal = {
  /** Taxonomy slug (e.g. "coffee_tea-espresso") or, for free-text, the raw text. */
  tag: string;
  label: string;
  /** Taxonomy category key (e.g. "coffee_tea"); null for free-text interests. */
  category?: string | null;
  /** The receiver's own self-tag of this interest, if any (Stream A). */
  receiverSelf?: { present: boolean; confidence?: "big_passion" | "casual" | null };
  /** The requesting Giver's own rank of this interest, if any (Stream B). */
  requestingGiver?: { present: boolean; rankValue: number | null };
  /** Other contributors' ranks (Stream C). Abstentions ("not sure") are excluded upstream. */
  community: { rankValue: number | null }[];
  /** Days since the most recent contribution to this tag (recency signal). */
  recencyDays: number;
};

export type WishlistSignal = {
  title: string;
  price?: number | null;
  link?: string | null;
  /** Taxonomy category if the item maps to one — used only for diversity. */
  category?: string | null;
};

export type RecommendationInput = {
  wishlist: WishlistSignal[];
  interests: InterestSignal[];
  receiver: { name?: string | null; birthYear?: number | null };
  giverStyle?: {
    philosophyTags?: string[];
    riskTolerance?: string | null; // "safe" | "bold"
    budgetMin?: number | null;
    budgetMax?: number | null;
  } | null;
  /** Occasion tag from OCCASIONS (drives the milestone gate). */
  occasion?: string | null;
  relationship?: {
    type?: string | null;
    closeness?: number; // 0-1, from RELATIONSHIP_CLOSENESS
    sharedInterests?: string[];
  } | null;
  /** The requesting Giver's private note about the receiver (Stream B, keyword-parsed). */
  giverNote?: string | null;
  /** The milestone gift-idea note, if one was logged (Stream B, soft wishlist). */
  giftIdeaNote?: string | null;
  budgetOverride?: number | null;
};

export type GiftSuggestion = {
  title: string;
  level: "item" | "category";
  slotType: SlotType;
  rationale: string;
  priceEstimate?: string;
  /** Which input stream(s) produced this candidate (PRD §8: persisted for analytics). */
  originTrace: OriginStream[];
  /** Set when Slot 3/4 had to repeat a subcategory for lack of pool depth (§6). */
  diversityRepeat?: boolean;
};

export type RecommendationOutput = {
  /** Up to four, in slot order (§6). */
  suggestions: GiftSuggestion[];
  /** Graceful low-data / honest-fallback messaging (§9, FR-30/31). */
  notices: string[];
};

// ---------------------------------------------------------------------------
// Gift-idea bank. Tiers live here (PRD §12 pt 2 — gift-category attributes, in
// code, not the taxonomy table). Both tiers are optional per entry:
//   minIntimacyTier      defaults to "low" (appropriate for anyone)
//   sentimentalityTier   defaults from philosophy (see ideaSentimentality)
// Keyed by taxonomy category (prisma/seed.ts TAXONOMY keys). Prices are USD bands.
// ---------------------------------------------------------------------------

type Idea = {
  title: string;
  level: "item" | "category";
  band: [number, number];
  philosophy?: string; // one of GIFTING_PHILOSOPHIES values
  minIntimacyTier?: Tier;
  sentimentalityTier?: Tier;
};

const IDEA_BANK: Record<string, Idea[]> = {
  cooking_food: [
    { title: "Cast iron skillet", level: "item", band: [30, 70], philosophy: "practical" },
    { title: "Artisan spice or hot-sauce set", level: "item", band: [20, 45] },
    { title: "A hands-on cooking class", level: "item", band: [50, 150], philosophy: "experiential" },
    { title: "Something for the kitchen", level: "category", band: [15, 120] },
  ],
  coffee_tea: [
    { title: "Pour-over coffee kit", level: "item", band: [25, 60], philosophy: "practical" },
    { title: "Specialty bean / loose-leaf subscription", level: "item", band: [30, 90], philosophy: "experiential" },
    { title: "A nice mug or travel tumbler", level: "item", band: [15, 40] },
  ],
  outdoors: [
    { title: "Insulated water bottle", level: "item", band: [25, 50], philosophy: "practical" },
    { title: "A day hike or climbing gym pass", level: "item", band: [20, 80], philosophy: "experiential" },
    { title: "Outdoor / adventure gear", level: "category", band: [20, 200] },
  ],
  gaming: [
    { title: "A well-reviewed indie game", level: "item", band: [15, 40] },
    { title: "Quality controller or headset", level: "item", band: [40, 120], philosophy: "practical" },
    { title: "Gaming accessory or collectible", level: "category", band: [15, 150] },
  ],
  tech_gadgets: [
    { title: "Wireless earbuds", level: "item", band: [40, 150], philosophy: "practical" },
    { title: "Smart-home gadget", level: "item", band: [25, 100], philosophy: "surprise" },
    { title: "A useful tech accessory", level: "category", band: [20, 200] },
  ],
  music: [
    { title: "Concert or gig tickets", level: "item", band: [40, 150], philosophy: "experiential" },
    { title: "Vinyl record of a favourite album", level: "item", band: [20, 40], philosophy: "sentimental" },
    { title: "Something music-related", level: "category", band: [15, 200] },
  ],
  reading_books: [
    { title: "A beautiful edition of a book they'd love", level: "item", band: [15, 45], philosophy: "sentimental" },
    { title: "Bookshop gift card", level: "item", band: [20, 60] },
    { title: "A book in a genre they enjoy", level: "category", band: [12, 40] },
  ],
  art_craft: [
    { title: "Quality supplies for their craft", level: "item", band: [20, 80], philosophy: "practical" },
    { title: "A workshop in their medium", level: "item", band: [40, 150], philosophy: "experiential" },
    { title: "Art or craft materials", level: "category", band: [15, 120] },
  ],
  fitness_wellness: [
    { title: "Fitness class pack or studio pass", level: "item", band: [40, 150], philosophy: "experiential" },
    { title: "Recovery gadget (massage gun, foam roller)", level: "item", band: [25, 100], philosophy: "practical" },
    { title: "Wellness / self-care item", level: "category", band: [15, 120] },
  ],
  fashion_style: [
    { title: "An accessory in their style", level: "item", band: [25, 120], minIntimacyTier: "medium" },
    { title: "A curated clothing piece", level: "category", band: [30, 200], minIntimacyTier: "medium" },
  ],
  home_decor: [
    { title: "Statement candle or diffuser", level: "item", band: [20, 60], philosophy: "sentimental" },
    { title: "A piece for their space", level: "category", band: [20, 150], minIntimacyTier: "medium" },
  ],
  travel: [
    { title: "Packing cubes / travel organiser", level: "item", band: [20, 60], philosophy: "practical" },
    { title: "An experience voucher for a trip", level: "item", band: [50, 250], philosophy: "experiential" },
    { title: "Travel gear", level: "category", band: [20, 200] },
  ],
  gardening: [
    { title: "Starter kit for herbs or houseplants", level: "item", band: [20, 60], philosophy: "practical" },
    { title: "A standout plant or planter", level: "item", band: [15, 80], philosophy: "sentimental" },
  ],
  pets: [
    { title: "A treat-and-toy bundle for their pet", level: "item", band: [20, 60] },
    { title: "Something for their pet", level: "category", band: [15, 100] },
  ],
  photography: [
    { title: "Instant camera + film", level: "item", band: [60, 150], philosophy: "experiential" },
    { title: "A photography accessory", level: "category", band: [20, 200] },
  ],
  board_games: [
    { title: "A highly-rated board game", level: "item", band: [25, 60] },
    { title: "A game night bundle", level: "category", band: [20, 100], philosophy: "experiential" },
  ],
  beauty_grooming: [
    { title: "A premium version of a daily-use product", level: "item", band: [20, 80], philosophy: "practical", minIntimacyTier: "medium" },
    { title: "Grooming or skincare set", level: "category", band: [20, 120], minIntimacyTier: "medium" },
  ],
  // --- Categories present in the taxonomy but missing from the original bank ---
  movies_tv: [
    { title: "A streaming subscription or box-set", level: "item", band: [15, 80], philosophy: "experiential" },
    { title: "Cinema tickets or a home-theatre accessory", level: "category", band: [20, 150] },
  ],
  sports: [
    { title: "Tickets to a game they follow", level: "item", band: [40, 200], philosophy: "experiential" },
    { title: "Gear or apparel for their sport", level: "category", band: [20, 150], philosophy: "practical" },
  ],
  science_learning: [
    { title: "An online course or a subscription to something they're learning", level: "item", band: [15, 120], philosophy: "experiential" },
    { title: "A kit or book for their subject", level: "category", band: [20, 120] },
  ],
  diy_tools: [
    { title: "A quality tool they don't have yet", level: "item", band: [25, 120], philosophy: "practical" },
    { title: "Materials for their next project", level: "category", band: [20, 150] },
  ],
  collecting: [
    { title: "A sought-after piece for their collection", level: "item", band: [20, 150], philosophy: "sentimental" },
    { title: "Storage or display for what they collect", level: "category", band: [20, 120], philosophy: "practical" },
  ],
  mindfulness: [
    { title: "A guided journal or meditation subscription", level: "item", band: [15, 80], philosophy: "sentimental" },
    { title: "Something calming for their routine", level: "category", band: [15, 100] },
  ],
  kids_family: [
    { title: "A standout toy or craft kit", level: "item", band: [15, 60] },
    { title: "A family game or activity", level: "category", band: [15, 80], philosophy: "experiential" },
  ],
};

// Generic fallbacks — for the no/low-signal path and to diversify a thin pool
// (§9) instead of repeating one category. Spanning all sentimentality tiers so a
// high-floor milestone (anniversary) still has several eligible.
const GENERIC_IDEAS: Idea[] = [
  { title: "A thoughtful experience (dinner, class, or outing)", level: "category", band: [30, 150], philosophy: "experiential", sentimentalityTier: "high" },
  { title: "A personalised / handmade keepsake", level: "category", band: [20, 80], philosophy: "sentimental", sentimentalityTier: "high" },
  { title: "A memento tied to a shared memory", level: "category", band: [20, 120], sentimentalityTier: "high" },
  { title: "A subscription to something they'd enjoy", level: "category", band: [15, 120], philosophy: "experiential", sentimentalityTier: "medium" },
  { title: "A high-quality everyday-use upgrade", level: "category", band: [20, 100], philosophy: "practical" },
];

// ---------------------------------------------------------------------------
// Milestone profiles (§5.2). Sentimentality floor gates eligibility; the price
// multiplier scales the effective budget ceiling. `other`/free-text inherits the
// neutral default. (3-tier scale per §12 pt 4 — the multiplier carries finer price nuance.)
// ---------------------------------------------------------------------------

type MilestoneProfile = { sentimentalityFloor: Tier; priceMultiplier: number };

const MILESTONE_PROFILES: Record<string, MilestoneProfile> = {
  birthday: { sentimentalityFloor: "medium", priceMultiplier: 1.0 },
  anniversary: { sentimentalityFloor: "high", priceMultiplier: 1.2 },
  congratulations: { sentimentalityFloor: "medium", priceMultiplier: 1.1 },
  holiday: { sentimentalityFloor: "low", priceMultiplier: 0.85 },
  just_because: { sentimentalityFloor: "low", priceMultiplier: 0.65 },
  other: { sentimentalityFloor: "low", priceMultiplier: 1.0 },
};
const NEUTRAL_MILESTONE: MilestoneProfile = MILESTONE_PROFILES.other;

/** Notional ceiling when no budget is set, so milestone banding still bites (§5.2). */
const DEFAULT_CEILING = 150;

// Origin weights for §4.4. Tuned so a single specific first-party signal competes
// with — and is not automatically beaten by — corroborated crowd volume.
const W = {
  receiverSelfBigPassion: 1.6,
  receiverSelfCasual: 0.9,
  requestingGiver: 1.2,
  communityFirst: 0.9, // weight of the strongest corroborating contributor
  communityDecay: 0.55, // geometric decay per additional contributor
  communityCeiling: 1.4, // hard cap so volume can't dominate (§4.4 step 3)
  giverNoteBoost: 1.25, // specificity boost when the private note names this tag (§4.2)
};

const WISHLIST_BASE = 2.2; // certainty (Stream A) tops the pool
const GIFT_IDEA_BASE = 1.9; // the giver's own logged idea — soft wishlist
const SHARED_BASE = 1.5; // shared activity — strong personally-anchored signal

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function ideaIntimacy(i: Idea): Tier {
  return i.minIntimacyTier ?? "low";
}
function ideaSentimentality(i: Idea): Tier {
  if (i.sentimentalityTier) return i.sentimentalityTier;
  switch (i.philosophy) {
    case "sentimental":
      return "high";
    case "experiential":
      return "medium";
    case "practical":
      return "low";
    default:
      return "medium";
  }
}

/** Ordinal rank (1..10, 1 = best; null = selected-but-unranked) → 0..1 weight. */
function rankScore(rankValue: number | null | undefined): number {
  if (rankValue == null) return 0.3;
  const capped = Math.min(Math.max(rankValue, 1), 10);
  return (11 - capped) / 10;
}

function recencyFactor(days: number): number {
  return days <= 90 ? 1 : days <= 365 ? 0.8 : 0.6;
}

/** Relationship closeness (0-1) → intimacy tier. Unset relationship → most
 *  conservative tier (§9 edge: default to lowest to avoid over-personal picks). */
function relationshipTier(rel: RecommendationInput["relationship"]): Tier {
  if (!rel || rel.type == null) return "low";
  const c = rel.closeness ?? 0.5;
  if (c >= 0.8) return "high";
  if (c >= 0.4) return "medium";
  return "low";
}

function bandLabel(min: number, max: number): string {
  return `~$${min}–$${max}`;
}

function displayName(input: RecommendationInput): string {
  return input.receiver?.name?.trim().split(/\s+/)[0] || "them";
}
function possessive(input: RecommendationInput): string {
  const n = displayName(input);
  return n === "them" ? "their" : `${n}'s`;
}

// ---------------------------------------------------------------------------
// §4.4 — cross-stream aggregation for one interest tag.
// ---------------------------------------------------------------------------

type Aggregated = {
  signal: InterestSignal;
  score: number;
  origins: Set<OriginStream>;
  /** True when the requesting Giver's own rank/note anchors this tag. */
  personallyAnchored: boolean;
};

function aggregate(sig: InterestSignal, giverNote: string | null): Aggregated {
  const origins = new Set<OriginStream>();

  let self = 0;
  if (sig.receiverSelf?.present) {
    self =
      sig.receiverSelf.confidence === "big_passion"
        ? W.receiverSelfBigPassion
        : W.receiverSelfCasual;
    origins.add("receiver_self");
  }

  let giver = 0;
  if (sig.requestingGiver?.present) {
    giver = rankScore(sig.requestingGiver.rankValue) * W.requestingGiver;
    origins.add("requesting_giver");
  }

  // Community with diminishing (geometric) returns and a hard ceiling (§4.4 step 3).
  const communityScores = sig.community.map((c) => rankScore(c.rankValue)).sort((a, b) => b - a);
  let community = 0;
  communityScores.forEach((s, i) => {
    community += s * W.communityFirst * Math.pow(W.communityDecay, i);
  });
  community = Math.min(community, W.communityCeiling);
  if (communityScores.length > 0) origins.add("community");

  // Private-note keyword match (§4.2): a specificity boost + personal origin.
  let noteBoost = 1;
  let personallyAnchored = giver > 0;
  if (giverNote && noteMatchesTag(giverNote, sig)) {
    noteBoost = W.giverNoteBoost;
    origins.add("giver_note");
    personallyAnchored = true;
  }

  const rf = recencyFactor(sig.recencyDays);
  const score = (self + (giver + community) * rf) * noteBoost;

  return { signal: sig, score, origins, personallyAnchored };
}

/** Light keyword parse (§4.2): does the note mention this tag's label words? */
function noteMatchesTag(note: string, sig: InterestSignal): boolean {
  const haystack = note.toLowerCase();
  // Split the label into meaningful words, ignore short connectors.
  const words = sig.label
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);
  return words.some((w) => haystack.includes(w));
}

// ---------------------------------------------------------------------------
// Candidate model + generation (§5.1)
// ---------------------------------------------------------------------------

type Candidate = {
  title: string;
  level: "item" | "category";
  band: [number, number];
  /** For diversity (§6): the category key, or a unique tag for wishlist/shared. */
  subcategory: string;
  baseScore: number;
  origins: Set<OriginStream>;
  personallyAnchored: boolean;
  minIntimacyTier: Tier;
  sentimentalityTier: Tier;
  philosophy?: string;
  /** Explicit price for wishlist items (overrides band for the price gate). */
  price?: number | null;
  /** Receiver-/giver-declared wants bypass the intimacy gate (§6 Slot 1). */
  exemptIntimacy: boolean;
  /** A personal angle bypasses the sentimentality floor (§5.2 anniversary note). */
  exemptSentimentality: boolean;
  /** Carried for rationale (§7). */
  interestLabel?: string;
  sharedLabel?: string;
  /** Number of community contributors who corroborated this tag (for rationale). */
  contributors?: number;
};

function candidateFromIdea(
  idea: Idea,
  category: string,
  agg: Aggregated,
): Candidate {
  return {
    title: idea.title,
    level: idea.level,
    band: idea.band,
    subcategory: category,
    baseScore: agg.score,
    origins: new Set(agg.origins),
    personallyAnchored: agg.personallyAnchored,
    minIntimacyTier: ideaIntimacy(idea),
    sentimentalityTier: ideaSentimentality(idea),
    philosophy: idea.philosophy,
    exemptIntimacy: false,
    exemptSentimentality: agg.personallyAnchored,
    interestLabel: agg.signal.label,
    contributors: agg.signal.community.length,
  };
}

function generateCandidates(input: RecommendationInput): Candidate[] {
  const candidates: Candidate[] = [];

  // Stream A — wishlist items (certainty; exempt from both hard gates, price only).
  for (const w of input.wishlist) {
    candidates.push({
      title: w.title,
      level: "item",
      band: w.price != null ? [w.price, w.price] : [0, 0],
      // Use the real category (when known) so diversity gates against it — two
      // coffee things shouldn't fill Slots 1 and 2.
      subcategory: w.category ?? `wishlist:${w.title.toLowerCase()}`,
      baseScore: WISHLIST_BASE,
      origins: new Set<OriginStream>(["wishlist"]),
      personallyAnchored: false,
      minIntimacyTier: "low",
      sentimentalityTier: "high",
      price: w.price ?? null,
      exemptIntimacy: true,
      exemptSentimentality: true,
    });
  }

  // Stream B — the milestone gift-idea note (soft wishlist; personally anchored).
  if (input.giftIdeaNote && input.giftIdeaNote.trim()) {
    candidates.push({
      title: input.giftIdeaNote.trim(),
      level: "category",
      band: [0, 0],
      subcategory: "gift_idea_note",
      baseScore: GIFT_IDEA_BASE,
      origins: new Set<OriginStream>(["gift_idea_note"]),
      personallyAnchored: true,
      minIntimacyTier: "low",
      sentimentalityTier: "high",
      exemptIntimacy: true,
      exemptSentimentality: true,
    });
  }

  // Stream A/B/C — aggregated interests → ideas (top-k tier drives the picks).
  const aggregated = input.interests
    .map((s) => aggregate(s, input.giverNote ?? null))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // top-k tier (§5.1)

  for (const agg of aggregated) {
    const category = agg.signal.category ?? "";
    const ideas = IDEA_BANK[category] ?? [];
    for (const idea of ideas) {
      candidates.push(candidateFromIdea(idea, category, agg));
    }
  }

  // Stream B — shared interests/activities (the strongest personally-anchored lever, §5.3).
  const interestLabels = input.interests.map((s) => s.label.toLowerCase());
  for (const shared of input.relationship?.sharedInterests ?? []) {
    // If this shared interest already exists as a contributed interest, it's
    // covered there (and personally anchored) — don't emit a duplicate candidate.
    const s = shared.toLowerCase();
    if (interestLabels.some((l) => l.includes(s) || s.includes(l))) continue;
    const category = matchCategory(shared);
    const ideas = category ? IDEA_BANK[category] ?? [] : [];
    // Prefer a concrete idea from the matched category; else a category-level pick.
    const base: Candidate = {
      title: ideas[0]?.title ?? `Something tied to ${shared} you both enjoy`,
      level: ideas[0]?.level ?? "category",
      band: ideas[0]?.band ?? [20, 120],
      subcategory: category ?? `shared:${shared.toLowerCase()}`,
      baseScore: SHARED_BASE,
      origins: new Set<OriginStream>(["shared_interest", "requesting_giver"]),
      personallyAnchored: true,
      minIntimacyTier: ideas[0] ? ideaIntimacy(ideas[0]) : "low",
      sentimentalityTier: ideas[0] ? ideaSentimentality(ideas[0]) : "high",
      philosophy: ideas[0]?.philosophy,
      exemptIntimacy: false,
      exemptSentimentality: true, // personal angle
      sharedLabel: shared,
    };
    candidates.push(base);
  }

  // De-dupe by title, keeping the highest-scoring instance (merging origins).
  const byTitle = new Map<string, Candidate>();
  for (const c of candidates) {
    const key = c.title.toLowerCase();
    const existing = byTitle.get(key);
    if (!existing) {
      byTitle.set(key, c);
    } else if (c.baseScore > existing.baseScore) {
      c.origins = new Set([...c.origins, ...existing.origins]);
      c.personallyAnchored = c.personallyAnchored || existing.personallyAnchored;
      byTitle.set(key, c);
    } else {
      for (const o of c.origins) existing.origins.add(o);
      existing.personallyAnchored = existing.personallyAnchored || c.personallyAnchored;
    }
  }
  return [...byTitle.values()];
}

/** Map a free-text shared-interest string to a taxonomy category, if obvious. */
function matchCategory(text: string): string | null {
  const t = text.toLowerCase();
  for (const category of Object.keys(IDEA_BANK)) {
    // Category key words e.g. "coffee_tea" → ["coffee","tea"].
    const words = category.split("_");
    if (words.some((w) => t.includes(w))) return category;
  }
  return null;
}

// ---------------------------------------------------------------------------
// §5.2–5.5 — gates and the final composite score.
// ---------------------------------------------------------------------------

type Scored = Candidate & { finalScore: number };

function scoreCandidates(input: RecommendationInput): Scored[] {
  const { profile, ceiling: effectiveCeiling } = milestoneContext(input);
  const relTier = relationshipTier(input.relationship);
  const philosophy = new Set(input.giverStyle?.philosophyTags ?? []);
  const risk = input.giverStyle?.riskTolerance ?? null;

  const scored: Scored[] = [];
  for (const c of generateCandidates(input)) {
    // §5.2 milestone gate — price band + sentimentality floor.
    const priceForGate = c.price ?? c.band[0];
    if (priceForGate != null && priceForGate > effectiveCeiling) continue;
    if (
      !c.exemptSentimentality &&
      TIER_RANK[c.sentimentalityTier] < TIER_RANK[profile.sentimentalityFloor]
    ) {
      continue;
    }

    // §5.3 relationship gate — hard intimacy-tier requirement.
    if (!c.exemptIntimacy && TIER_RANK[relTier] < TIER_RANK[c.minIntimacyTier]) {
      continue;
    }

    // §5.4 gifting-style re-rank (multiplier only — never gates).
    let styleFit = 1;
    if (c.philosophy && philosophy.has(c.philosophy)) styleFit *= 1.3;
    const corroborated = c.origins.has("community") || c.origins.has("receiver_self");
    if (risk === "bold" && (c.philosophy === "surprise" || !corroborated)) styleFit *= 1.15;
    if (risk === "safe") styleFit *= corroborated ? 1.15 : 0.9;
    if (styleFit !== 1) c.origins.add("giver_style");

    scored.push({ ...c, finalScore: c.baseScore * styleFit });
  }

  return scored.sort((a, b) => b.finalScore - a.finalScore);
}

// ---------------------------------------------------------------------------
// §6 — four-slot composition.
// ---------------------------------------------------------------------------

/** Milestone profile + effective price ceiling for this request (§5.2). */
function milestoneContext(input: RecommendationInput): { profile: MilestoneProfile; ceiling: number } {
  const profile = (input.occasion && MILESTONE_PROFILES[input.occasion]) || NEUTRAL_MILESTONE;
  const baseCeiling = input.budgetOverride ?? input.giverStyle?.budgetMax ?? DEFAULT_CEILING;
  return { profile, ceiling: baseCeiling * profile.priceMultiplier };
}

/** The occasion as a plain word for copy ("birthday"), or null for none/other. */
function occasionWord(input: RecommendationInput): string | null {
  return input.occasion && input.occasion !== "other" ? input.occasion.replace(/_/g, " ") : null;
}

export function generateRecommendations(
  input: RecommendationInput,
): RecommendationOutput {
  const notices: string[] = [];
  const scored = scoreCandidates(input);
  const name = displayName(input);

  const hasAnySignal =
    input.wishlist.length > 0 ||
    input.interests.length > 0 ||
    Boolean(input.giftIdeaNote?.trim()) ||
    (input.relationship?.sharedInterests?.length ?? 0) > 0 ||
    Boolean(input.giverNote?.trim());

  // §9 — nothing survived composition. Distinguish "no data at all" from "data
  // existed but the milestone/relationship gates excluded all of it" — different
  // honest copy, never a fabricated personal slot.
  if (scored.length === 0) {
    const suggestions = fallbackSuggestions(input, 4);
    if (!hasAnySignal) {
      notices.push(
        `You haven't added anything you know about ${name} yet — even one note or interest will make these much sharper.`,
      );
    } else {
      const occ = occasionWord(input);
      const article = occ && /^[aeiou]/i.test(occ) ? "an" : "a";
      notices.push(
        `What you've noted about ${name} didn't fit ${occ ? `${article} ${occ}` : "this occasion"} at this relationship — here are safe, occasion-appropriate ideas instead.`,
      );
    }
    addContextNotices(input, notices);
    return { suggestions, notices };
  }

  type Chosen = { cand: Scored; slotType: SlotType; repeat: boolean };
  const chosen: Chosen[] = [];
  const usedSubcats = new Set<string>();
  const usedTitles = new Set<string>();
  const take = (cand: Scored, slotType: SlotType, repeat = false) => {
    chosen.push({ cand, slotType, repeat });
    usedSubcats.add(cand.subcategory);
    usedTitles.add(cand.title.toLowerCase());
  };
  const freshDistinct = () =>
    scored.find((c) => !usedTitles.has(c.title.toLowerCase()) && !usedSubcats.has(c.subcategory));

  // Slot 1 — certainty (wishlist / gift-idea note), else best interest-derived.
  const slot1 =
    scored.find((c) => c.origins.has("wishlist") || c.origins.has("gift_idea_note")) ?? scored[0];
  take(slot1, "certainty");

  // Slot 2 — personally anchored, distinct from Slot 1 (candidate AND subcategory).
  const slot2 = scored.find(
    (c) => !usedTitles.has(c.title.toLowerCase()) && c.personallyAnchored && !usedSubcats.has(c.subcategory),
  );
  if (slot2) {
    take(slot2, "personally_anchored");
  } else {
    // The only personal signal (if any) was consumed by Slot 1 — fall back
    // honestly (§6 Slot 2 fallback): a distinct candidate, else a generic.
    const alt = freshDistinct() ?? nextGeneric(input, usedTitles, usedSubcats);
    if (alt) take(alt, "diversified");
    notices.push(
      `Nothing you personally added stood out for ${name} beyond the first idea, so the rest lean on ${name}'s friends and safe defaults.`,
    );
  }

  // Slots 3 & 4 — best remaining distinct subcategory; then milestone-appropriate
  // generics for genuine diversity (§9 cold-start); repeat a subcategory only as a
  // last resort, flagged (§6).
  while (chosen.length < 4) {
    const distinct = freshDistinct();
    if (distinct) {
      take(distinct, "diversified");
      continue;
    }
    const generic = nextGeneric(input, usedTitles, usedSubcats);
    if (generic) {
      take(generic, "diversified");
      continue;
    }
    const repeat = scored.find((c) => !usedTitles.has(c.title.toLowerCase()));
    if (!repeat) break;
    take(repeat, "diversified", true);
  }

  const suggestions = chosen.map(({ cand, slotType, repeat }) =>
    toSuggestion(cand, slotType, input, repeat),
  );
  addContextNotices(input, notices);
  return { suggestions, notices };
}

/** A milestone-appropriate generic idea not yet used, as a Scored candidate. */
function nextGeneric(
  input: RecommendationInput,
  usedTitles: Set<string>,
  usedSubcats: Set<string>,
): Scored | null {
  const { profile, ceiling } = milestoneContext(input);
  for (const i of GENERIC_IDEAS) {
    const sub = `generic:${i.title.toLowerCase()}`;
    if (usedTitles.has(i.title.toLowerCase()) || usedSubcats.has(sub)) continue;
    if (i.band[0] > ceiling) continue;
    if (TIER_RANK[ideaSentimentality(i)] < TIER_RANK[profile.sentimentalityFloor]) continue;
    return {
      title: i.title,
      level: i.level,
      band: i.band,
      subcategory: sub,
      baseScore: 0,
      origins: new Set<OriginStream>(["fallback"]),
      personallyAnchored: false,
      minIntimacyTier: "low",
      sentimentalityTier: ideaSentimentality(i),
      philosophy: i.philosophy,
      exemptIntimacy: true,
      exemptSentimentality: true,
      finalScore: 0,
    };
  }
  return null;
}

function toSuggestion(
  c: Scored,
  slotType: SlotType,
  input: RecommendationInput,
  diversityRepeat: boolean,
): GiftSuggestion {
  return {
    title: c.title,
    level: c.level,
    slotType,
    rationale: buildRationale(c, slotType, input),
    priceEstimate:
      c.price != null
        ? `~$${c.price}`
        : c.band[1] > 0
          ? bandLabel(c.band[0], c.band[1])
          : undefined,
    originTrace: [...c.origins],
    diversityRepeat: diversityRepeat || undefined,
  };
}

// ---------------------------------------------------------------------------
// §7 — single-origin, traceable rationale. Names the dominant stream in plain
// language; never blends two origins into a vague composite claim.
// ---------------------------------------------------------------------------

function buildRationale(
  c: Candidate,
  slotType: SlotType,
  input: RecommendationInput,
): string {
  const name = displayName(input);
  const their = possessive(input);
  const occ = occasionWord(input);

  // Honest fallback / generic default (§9) — never dressed up as personal.
  if (c.origins.has("fallback")) {
    return `A safe, occasion-appropriate idea while we learn more about ${name}.`;
  }
  // Certainty (Stream A / gift-idea note) takes priority in phrasing.
  if (c.origins.has("wishlist")) {
    return occ
      ? `On ${their} own wishlist, and it fits a ${occ} budget.`
      : `On ${their} own wishlist — a direct match to something they asked for.`;
  }
  if (c.origins.has("gift_idea_note")) {
    return `Your own logged idea for ${name} — kept front and centre.`;
  }
  // Personally anchored (Stream B).
  if (slotType === "personally_anchored" || c.origins.has("shared_interest") || c.origins.has("giver_note")) {
    if (c.sharedLabel) {
      return `You said you two share an interest in ${c.sharedLabel.toLowerCase()} — this leans into that.`;
    }
    if (c.origins.has("giver_note") && c.interestLabel) {
      return `From your own note — you flagged ${c.interestLabel.toLowerCase()} about ${name}.`;
    }
    if (c.origins.has("requesting_giver") && c.interestLabel) {
      return `You ranked ${c.interestLabel.toLowerCase()} highly for ${name} yourself.`;
    }
  }
  // Community (Stream C).
  if (c.origins.has("community") && c.interestLabel) {
    const n = c.contributors ?? 0;
    const who = n >= 2 ? `${n} of ${name}'s friends have` : `One of ${name}'s friends has`;
    return `${who} flagged ${c.interestLabel.toLowerCase()} as a strong interest.`;
  }
  // Receiver self.
  if (c.origins.has("receiver_self") && c.interestLabel) {
    return `${name} tagged ${c.interestLabel.toLowerCase()} as one of their own interests.`;
  }
  // Style-flavoured or generic.
  if (input.giverStyle?.riskTolerance === "bold" && !c.origins.has("community")) {
    return `A bolder pick, since you like to surprise ${name} — no one's confirmed this one yet.`;
  }
  return c.interestLabel
    ? `Tied to ${c.interestLabel.toLowerCase()}, one of ${their} interests.`
    : `A broadly-appreciated option while we learn more about ${name}.`;
}

// ---------------------------------------------------------------------------
// §9 — fallbacks & context notices.
// ---------------------------------------------------------------------------

function fallbackSuggestions(input: RecommendationInput, count: number): GiftSuggestion[] {
  const { profile, ceiling } = milestoneContext(input);

  return GENERIC_IDEAS.filter(
    (i) => i.band[0] <= ceiling && TIER_RANK[ideaSentimentality(i)] >= TIER_RANK[profile.sentimentalityFloor],
  )
    .slice(0, count)
    .map((i) => ({
      title: i.title,
      level: i.level,
      slotType: "diversified" as SlotType,
      rationale: `A safe, milestone-appropriate idea while we learn more about ${displayName(input)}.`,
      priceEstimate: bandLabel(i.band[0], i.band[1]),
      originTrace: ["fallback"] as OriginStream[],
    }));
}

function addContextNotices(input: RecommendationInput, notices: string[]): void {
  if (input.wishlist.length === 0) {
    notices.push(`No wishlist yet — leaning on what ${displayName(input)}'s friends know about their interests.`);
  }
  if (input.interests.length === 0) {
    notices.push("No ranked interests yet — showing broadly safe, milestone-appropriate ideas.");
  }
  if (!input.occasion) {
    notices.push("No occasion set — using a neutral price band and tone.");
  }
  if (input.budgetOverride == null && input.giverStyle?.budgetMax == null) {
    notices.push("No budget set — suggestions use the occasion's default price band.");
  }
}
