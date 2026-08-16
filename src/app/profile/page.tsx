import { SectionStub } from "@/components/SectionStub";

// The signed-in user's own profile: personal info (FR-2/3), their interest list
// and wishlist as a Receiver (FR-4/9), and their Giver gifting-style profile
// (FR-24/25). None of this is a first-screen ask — it's edited at their pace.
export default function ProfilePage() {
  return (
    <SectionStub
      title="My profile"
      flow="FR-2/3 · FR-24/25 — Personal info, interests, gifting style"
      brdRefs={["FR-2", "FR-3", "FR-7", "FR-9", "FR-24", "FR-25"]}
      description="Where a user manages their own data: optional personal info, the interests others can see/confirm, an optional wishlist, and the one-time gifting-style quiz that shapes their recommendations as a Giver."
      todos={[
        "Personal info form: name, birth year, gender, city-level location — all optional (FR-2)",
        "Own interest list: confirm/edit friend-contributed tags + add with self-confidence flag (FR-7)",
        "Wishlist items CRUD with public/private visibility (FR-9, FR-10, FR-11)",
        "Gifting-style quiz: budget, philosophy, planning style, risk tolerance (FR-24) → GiftingStyleProfile",
        "Surface the quiz lazily right before first recommendation results, not as an onboarding gate (Flow 5)",
      ]}
    />
  );
}
