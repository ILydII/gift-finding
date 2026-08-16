import { SectionStub } from "@/components/SectionStub";

// Flow 6 — request a recommendation and view ranked results. The scoring itself
// already lives in src/lib/recommendation.ts (pure, testable). This screen is
// the request form + results rendering + feedback capture around it.
export default async function RecommendPage({
  params,
}: PageProps<"/recommend/[receiverId]">) {
  const { receiverId } = await params;

  return (
    <SectionStub
      title="Get gift ideas"
      flow="Flow 6 — Requesting a recommendation"
      brdRefs={["FR-26", "FR-27", "FR-28", "FR-29", "FR-30", "FR-31"]}
      description="Pick an occasion and (optionally) a budget, then generate 5–8 ranked suggestions with a one-line rationale each. The heuristic engine is already implemented — this screen assembles its inputs and renders its output."
      todos={[
        "Occasion dropdown (OCCASIONS) + optional budget override (FR-26)",
        `Aggregate this receiver's signals (receiverId=${receiverId}): wishlist, interest rankings, personal info, relationship`,
        "Load the Giver's GiftingStyleProfile — surface the quiz first if missing (Flow 5, FR-24)",
        "Call generateRecommendations() from src/lib/recommendation.ts and persist RecommendationRequest + RecommendationResult",
        "Render suggestions with rationale + like / not-for-them feedback (FR-29)",
        "Render low-data notices returned by the engine (FR-30, FR-31)",
      ]}
    />
  );
}
