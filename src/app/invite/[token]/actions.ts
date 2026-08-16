"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail, claimNotificationEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/url";
import { loadInvite, inviteState } from "@/lib/invite-data";

// Receiver claim flow actions. Sign-in now happens before the invite ever
// shows anything (see PRD addendum — account timing reversed), so every
// action here runs against a real, signed-in account.

// ---------------------------------------------------------------------------
// "I'd rather not be in this" (FR-21) — one tap + one confirm. Hard-deletes
// everything recorded about the person; suppresses the address; the Giver
// only ever learns "isn't using this".
// ---------------------------------------------------------------------------

export async function declineInvite(token: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(
      `/signin?callbackUrl=${encodeURIComponent(`/invite/${token}/decline`)}`,
    );
  }

  const invite = await loadInvite(token);
  if (!invite || inviteState(invite) !== "ok") redirect(`/invite/${token}`);

  const targetId = invite.targetId;
  const emailsToSuppress = [invite.email, invite.target.email].filter(
    (e): e is string => Boolean(e),
  );

  await prisma.$transaction(async (tx) => {
    // Everything recorded ABOUT this person goes: interests (rankings
    // cascade), relationship context, private notes, milestones.
    await tx.interest.deleteMany({ where: { ownerId: targetId } });
    await tx.relationshipContext.deleteMany({ where: { subjectId: targetId } });
    await tx.friendNote.deleteMany({ where: { subjectId: targetId } });
    await tx.milestoneEntry.deleteMany({ where: { subjectId: targetId } });

    // The record itself stays as a tombstone so the Giver's list can say
    // "isn't using this" — but stripped of contact info.
    await tx.user.update({
      where: { id: targetId },
      data: { email: null, phone: null, claimStatus: "declined" },
    });
    await tx.invite.updateMany({
      where: { targetId },
      data: { status: "declined", email: null },
    });

    for (const email of emailsToSuppress) {
      await tx.suppressedEmail.upsert({
        where: { email: email.toLowerCase() },
        update: {},
        create: { email: email.toLowerCase() },
      });
    }
  }, { timeout: 30_000 });

  redirect(`/invite/${token}/declined`);
}

// ---------------------------------------------------------------------------
// R2 edits — remove/add interests, applied as part of claiming.
// ---------------------------------------------------------------------------

const editsSchema = z.object({
  keepIds: z.array(z.string()).max(100),
  added: z.array(z.string().trim().min(1).max(50)).max(20),
});

async function applyEdits(
  targetId: string,
  formData: FormData,
): Promise<void> {
  const parsed = editsSchema.safeParse({
    keepIds: JSON.parse(String(formData.get("keepIds") ?? "[]")),
    added: JSON.parse(String(formData.get("added") ?? "[]")),
  });
  if (!parsed.success) return;
  const { keepIds, added } = parsed.data;

  // The list is the Receiver's now (PRD: "This is yours."): removals apply
  // to any contributor's entries, no confirm, never attributed back.
  // Batched (no per-label round-trips — remote DB latency adds up).
  const existing = await prisma.interest.findMany({
    where: { ownerId: targetId },
  });
  const toDeleteIds = existing
    .filter((e) => !keepIds.includes(e.id))
    .map((e) => e.id);

  const createData: {
    ownerId: string;
    contributedById: string;
    taxonomyTag: string | null;
    freeText: string | null;
  }[] = [];
  if (added.length > 0) {
    const allTags = await prisma.interestTag.findMany();
    const tagByLabel = new Map(allTags.map((t) => [t.label.toLowerCase(), t]));
    for (const label of added) {
      // Match against the taxonomy when the label lines up; free text else.
      const tag = tagByLabel.get(label.toLowerCase());
      const dupe = existing.find(
        (e) =>
          keepIds.includes(e.id) &&
          ((tag && e.taxonomyTag === tag.slug) ||
            e.freeText?.toLowerCase() === label.toLowerCase()),
      );
      if (dupe) continue;
      createData.push({
        ownerId: targetId,
        contributedById: targetId, // self-contributed from here on
        taxonomyTag: tag?.slug ?? null,
        freeText: tag ? null : label,
      });
    }
  }

  await prisma.$transaction([
    ...(toDeleteIds.length > 0
      ? [prisma.interest.deleteMany({ where: { id: { in: toDeleteIds } } })]
      : []),
    ...(createData.length > 0
      ? [prisma.interest.createMany({ data: createData })]
      : []),
  ]);
}

