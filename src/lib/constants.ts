// Shared domain constants derived from the BRD. Kept in one place so the UI,
// validation, and recommendation engine all agree on the allowed values.
// (SQLite has no enums, so these String values are the source of truth.)

/** FR-22 — fixed relationship list a contributor picks from. */
export const RELATIONSHIP_TYPES = [
  { value: "partner", label: "Partner / spouse" },
  { value: "parent", label: "Parent" },
  { value: "child", label: "Child" },
  { value: "sibling", label: "Sibling" },
  { value: "close_friend", label: "Close friend" },
  { value: "friend", label: "Friend" },
  { value: "coworker", label: "Coworker" },
  { value: "acquaintance", label: "Acquaintance" },
  { value: "other", label: "Other" },
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number]["value"];

/** How "close" each relationship is (0-1). Unlocks more personal categories
 *  and boosts shared-interest suggestions for closer pairs (Section 9). */
export const RELATIONSHIP_CLOSENESS: Record<string, number> = {
  partner: 1,
  child: 0.9,
  parent: 0.9,
  sibling: 0.8,
  close_friend: 0.8,
  friend: 0.5,
  coworker: 0.3,
  acquaintance: 0.2,
  other: 0.4,
};

/** Flow 6 — occasion dropdown. "other" allows free text. */
export const OCCASIONS = [
  { value: "birthday", label: "Birthday" },
  { value: "holiday", label: "Holiday" },
  { value: "just_because", label: "Just because" },
  { value: "congratulations", label: "Congratulations" },
  { value: "other", label: "Other" },
] as const;

/** FR-24 / Flow 5 — gifting philosophy options. */
export const GIFTING_PHILOSOPHIES = [
  { value: "practical", label: "Practical / useful" },
  { value: "experiential", label: "Experiential" },
  { value: "sentimental", label: "Sentimental / personal" },
  { value: "surprise", label: "Surprise me / novel" },
] as const;

export const PLANNING_STYLES = [
  { value: "plans_ahead", label: "Plans ahead" },
  { value: "last_minute", label: "Last minute" },
] as const;

export const RISK_TOLERANCES = [
  { value: "safe", label: "Safe choice" },
  { value: "bold", label: "Bold / unusual" },
] as const;

/** FR-7 — Receiver's own confidence flag on an interest. */
export const SELF_CONFIDENCE_FLAGS = [
  { value: "big_passion", label: "Big passion" },
  { value: "casual", label: "Casual interest" },
] as const;

/** Friend/target status shown in the friend list (FR-15). */
export type FriendStatus =
  | "unclaimed" // invited, not yet joined
  | "claimed_not_ranked" // joined but this Giver hasn't ranked them
  | "claimed_and_ranked";

export const DEFAULT_BUDGET_BANDS = [
  { value: "0-25", label: "Under $25", min: 0, max: 25 },
  { value: "25-50", label: "$25 – $50", min: 25, max: 50 },
  { value: "50-100", label: "$50 – $100", min: 50, max: 100 },
  { value: "100-250", label: "$100 – $250", min: 100, max: 250 },
  { value: "250+", label: "$250+", min: 250, max: null },
] as const;

export const CLAIM_STATUS = {
  UNCLAIMED: "unclaimed",
  CLAIMED: "claimed",
} as const;
