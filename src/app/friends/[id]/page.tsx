import { SectionStub } from "@/components/SectionStub";
import { prisma } from "@/lib/prisma";

// Flow 2 (revisited) — a single friend's profile from the Giver's side:
// contributed interests, relationship, private notes, milestones, and an entry
// point to request a recommendation.
export default async function FriendProfilePage({
  params,
}: PageProps<"/friends/[id]">) {
  const { id } = await params;
  const friend = await prisma.user.findUnique({ where: { id } });

  return (
    <SectionStub
      title={friend ? `Profile: ${friend.name ?? friend.email}` : "Friend profile"}
      flow="Flow 2 — Contribute to a friend's profile"
      brdRefs={["FR-4", "FR-17", "FR-18", "FR-20", "FR-23"]}
      description="View and edit everything you've contributed about this friend, and jump to gift ideas. Interests contributed here aggregate with what other friends add and with what the Receiver confirms after joining."
      todos={[
        "Show contributed interests (Interest) with edit/remove and 'add more' (FR-4)",
        "Show/edit relationship type + shared interests (RelationshipContext)",
        "Private notes list + add (FriendNote); milestones list + add (MilestoneEntry)",
        "Re-rank prompt when the Receiver's list has changed since last visit (FR-20, FR-23)",
        "Invite / re-nudge controls if still unclaimed (FR-13, FR-16)",
        "Link to 'Get gift ideas' → /recommend/[id]",
      ]}
    >
      {!friend && (
        <p className="text-sm text-coral dark:text-coral">
          No user found for id <code className="font-mono">{id}</code>.
        </p>
      )}
    </SectionStub>
  );
}
