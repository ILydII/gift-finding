import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// The combined sign-in screen collects optional name/birth-year alongside
// auth (per the account-timing reversal — see docs/PRD-onboarding-and-
// friend-adding.md addendum). Since auth completion for Google is a redirect
// round-trip through Google, and for magic link is a separate click on an
// emailed link, the values can't ride along in the request that finishes
// auth — they're stashed here and applied once a session exists.

const COOKIE = "gf_pending_profile";
const MAX_AGE_SECONDS = 15 * 60; // just long enough to complete sign-in

export async function stashPendingProfile(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const rawBirthYear = String(formData.get("birthYear") ?? "").trim();
  if (!name && !rawBirthYear) return;

  const birthYear = Number.isInteger(Number(rawBirthYear))
    ? Number(rawBirthYear)
    : null;
  const currentYear = new Date().getFullYear();
  const validBirthYear =
    birthYear && birthYear >= 1900 && birthYear <= currentYear ? birthYear : null;

  const jar = await cookies();
  jar.set(COOKIE, JSON.stringify({ name: name || null, birthYear: validBirthYear }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

/** Called from the Auth.js signIn event. Only fills fields that are
 *  currently null — never overwrites what a provider or the user already
 *  set (e.g. a name Google already supplied). */
export async function applyPendingProfile(userId: string): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return;
  jar.set(COOKIE, "", { maxAge: 0, path: "/" });

  let parsed: { name: string | null; birthYear: number | null };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const data: { name?: string; birthYear?: number } = {};
  if (!user.name && parsed.name) data.name = parsed.name;
  if (user.birthYear === null && parsed.birthYear) data.birthYear = parsed.birthYear;
  if (Object.keys(data).length > 0) {
    await prisma.user.update({ where: { id: userId }, data });
  }
}
