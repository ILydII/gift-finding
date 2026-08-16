// -----------------------------------------------------------------------------
// V1 recommendation engine (heuristic, not ML — see BRD Section 9).
//
// A pure function: structured signals in, ranked suggestions out. No DB or
// network access here so it stays fast (BRD non-functional: "a few seconds",
// "heuristic scoring pass") and unit-testable. A later phase can swap this for
// a trained model or an LLM-driven reasoner (Section 13 open question) without
// touching callers.
// -----------------------------------------------------------------------------

export type GiftSuggestion = {
  title: string;
  level: "item" | "category";
  rationale: string;
  priceEstimate?: string;
  /** Which input signals drove this suggestion (for the one-line rationale, FR-28). */
  sourceSignals: string[];
};

export type AggregatedInterest = {
  /** Taxonomy slug or, for free-text interests, the raw text. */
  tag: string;
  label: string;
  category?: string | null;
  /** Aggregated rank/rating across contributors (higher = stronger fit). 0-1. */
  avgRank: number;
  /** How many contributors corroborated this interest. */
  contributors: number;
  /** Days since the most recent contribution (recency signal). */
  recencyDays: number;
};

export type RecommendationInput = {
  wishlist: { title: string; price?: number | null; link?: string | null }[];
  interests: AggregatedInterest[];
  receiver: { birthYear?: number | null };
  giverStyle?: {
    philosophyTags?: string[];
    riskTolerance?: string | null;
    budgetMin?: number | null;
    budgetMax?: number | null;
  } | null;
  occasion?: string | null;
  relationship?: {
    type?: string | null;
    closeness?: number; // 0-1, from RELATIONSHIP_CLOSENESS
    sharedInterests?: string[];
  } | null;
  budgetOverride?: number | null;
};

export type RecommendationOutput = {
  suggestions: GiftSuggestion[];
  /** Graceful low-data messaging (FR-30/31). Empty when data is rich. */
  notices: string[];
};

// A compact starter idea bank keyed by taxonomy category. Category-level entries
// are used when the engine has directional confidence but thin specifics; item
// entries when it can get concrete (FR-28). Prices are rough bands in USD.
type Idea = { title: string; level: "item" | "category"; band: [number, number]; philosophy?: string };

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
    { title: "An accessory in their style", level: "item", band: [25, 120] },
    { title: "A curated clothing piece", level: "category", band: [30, 200] },
  ],
  home_decor: [
    { title: "Statement candle or diffuser", level: "item", band: [20, 60], philosophy: "sentimental" },
    { title: "A piece for their space", level: "category", band: [20, 150] },
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
    { title: "A premium version of a daily-use product", level: "item", band: [20, 80], philosophy: "practical" },
    { title: "Grooming or skincare set", level: "category", band: [20, 120] },
  ],
};

// Generic fallbacks used when we have no category signal at all.
const GENERIC_IDEAS: Idea[] = [
  { title: "A thoughtful experience (dinner, class, or outing)", level: "category", band: [30, 150], philosophy: "experiential" },
  { title: "A high-quality everyday-use upgrade", level: "category", band: [20, 100], philosophy: "practical" },
  { title: "A personalised / handmade keepsake", level: "category", band: [20, 80], philosophy: "sentimental" },
];

function band(min: number, max: number): string {
  return `~$${min}–$${max}`;
}

function withinBudget(idea: Idea, ceiling: number | null): boolean {
  if (ceiling == null) return true;
  // Keep an idea if its lower bound is at or below the ceiling.
  return idea.band[0] <= ceiling;
}

