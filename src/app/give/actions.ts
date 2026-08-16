"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getActor, getViewer, absorbGuestDraft } from "@/lib/guest";
import { sendEmail, inviteEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/url";
import { DISPLAY_SLUGS } from "@/lib/taxonomy";
import { RELATIONSHIP_TYPES } from "@/lib/constants";

// Server actions for the Giver flow G1–G5 (PRD §3A). All of G1–G3 works for a
// guest; the only gate is sendInvite (PRD §5).

const INVITE_TTL_DAYS = 30;
const MAX_GUEST_DRAFTS = 20; // cheap FR-27 stand-in until IP limiting exists
const NEW_ACCOUNT_INVITES_PER_DAY = 10; // FR-27, accounts < 7 days old
const RECIPIENT_COOLDOWN_HOURS = 72; // FR-27, per recipient address

/** Ownership check shared by every step: the edge must belong to the current
 *  viewer (signed-in user or this browser's guest). */
async function loadOwnedEdge(edgeId: string) {
  const { user } = await getViewer();
  if (!user) return null;
  const edge = await prisma.friendEdge.findUnique({
    where: { id: edgeId },
    include: { userB: true },
  });
  if (!edge || edge.userAId !== user.id) return null;
  return { edge, actor: user };
}

// ---------------------------------------------------------------------------
// G1 — "Who are you trying to find a gift for?"
// ---------------------------------------------------------------------------

export async function startGiftSearch(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "")
    .trim()
    .slice(0, 40);
  if (!name) redirect("/");

  const { user: actor, isGuest } = await getActor();

  // FR-26 — same-Giver duplicate: route back into the existing record.
  const existing = await prisma.friendEdge.findFirst({
    where: {
      userAId: actor.id,
      userB: { name: { equals: name, mode: "insensitive" } },
    },
  });
  if (existing) redirect(`/give/${existing.id}?back=1`);

  if (isGuest) {
    const draftCount = await prisma.friendEdge.count({
      where: { userAId: actor.id },
    });
    if (draftCount >= MAX_GUEST_DRAFTS) {
      redirect(`/?error=too_many_drafts`);
    }
  }

  const target = await prisma.user.create({
    data: { name, claimStatus: "unclaimed" },
  });
  const edge = await prisma.friendEdge.create({
    data: { userAId: actor.id, userBId: target.id, status: "draft" },
  });

  redirect(`/give/${edge.id}`);
}

// ---------------------------------------------------------------------------
// G2 — relationship + interest selection (selection order = provisional rank)
// ---------------------------------------------------------------------------

const selectionSchema = z.array(z.string().max(80)).max(30);

export async function saveContribution(
  edgeId: string,
  formData: FormData,
): Promise<void> {
  const owned = await loadOwnedEdge(edgeId);
  if (!owned) redirect("/");
  const { edge, actor } = owned;
  const targetId = edge.userBId;

  const relationship = String(formData.get("relationship") ?? "");
  const relationshipValid = RELATIONSHIP_TYPES.some(
    (r) => r.value === relationship,
  );
  const skip = formData.get("skip") === "1";

  let slugs: string[] = [];
  if (!skip) {
    try {
      slugs = selectionSchema
        .parse(JSON.parse(String(formData.get("selection") ?? "[]")))
        .filter((s) => DISPLAY_SLUGS.has(s));
    } catch {
      redirect(`/give/${edgeId}?error=selection`);
    }
  }

  // Batched writes, not per-row upserts: against a remote pooled Postgres,
  // N sequential round-trips inside one interactive transaction blows the
  // 5s transaction budget (observed with 15 selections).
  const existing = await prisma.interest.findMany({
    where: {
      ownerId: targetId,
      contributedById: actor.id,
      taxonomyTag: { not: null },
    },
  });
  const keepSet = new Set(slugs);
  const toDeleteIds = existing
    .filter((e) => !keepSet.has(e.taxonomyTag!))
    .map((e) => e.id);
  const idBySlug = new Map(existing.map((e) => [e.taxonomyTag!, e.id]));

  const toCreate = slugs.filter((s) => !idBySlug.has(s));
  if (toCreate.length > 0) {
    const created = await prisma.interest.createManyAndReturn({
      data: toCreate.map((slug) => ({
        ownerId: targetId,
        contributedById: actor.id,
        taxonomyTag: slug,
      })),
    });
    for (const c of created) idBySlug.set(c.taxonomyTag!, c.id);
  }

  const pre =
    edge.userB.claimStatus === "unclaimed" ? "pre_invite" : "post_invite";
  const rankingRows = slugs.map((slug, index) => ({
    rankerId: actor.id,
    subjectId: targetId,
    interestId: idBySlug.get(slug)!,
    // PRD §4: only the first 10 selections carry ordinal weight.
    rankValue: index < 10 ? index + 1 : null,
    confidenceUnsure: index >= 10,
    contributedPreOrPost: pre,
  }));

  await prisma.$transaction([
    ...(toDeleteIds.length > 0
      ? [prisma.interest.deleteMany({ where: { id: { in: toDeleteIds } } })]
      : []),
    prisma.interestRanking.deleteMany({
      where: { rankerId: actor.id, subjectId: targetId },
    }),
    ...(rankingRows.length > 0
      ? [prisma.interestRanking.createMany({ data: rankingRows })]
      : []),
    ...(relationshipValid
      ? [
          prisma.relationshipContext.upsert({
            where: {
              rankerId_subjectId: { rankerId: actor.id, subjectId: targetId },
            },
            update: { relationshipType: relationship },
            create: {
              rankerId: actor.id,
              subjectId: targetId,
              relationshipType: relationship,
            },
          }),
        ]
      : []),
  ]);

  // Whole-step escape hatch (PRD §4 tier 3) goes straight to the send screen.
  redirect(skip ? `/give/${edgeId}/send` : `/give/${edgeId}/rank`);
}

