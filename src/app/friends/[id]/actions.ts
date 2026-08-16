"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { RELATIONSHIP_TYPES, GIFTING_PHILOSOPHIES } from "@/lib/constants";

// Per-friend hub actions: the gifting preferences (moved off the global user
// profile) and the gift-history log both live per Giver-Receiver pair.

const VALID_PHILOSOPHY = new Set<string>(GIFTING_PHILOSOPHIES.map((p) => p.value));

async function requireGiver(friendId: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/friends/${friendId}`)}`);
  }
  const edge = await prisma.friendEdge.findUnique({
    where: { userAId_userBId: { userAId: session.user.id, userBId: friendId } },
  });
  if (!edge) redirect("/friends");
  return session.user.id;
}

/** Relationship + per-friend gifting style + sizes/brands, all on RelationshipContext. */
export async function saveFriendPrefs(friendId: string, formData: FormData): Promise<void> {
  const giverId = await requireGiver(friendId);

  const relRaw = String(formData.get("relationship") ?? "");
  const relationshipType = RELATIONSHIP_TYPES.some((r) => r.value === relRaw) ? relRaw : "friend";

  const philosophyTags = formData
    .getAll("philosophy")
    .map(String)
    .filter((v) => VALID_PHILOSOPHY.has(v));

  const riskRaw = String(formData.get("risk") ?? "");
  const riskTolerance = riskRaw === "safe" || riskRaw === "bold" ? riskRaw : null;

  const sizes = String(formData.get("sizes") ?? "").trim().slice(0, 300) || null;
  const brandsRaw = String(formData.get("brands") ?? "").trim().slice(0, 300);
  const favoriteBrands = brandsRaw
    ? JSON.stringify(
        brandsRaw
          .split(",")
          .map((b) => b.trim())
          .filter(Boolean)
          .slice(0, 20),
      )
    : null;

  const data = {
    relationshipType,
    philosophyTags: philosophyTags.length ? JSON.stringify(philosophyTags) : null,
    riskTolerance,
    sizes,
    favoriteBrands,
  };

  await prisma.relationshipContext.upsert({
    where: { rankerId_subjectId: { rankerId: giverId, subjectId: friendId } },
    update: data,
    create: { rankerId: giverId, subjectId: friendId, ...data },
  });

  redirect(`/friends/${friendId}?saved=prefs`);
}

const giftSchema = z.object({
  title: z.string().trim().min(1).max(120),
  occasion: z.string().trim().max(60).optional(),
  yearGiven: z.coerce.number().int().min(1900).max(2100).optional(),
  notes: z.string().trim().max(300).optional(),
});

/** Log a gift already given — the engine reads these to avoid repeats. */
export async function addGift(friendId: string, formData: FormData): Promise<void> {
  const giverId = await requireGiver(friendId);
  const parsed = giftSchema.safeParse({
    title: formData.get("title"),
    occasion: String(formData.get("occasion") ?? "").trim() || undefined,
    yearGiven: String(formData.get("yearGiven") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  if (!parsed.success) redirect(`/friends/${friendId}?error=gift#history`);

  await prisma.giftGiven.create({
    data: {
      giverId,
      receiverId: friendId,
      title: parsed.data.title,
      occasion: parsed.data.occasion ?? null,
      yearGiven: parsed.data.yearGiven ?? null,
      notes: parsed.data.notes ?? null,
    },
  });
  redirect(`/friends/${friendId}?saved=gift#history`);
}

export async function deleteGift(friendId: string, giftId: string): Promise<void> {
  const giverId = await requireGiver(friendId);
  const gift = await prisma.giftGiven.findUnique({ where: { id: giftId } });
  if (gift && gift.giverId === giverId) {
    await prisma.giftGiven.delete({ where: { id: giftId } });
  }
  redirect(`/friends/${friendId}?saved=gift#history`);
}
