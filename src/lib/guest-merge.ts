import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Merge logic lives in its own module (no import of lib/auth) so auth.ts can
// call it from the signIn event without a circular dependency.

export const GUEST_COOKIE = "gf_guest";

/**
 * PRD FR-6: on sign-in, the guest's draft rows are reassigned to the real
 * account in one transaction, then the guest row is deleted. Collisions with
 * rows the account already owns (re-adding the same friend, re-ranking the
 * same interest) resolve in favor of the existing account row.
 */
export async function mergeGuestIntoUser(
  guestId: string,
  userId: string,
): Promise<void> {
  if (guestId === userId) return;

  await prisma.$transaction(async (tx) => {
    const guest = await tx.user.findUnique({ where: { id: guestId } });
    if (!guest?.isGuest) return; // already merged or not a guest — no-op

    // FriendEdge has @@unique([userAId, userBId]) — drop guest edges that
    // would collide with an edge the account already has.
    const guestEdges = await tx.friendEdge.findMany({
      where: { userAId: guestId },
    });
    for (const edge of guestEdges) {
      const existing = await tx.friendEdge.findUnique({
        where: {
          userAId_userBId: { userAId: userId, userBId: edge.userBId },
        },
      });
      if (existing) {
        await tx.friendEdge.delete({ where: { id: edge.id } });
      } else {
        await tx.friendEdge.update({
          where: { id: edge.id },
          data: { userAId: userId },
        });
      }
    }

    // InterestRanking has @@unique([rankerId, interestId]).
    const guestRankings = await tx.interestRanking.findMany({
      where: { rankerId: guestId },
    });
    for (const ranking of guestRankings) {
      const existing = await tx.interestRanking.findUnique({
        where: {
          rankerId_interestId: {
            rankerId: userId,
            interestId: ranking.interestId,
          },
        },
      });
      if (existing) {
        await tx.interestRanking.delete({ where: { id: ranking.id } });
      } else {
        await tx.interestRanking.update({
          where: { id: ranking.id },
          data: { rankerId: userId },
        });
      }
    }

    // RelationshipContext has @@unique([rankerId, subjectId]).
    const guestContexts = await tx.relationshipContext.findMany({
      where: { rankerId: guestId },
    });
    for (const ctx of guestContexts) {
      const existing = await tx.relationshipContext.findUnique({
        where: {
          rankerId_subjectId: { rankerId: userId, subjectId: ctx.subjectId },
        },
      });
      if (existing) {
        await tx.relationshipContext.delete({ where: { id: ctx.id } });
      } else {
        await tx.relationshipContext.update({
          where: { id: ctx.id },
          data: { rankerId: userId },
        });
      }
    }

    await tx.interest.updateMany({
      where: { contributedById: guestId },
      data: { contributedById: userId },
    });
    await tx.friendNote.updateMany({
      where: { ownerId: guestId },
      data: { ownerId: userId },
    });
    await tx.milestoneEntry.updateMany({
      where: { ownerId: guestId },
      data: { ownerId: userId },
    });

    await tx.user.delete({ where: { id: guestId } });
  },
  // Row counts are small but the DB is remote — more headroom than the 5s
  // default for the sequential collision checks.
  { timeout: 30_000 });
}

/** Merge the current browser's guest draft (if any) into the signed-in user.
 *  Safe wherever request cookies are readable; no-op when nothing to merge. */
export async function absorbGuestDraft(userId: string): Promise<void> {
  const jar = await cookies();
  const token = jar.get(GUEST_COOKIE)?.value;
  if (!token) return;
  const guest = await prisma.user.findUnique({ where: { guestToken: token } });
  if (guest && guest.id !== userId) {
    await mergeGuestIntoUser(guest.id, userId);
  }
}