// ---------------------------------------------------------------------------
// G3 — rank, refine, add
// ---------------------------------------------------------------------------

const rowsSchema = z
  .array(
    z.union([
      z.object({ id: z.string() }),
      z.object({ freeText: z.string().trim().min(1).max(50) }),
    ]),
  )
  .max(40);

export async function saveRanking(
  edgeId: string,
  formData: FormData,
): Promise<void> {
  const owned = await loadOwnedEdge(edgeId);
  if (!owned) redirect("/");
  const { edge, actor } = owned;
  const targetId = edge.userBId;

  const notSure = formData.get("notSure") === "1";
  const note = String(formData.get("note") ?? "")
    .trim()
    .slice(0, 1000);

  let rows: z.infer<typeof rowsSchema>;
  try {
    rows = rowsSchema.parse(JSON.parse(String(formData.get("rows") ?? "[]")));
  } catch {
    redirect(`/give/${edgeId}/rank?error=rows`);
  }

  // Same batching rationale as saveContribution: no per-row round-trips.
  const existing = await prisma.interest.findMany({
    where: { ownerId: targetId, contributedById: actor.id },
  });
  const existingIds = new Set(existing.map((e) => e.id));
  const keptRows = rows.filter((r) => !("id" in r) || existingIds.has(r.id));
  const keptIds = new Set(
    keptRows.filter((r): r is { id: string } => "id" in r).map((r) => r.id),
  );
  const toDeleteIds = existing
    .filter((e) => !keptIds.has(e.id))
    .map((e) => e.id);

  // New custom entries (client dedupes labels case-insensitively).
  const customRows = keptRows.filter(
    (r): r is { freeText: string } => "freeText" in r,
  );
  const idByFreeText = new Map<string, string>();
  if (customRows.length > 0) {
    const created = await prisma.interest.createManyAndReturn({
      data: customRows.map((r) => ({
        ownerId: targetId,
        contributedById: actor.id,
        freeText: r.freeText,
      })),
    });
    for (const c of created) idByFreeText.set(c.freeText!.toLowerCase(), c.id);
  }

  const pre =
    edge.userB.claimStatus === "unclaimed" ? "pre_invite" : "post_invite";
  const rankingRows = keptRows
    .map((row, i) => {
      const interestId =
        "id" in row ? row.id : idByFreeText.get(row.freeText.toLowerCase());
      if (!interestId) return null;
      const ranked = !notSure && i < 10;
      return {
        rankerId: actor.id,
        subjectId: targetId,
        interestId,
        rankValue: ranked ? i + 1 : null,
        confidenceUnsure: !ranked,
        contributedPreOrPost: pre,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  await prisma.$transaction([
    ...(toDeleteIds.length > 0
      ? [prisma.interest.deleteMany({ where: { id: { in: toDeleteIds } } })]
      : []),
    prisma.interestRanking.deleteMany({
      where: { rankerId: actor.id, subjectId: targetId },
    }),
    ...(rankingRows.length > 0
      ? [prisma.interestRanking.createMany({ data: rankingRows })]
      : []),
  ]);

  // One optional private note (FR-14). Only-you, forever (PRD §6.5).
  const existingNote = await prisma.friendNote.findFirst({
    where: { ownerId: actor.id, subjectId: targetId },
  });
  if (note) {
    if (existingNote) {
      await prisma.friendNote.update({
        where: { id: existingNote.id },
        data: { noteText: note },
      });
    } else {
      await prisma.friendNote.create({
        data: { ownerId: actor.id, subjectId: targetId, noteText: note },
      });
    }
  } else if (existingNote) {
    await prisma.friendNote.delete({ where: { id: existingNote.id } });
  }

  redirect(`/give/${edgeId}/send`);
}

// ---------------------------------------------------------------------------
// G4 — send (the only gate; requires a signed-in sender)
// ---------------------------------------------------------------------------

export async function sendInvite(
  edgeId: string,
  formData: FormData,
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/give/${edgeId}/send?error=auth`);
  }
  const userId = session.user.id;

  // The guest draft may not have merged yet (e.g. auth event failed) — this is
  // the moment it must be real, so retry here before the ownership check.
  await absorbGuestDraft(userId);

  const edge = await prisma.friendEdge.findUnique({
    where: { id: edgeId },
    include: { userB: true },
  });
  if (!edge || edge.userAId !== userId) redirect("/");

  let sender = await prisma.user.findUnique({ where: { id: userId } });
  if (!sender) redirect("/");

  // Magic-link accounts start nameless; the invite needs a human sender.
  const senderName = String(formData.get("senderName") ?? "")
    .trim()
    .slice(0, 60);
  if (!sender.name && senderName) {
    sender = await prisma.user.update({
      where: { id: userId },
      data: { name: senderName },
    });
  }

  const mode = formData.get("mode") === "link" ? "link" : "email";
  const personalLine =
    String(formData.get("personalLine") ?? "")
      .trim()
      .slice(0, 140) || null;
  const rawEmail = String(formData.get("recipientEmail") ?? "")
    .trim()
    .toLowerCase();

  let recipientEmail: string | null = null;
  if (mode === "email") {
    const parsed = z.string().email().safeParse(rawEmail);
    if (!parsed.success) {
      redirect(`/give/${edgeId}/send?error=email`);
    }
    recipientEmail = parsed.data;

    // Giver-adds-themselves (PRD §8): catch on email match at send.
    if (sender.email && recipientEmail === sender.email.toLowerCase()) {
      redirect(`/give/${edgeId}/send?error=self`);
    }
  }

  // FR-27 — young accounts get a daily invite cap.
  const accountAgeMs = Date.now() - sender.createdAt.getTime();
  if (accountAgeMs < 7 * 24 * 60 * 60 * 1000) {
    const recentCount = await prisma.invite.count({
      where: {
        inviterId: userId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recentCount >= NEW_ACCOUNT_INVITES_PER_DAY) {
      redirect(`/give/${edgeId}/send?error=rate`);
    }
  }

  // Reuse the pending invite for this edge if one exists (re-sends extend it).
  const pending = await prisma.invite.findFirst({
    where: { inviterId: userId, targetId: edge.userBId, status: "pending" },
  });
  const token = pending?.token ?? randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  if (pending) {
    await prisma.invite.update({
      where: { id: pending.id },
      data: { email: recipientEmail ?? pending.email, expiresAt },
    });
  } else {
    await prisma.invite.create({
      data: {
        token,
        inviterId: userId,
        targetId: edge.userBId,
        email: recipientEmail,
        expiresAt,
      },
    });
  }

  // Keep contact on the unclaimed record when it doesn't collide with an
  // existing account's unique email.
  if (recipientEmail && !edge.userB.email) {
    const emailOwner = await prisma.user.findUnique({
      where: { email: recipientEmail },
    });
    if (!emailOwner) {
      await prisma.user.update({
        where: { id: edge.userBId },
        data: { email: recipientEmail },
      });
    }
  }

  if (edge.status === "draft") {
    await prisma.friendEdge.update({
      where: { id: edge.id },
      data: { status: "invited" },
    });
  }

  let emailParam = "";
  if (mode === "email" && recipientEmail) {
    // FR-21 suppression and FR-27 recipient cooldown: the invite link still
    // exists, we just don't email.
    const suppressed = await prisma.suppressedEmail.findUnique({
      where: { email: recipientEmail },
    });
    const recentToAddress = await prisma.invite.findFirst({
      where: {
        email: recipientEmail,
        createdAt: {
          gte: new Date(Date.now() - RECIPIENT_COOLDOWN_HOURS * 60 * 60 * 1000),
        },
        NOT: { token },
      },
    });

    if (!suppressed && !recentToAddress) {
      const baseUrl = await getBaseUrl();
      const result = await sendEmail({
        to: recipientEmail,
        ...inviteEmail({
          giverName: sender.name ?? sender.email ?? "A friend",
          targetName: edge.userB.name ?? "you",
          personalLine,
          claimUrl: `${baseUrl}/invite/${token}`,
        }),
      });
      // PRD §3A G4: never lose the work over a delivery failure.
      if (!result.delivered) emailParam = "?email=failed";
    }
  }

  redirect(`/give/${edgeId}/sent${emailParam}`);
}
