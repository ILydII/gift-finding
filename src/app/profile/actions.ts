"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  DEFAULT_BUDGET_BANDS,
  GIFTING_PHILOSOPHIES,
  PLANNING_STYLES,
  RISK_TOLERANCES,
} from "@/lib/constants";

// Server actions behind /profile — the signed-in user's own personal info
// (FR-2/3), gifting-style preferences (FR-24/25), and wishlist (FR-9/10/11).
// None of this is a first-screen ask; every field here is optional and
// editable at the user's own pace, from a real account only.

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin?callbackUrl=%2Fprofile");
  return session.user.id;
}

// ---------------------------------------------------------------------------
// Personal info (FR-2/3) — name, birth year, gender, city-level location.
// ---------------------------------------------------------------------------

export async function savePersonalInfo(formData: FormData): Promise<void> {
  const userId = await requireUserId();

  const name = String(formData.get("name") ?? "").trim().slice(0, 60) || null;
  const rawBirthYear = String(formData.get("birthYear") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim().slice(0, 40) || null;
  const location = String(formData.get("location") ?? "").trim().slice(0, 60) || null;

  let birthYear: number | null = null;
  if (rawBirthYear) {
    const parsed = z.coerce
      .number()
      .int()
      .min(1900)
      .max(new Date().getFullYear())
      .safeParse(rawBirthYear);
    if (!parsed.success) redirect("/profile?error=birth_year");
    birthYear = parsed.data;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { name, birthYear, gender, location },
  });

  redirect("/profile?saved=personal");
}

// ---------------------------------------------------------------------------
// Gifting style (FR-24/25) — budget default, philosophy, planning, risk.
// Introduced lazily before a Giver's first recommendation view (Flow 5); this
// screen is where it's edited afterward, at any pace.
// ---------------------------------------------------------------------------

export async function saveGiftingStyle(formData: FormData): Promise<void> {
  const userId = await requireUserId();

  const bandValue = String(formData.get("budgetBand") ?? "");
  const band = DEFAULT_BUDGET_BANDS.find((b) => b.value === bandValue);

  const philosophyTags = formData
    .getAll("philosophy")
    .map(String)
    .filter((v) => GIFTING_PHILOSOPHIES.some((p) => p.value === v));

  const planningStyle = PLANNING_STYLES.some(
    (p) => p.value === formData.get("planningStyle"),
  )
    ? String(formData.get("planningStyle"))
    : null;

  const riskTolerance = RISK_TOLERANCES.some(
    (r) => r.value === formData.get("riskTolerance"),
  )
    ? String(formData.get("riskTolerance"))
    : null;

  await prisma.giftingStyleProfile.upsert({
    where: { userId },
    update: {
      defaultBudgetMin: band?.min ?? null,
      defaultBudgetMax: band?.max ?? null,
      philosophyTags: philosophyTags.length ? JSON.stringify(philosophyTags) : null,
      planningStyle,
      riskTolerance,
    },
    create: {
      userId,
      defaultBudgetMin: band?.min ?? null,
      defaultBudgetMax: band?.max ?? null,
      philosophyTags: philosophyTags.length ? JSON.stringify(philosophyTags) : null,
      planningStyle,
      riskTolerance,
    },
  });

  redirect("/profile?saved=style");
}

// ---------------------------------------------------------------------------
// Wishlist (FR-9/10/11) — specific items, optional and secondary, editable
// any time. Never part of the claim flow (PRD ruling #13) — this is its home.
// ---------------------------------------------------------------------------

const wishlistSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  link: z.string().trim().max(500).optional(),
  price: z.coerce.number().nonnegative().optional(),
  visibility: z.enum(["public", "private"]),
});

function parseWishlistForm(formData: FormData) {
  const rawLink = String(formData.get("link") ?? "").trim();
  const rawPrice = String(formData.get("price") ?? "").trim();

  return wishlistSchema.safeParse({
    title: formData.get("title"),
    description: String(formData.get("description") ?? "").trim() || undefined,
    link: rawLink || undefined,
    price: rawPrice || undefined,
    visibility: formData.get("visibility") === "private" ? "private" : "public",
  });
}

export async function addWishlistItem(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const parsed = parseWishlistForm(formData);
  if (!parsed.success) redirect("/profile?error=wishlist");

  await prisma.wishlistItem.create({
    data: {
      ownerId: userId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      link: parsed.data.link ?? null,
      price: parsed.data.price ?? null,
      visibility: parsed.data.visibility,
    },
  });

  redirect("/profile?saved=wishlist#wishlist");
}

export async function updateWishlistItem(
  itemId: string,
  formData: FormData,
): Promise<void> {
  const userId = await requireUserId();
  const item = await prisma.wishlistItem.findUnique({ where: { id: itemId } });
  if (!item || item.ownerId !== userId) redirect("/profile");

  const parsed = parseWishlistForm(formData);
  if (!parsed.success) redirect("/profile?error=wishlist#wishlist");

  await prisma.wishlistItem.update({
    where: { id: itemId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      link: parsed.data.link ?? null,
      price: parsed.data.price ?? null,
      visibility: parsed.data.visibility,
    },
  });

  redirect("/profile?saved=wishlist#wishlist");
}

export async function deleteWishlistItem(itemId: string): Promise<void> {
  const userId = await requireUserId();
  const item = await prisma.wishlistItem.findUnique({ where: { id: itemId } });
  if (!item || item.ownerId !== userId) redirect("/profile");

  await prisma.wishlistItem.delete({ where: { id: itemId } });
  redirect("/profile?saved=wishlist#wishlist");
}