// ---------------------------------------------------------------------------
// Claim (FR-14): link the signed-in account to the unclaimed record, carry
// everything over, notify the Giver, and close the loop.
// ---------------------------------------------------------------------------

export async function claimInvite(
  token: string,
  formData: FormData,
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(
      `/signin?callbackUrl=${encodeURIComponent(`/invite/${token}/confirm`)}`,
    );
  }
  const userId = session.user.id;

  const invite = await loadInvite(token);
  if (!invite || inviteState(invite) !== "ok") redirect(`/invite/${token}`);

  await applyEdits(invite.targetId, formData);

  const targetId = invite.targetId;

  if (targetId === userId) {
    // The magic link / SSO email matched the unclaimed record, so the session
    // already IS that row — flip it in place.
    await prisma.user.update({
      where: { id: userId },
      data: { claimStatus: "claimed" },
    });
  } else {
    // Signed in with a different account than the invite's email matched —
    // absorb the unclaimed record's data into the account that's here.
    await prisma.$transaction(async (tx) => {
      await tx.interest.updateMany({
        where: { ownerId: targetId },
        data: { ownerId: userId },
      });
      // Self-contributed entries created pre-claim point at the old row.
      await tx.interest.updateMany({
        where: { contributedById: targetId },
        data: { contributedById: userId },
      });
      await tx.interestRanking.updateMany({
        where: { subjectId: targetId },
        data: { subjectId: userId },
      });
      await tx.wishlistItem.updateMany({
        where: { ownerId: targetId },
        data: { ownerId: userId },
      });
      await tx.friendNote.updateMany({
        where: { subjectId: targetId },
        data: { subjectId: userId },
      });
      await tx.milestoneEntry.updateMany({
        where: { subjectId: targetId },
        data: { subjectId: userId },
      });

      // RelationshipContext / FriendEdge have pair-unique constraints.
      const contexts = await tx.relationshipContext.findMany({
        where: { subjectId: targetId },
      });
      for (const ctx of contexts) {
        const existing = await tx.relationshipContext.findUnique({
          where: {
            rankerId_subjectId: {
              rankerId: ctx.rankerId,
              subjectId: userId,
            },
          },
        });
        if (existing) {
          await tx.relationshipContext.delete({ where: { id: ctx.id } });
        } else {
          await tx.relationshipContext.update({
            where: { id: ctx.id },
            data: { subjectId: userId },
          });
        }
      }

      const edges = await tx.friendEdge.findMany({
        where: { userBId: targetId },
      });
      for (const edge of edges) {
        const existing = await tx.friendEdge.findUnique({
          where: {
            userAId_userBId: { userAId: edge.userAId, userBId: userId },
          },
        });
        if (existing) {
          await tx.friendEdge.delete({ where: { id: edge.id } });
        } else {
          await tx.friendEdge.update({
            where: { id: edge.id },
            data: { userBId: userId },
          });
        }
      }

      await tx.invite.updateMany({
        where: { targetId, NOT: { id: invite.id } },
        data: { targetId: userId },
      });
      await tx.invite.update({
        where: { id: invite.id },
        data: { targetId: userId },
      });

      // Keep the human name if the account doesn't have one yet.
      const me = await tx.user.findUnique({ where: { id: userId } });
      await tx.user.update({
        where: { id: userId },
        data: {
          claimStatus: "claimed",
          name: me?.name ?? invite.target.name,
        },
      });

      await tx.user.delete({ where: { id: targetId } });
    },
    // Row counts here are small but the DB is remote — give the sequential
    // reads/writes more headroom than the 5s default.
    { timeout: 30_000 });
  }

  await prisma.invite.update({
    where: { id: invite.id },
    data: { status: "accepted", acceptedAt: new Date() },
  });
  await prisma.friendEdge.updateMany({
    where: { userAId: invite.inviterId, userBId: userId },
    data: { status: "accepted" },
  });

  // BRD FR-32 — tell the Giver, without revealing any edits (PRD §6).
  if (invite.inviter.email) {
    const baseUrl = await getBaseUrl();
    await sendEmail({
      to: invite.inviter.email,
      ...claimNotificationEmail({
        giverName: invite.inviter.name ?? "there",
        targetName: invite.target.name ?? "Your friend",
        friendUrl: `${baseUrl}/friends/${userId}`,
      }),
    });
  }

  redirect(`/invite/${token}/welcome`);
}
