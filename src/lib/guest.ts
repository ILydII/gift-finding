import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { GUEST_COOKIE } from "@/lib/guest-merge";
import type { User } from "@/generated/prisma/client";

export { GUEST_COOKIE, mergeGuestIntoUser, absorbGuestDraft } from "@/lib/guest-merge";

// Guest Giver support (PRD §5, FR-2/3/6): a brand-new visitor gets a real User
// row with isGuest=true, keyed by an opaque token in an httpOnly cookie. There
// is no separate draft store — account creation merges these rows in place.

const GUEST_TTL_DAYS = 30;

export async function getGuestUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(GUEST_COOKIE)?.value;
  if (!token) return null;
  return prisma.user.findUnique({ where: { guestToken: token } });
}

/** Server-action only (sets a cookie). Returns the existing guest for this
 *  browser, or creates one. */
export async function getOrCreateGuestUser(): Promise<User> {
  const existing = await getGuestUser();
  if (existing) return existing;

  const token = randomBytes(32).toString("hex");
  const guest = await prisma.user.create({
    data: { isGuest: true, guestToken: token, claimStatus: "claimed" },
  });

  const jar = await cookies();
  jar.set(GUEST_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: GUEST_TTL_DAYS * 24 * 60 * 60,
    path: "/",
  });
  return guest;
}

/** The acting user for a mutation: the signed-in user if present, else the
 *  browser's guest row (created on demand). */
export async function getActor(): Promise<{ user: User; isGuest: boolean }> {
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (user) return { user, isGuest: false };
  }
  return { user: await getOrCreateGuestUser(), isGuest: true };
}

/** Read-only variant for pages: never creates rows during render. */
export async function getViewer(): Promise<{
  user: User | null;
  isGuest: boolean;
}> {
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (user) return { user, isGuest: false };
  }
  const guest = await getGuestUser();
  return { user: guest, isGuest: guest !== null };
}
