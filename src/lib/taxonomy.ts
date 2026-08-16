// Onboarding taxonomy display config (PRD FR-8): ~70 curated tags under 10
// plain headers, small enough to scan without search. The database keeps the
// full seeded taxonomy (~150 tags); this file decides what the first-run
// contribution screen shows and in what order.
//
// Slugs must match prisma/seed.ts slugify(category, label).

export type DisplayGroup = { header: string; slugs: string[] };

export const DISPLAY_GROUPS: DisplayGroup[] = [
  {
    header: "Food & Drink",
    slugs: [
      "cooking_food-baking",
      "cooking_food-grilling-and-bbq",
      "cooking_food-cocktails-and-mixology",
      "cooking_food-vegan-cooking",
      "coffee_tea-espresso",
      "coffee_tea-pour-over",
      "coffee_tea-loose-leaf-tea",
      "coffee_tea-matcha",
    ],
  },
  {
    header: "Outdoors & Travel",
    slugs: [
      "outdoors-hiking",
      "outdoors-camping",
      "outdoors-rock-climbing",
      "outdoors-kayaking",
      "outdoors-fishing",
      "outdoors-skiing-and-snowboarding",
      "travel-road-trips",
      "travel-foodie-travel",
    ],
  },
  {
    header: "Games",
    slugs: [
      "gaming-pc-gaming",
      "gaming-console-gaming",
      "gaming-retro-games",
      "gaming-tabletop-rpgs",
      "board_games-strategy-games",
      "board_games-party-games",
      "board_games-puzzles",
    ],
  },
  {
    header: "Tech",
    slugs: [
      "tech_gadgets-smart-home",
      "tech_gadgets-mechanical-keyboards",
      "tech_gadgets-audio-gear",
      "tech_gadgets-3d-printing",
      "tech_gadgets-drones",
      "tech_gadgets-e-readers",
    ],
  },
  {
    header: "Music & Sound",
    slugs: [
      "music-vinyl-records",
      "music-live-concerts",
      "music-playing-guitar",
      "music-playing-piano",
      "music-music-production",
    ],
  },
  {
    header: "Reading",
    slugs: [
      "reading_books-fiction",
      "reading_books-sci-fi-and-fantasy",
      "reading_books-mystery-and-thriller",
      "reading_books-history",
      "reading_books-graphic-novels",
      "reading_books-cookbooks",
    ],
  },
  {
    header: "Making & Craft",
    slugs: [
      "art_craft-painting",
      "art_craft-pottery-and-ceramics",
      "art_craft-knitting-and-crochet",
      "art_craft-woodworking",
      "art_craft-jewelry-making",
      "diy_tools-leathercraft",
      "diy_tools-electronics-tinkering",
    ],
  },
  {
    header: "Fitness & Wellness",
    slugs: [
      "fitness_wellness-yoga",
      "fitness_wellness-running",
      "fitness_wellness-weightlifting",
      "fitness_wellness-cycling",
      "fitness_wellness-meditation",
      "mindfulness-journaling",
      "beauty_grooming-skincare",
      "beauty_grooming-fragrance",
    ],
  },
  {
    header: "Style",
    slugs: [
      "fashion_style-sneakers",
      "fashion_style-watches",
      "fashion_style-vintage-fashion",
      "fashion_style-streetwear",
      "fashion_style-minimalist-style",
    ],
  },
  {
    header: "Home, Garden & Pets",
    slugs: [
      "home_decor-candles-and-scents",
      "home_decor-houseplants",
      "home_decor-wall-art",
      "home_decor-cozy-textiles",
      "gardening-herb-gardening",
      "gardening-vegetable-gardening",
      "pets-dogs",
      "pets-cats",
    ],
  },
];

/** PRD ruling #9: relationship-aware default ordering — a coworker surfaces
 *  different defaults than a partner. Values are header names, most relevant
 *  first; groups not listed keep their base order after the listed ones. */
const RELATIONSHIP_GROUP_ORDER: Record<string, string[]> = {
  partner: ["Style", "Fitness & Wellness", "Home, Garden & Pets", "Food & Drink"],
  parent: ["Home, Garden & Pets", "Food & Drink", "Reading", "Making & Craft"],
  child: ["Games", "Tech", "Making & Craft", "Outdoors & Travel"],
  sibling: ["Games", "Music & Sound", "Outdoors & Travel", "Tech"],
  close_friend: ["Food & Drink", "Outdoors & Travel", "Games", "Music & Sound"],
  friend: ["Food & Drink", "Games", "Outdoors & Travel", "Music & Sound"],
  coworker: ["Food & Drink", "Reading", "Tech", "Home, Garden & Pets"],
  acquaintance: ["Food & Drink", "Reading", "Home, Garden & Pets"],
  other: [],
};

export function orderedGroups(relationship: string | null): DisplayGroup[] {
  const priority = RELATIONSHIP_GROUP_ORDER[relationship ?? ""] ?? [];
  if (priority.length === 0) return DISPLAY_GROUPS;
  const byHeader = new Map(DISPLAY_GROUPS.map((g) => [g.header, g]));
  const first = priority
    .map((h) => byHeader.get(h))
    .filter((g): g is DisplayGroup => Boolean(g));
  const rest = DISPLAY_GROUPS.filter((g) => !priority.includes(g.header));
  return [...first, ...rest];
}

/** Every slug the onboarding screen can show, in one flat set. */
export const DISPLAY_SLUGS = new Set(
  DISPLAY_GROUPS.flatMap((g) => g.slugs),
);