/** Confidence score for an interest (Section 9): rank + corroboration + recency. */
function interestConfidence(i: AggregatedInterest): number {
  const rank = clamp01(i.avgRank);
  const corroboration = Math.min(i.contributors, 3) / 3; // diminishing past 3
  const recency = i.recencyDays <= 90 ? 1 : i.recencyDays <= 365 ? 0.6 : 0.3;
  return rank * 0.55 + corroboration * 0.3 + recency * 0.15;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Generate 5–8 ranked gift suggestions from the combined signals.
 * Output composition target (Section 9): 1–2 wishlist, 3–4 interest-derived,
 * 1–2 relationship/shared-interest-derived.
 */
export function generateRecommendations(input: RecommendationInput): RecommendationOutput {
  const notices: string[] = [];
  const suggestions: GiftSuggestion[] = [];

  const budgetCeiling =
    input.budgetOverride ?? input.giverStyle?.budgetMax ?? null;
  const philosophy = new Set(input.giverStyle?.philosophyTags ?? []);
  const closeness = input.relationship?.closeness ?? 0.5;

  // --- 1. Wishlist items — highest priority signal (Section 9 table). ---
  const affordableWishlist = input.wishlist.filter(
    (w) => budgetCeiling == null || w.price == null || w.price <= budgetCeiling,
  );
  for (const w of affordableWishlist.slice(0, 2)) {
    suggestions.push({
      title: w.title,
      level: "item",
      rationale: "On their wishlist — a direct match to something they've asked for.",
      priceEstimate: w.price != null ? `~$${w.price}` : undefined,
      sourceSignals: ["wishlist"],
    });
  }
  if (input.wishlist.length === 0) {
    notices.push("No wishlist yet — leaning on what friends know about their interests.");
  }

  // --- 2. Interest-derived suggestions — top-k tier drives the picks. ---
  const ranked = [...input.interests].sort(
    (a, b) => interestConfidence(b) - interestConfidence(a),
  );
  if (ranked.length === 0) {
    notices.push("No interests have been ranked yet — showing broadly safe ideas.");
  }

  const usedTitles = new Set(suggestions.map((s) => s.title.toLowerCase()));
  const interestTarget = 4;
  for (const interest of ranked) {
    if (suggestions.length >= 2 + interestTarget) break;
    const ideas = IDEA_BANK[interest.category ?? ""] ?? [];
    const pick = pickIdea(ideas, philosophy, budgetCeiling, usedTitles);
    if (!pick) continue;
    usedTitles.add(pick.title.toLowerCase());
    suggestions.push({
      title: pick.title,
      level: pick.level,
      priceEstimate: band(pick.band[0], pick.band[1]),
      rationale: interestRationale(interest, pick, philosophy),
      sourceSignals: ["interests", ...(pick.philosophy ? ["giver_style"] : [])],
    });
  }

  // --- 3. Relationship / shared-interest suggestions (1–2). ---
  const shared = input.relationship?.sharedInterests ?? [];
  for (const s of shared.slice(0, 2)) {
    if (suggestions.length >= 8) break;
    suggestions.push({
      title: `Something tied to ${s} you both enjoy`,
      level: "category",
      rationale: `You and they share an interest in ${s} — a gift here lands more personally${
        closeness >= 0.8 ? " given how close you are" : ""
      }.`,
      sourceSignals: ["relationship", "shared_interests"],
    });
  }

  // --- 4. Backfill toward the 5–8 target with generic-but-styled ideas. ---
  while (suggestions.length < 5) {
    const pick = pickIdea(GENERIC_IDEAS, philosophy, budgetCeiling, usedTitles);
    if (!pick) break;
    usedTitles.add(pick.title.toLowerCase());
    suggestions.push({
      title: pick.title,
      level: "category",
      priceEstimate: band(pick.band[0], pick.band[1]),
      rationale: "A safe, broadly-appreciated option while we learn more about them.",
      sourceSignals: ["fallback"],
    });
  }

  // --- 5. Occasion + budget notices (FR-31). ---
  if (!input.occasion) {
    notices.push("No occasion set — tone and price banding are using defaults.");
  }
  if (budgetCeiling == null) {
    notices.push("No budget set — suggestions span a wide price range.");
  }

  return { suggestions: suggestions.slice(0, 8), notices };
}

function pickIdea(
  ideas: Idea[],
  philosophy: Set<string>,
  ceiling: number | null,
  used: Set<string>,
): Idea | null {
  const candidates = ideas
    .filter((i) => withinBudget(i, ceiling))
    .filter((i) => !used.has(i.title.toLowerCase()));
  if (candidates.length === 0) return null;
  // Prefer an idea matching the giver's philosophy, else the first candidate.
  const styled = candidates.find((i) => i.philosophy && philosophy.has(i.philosophy));
  return styled ?? candidates[0];
}

function interestRationale(
  interest: AggregatedInterest,
  pick: Idea,
  philosophy: Set<string>,
): string {
  const corr =
    interest.contributors > 1
      ? `${interest.contributors} friends flagged`
      : "flagged as";
  const styleNote =
    pick.philosophy && philosophy.has(pick.philosophy)
      ? `, and it fits your ${pick.philosophy} gifting style`
      : "";
  return `${corr} an interest in ${interest.label}${styleNote}.`;
}
