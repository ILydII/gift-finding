import { SectionStub } from "@/components/SectionStub";

// Flow 3–4 — the invited Receiver's landing + onboarding. Copy is framed around
// the Receiver getting thoughtful gifts, NOT around advertising a wishlist. The
// trust framing here materially affects adoption (BRD Section 11 & 13).
export default async function InvitePage({
  params,
}: PageProps<"/invite/[token]">) {
  const { token } = await params;

  return (
    <SectionStub
      title="You've been invited"
      flow="Flow 3–4 — Invite + Receiver onboarding"
      brdRefs={["FR-13", "FR-14", "FR-20"]}
      description="A friend is getting ready to give you something you'll actually like. Accept to see what they think you're into, confirm or tweak it, and (optionally) add specifics. Wishlist is secondary to the framing, never the headline."
      todos={[
        `Look up the Invite by token (${token}) and its unclaimed target record`,
        "Accept → create/link account, mark Invite accepted, flip User to 'claimed' (FR-14)",
        "Show friend-contributed interests as 'here's what your friends think you're into' (FR-20)",
        "Let the Receiver confirm / edit / remove / add interests (writes to same Interest list, FR-4)",
        "Optional, secondary: personal info + wishlist items (FR-9)",
        "Careful trust copy so pre-filled data reads as thoughtful, not surveilling (Section 11/13)",
        "Send transactional email to the inviter on accept (FR-32)",
      ]}
    />
  );
}
