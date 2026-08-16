import { SectionStub } from "@/components/SectionStub";

// Flow 1 (steps 2-3) + Flow 2 — add a target and contribute what you know,
// before the invite goes out. This is the single most important, highest-
// traffic interaction in the product (BRD non-functional: accessibility).
export default function AddFriendPage() {
  return (
    <SectionStub
      title="Add a friend & share what you know"
      flow="Flow 1–2 — Add target + pre-invite contribution"
      brdRefs={["FR-12", "FR-17", "FR-18", "FR-19", "FR-22"]}
      description="Create an unclaimed Receiver record from a name + contact, then tag interests you believe fit them, set the relationship, and optionally add a private note and a milestone. This seeds the Receiver's profile so it's never empty when they're invited."
      todos={[
        "Form: friend name + contact (email or phone) → create unclaimed User (claimStatus 'unclaimed') + FriendEdge",
        "Interest tagging UI over the seeded taxonomy (InterestTag), with free-text add (FR-6)",
        "Relationship type picker (RELATIONSHIP_TYPES) + 1–3 shared interests (FR-22)",
        "Private note (FriendNote) and milestone entry (MilestoneEntry) inputs",
        "Persist contributions as Interest + InterestRanking rows tagged 'pre_invite'",
        "Prompt account creation to 'save progress' if the Giver isn't signed in (FR-1)",
        "Open question (Section 13): rank (ordinal) vs. rate (1–5) — decide the interaction",
      ]}
    />
  );
}
