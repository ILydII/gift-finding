"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stashPendingProfile } from "@/lib/pending-profile";

// Server actions behind the combined sign-in screen — the single front door
// for both entry points (self-starting Giver, invited Receiver). Each stashes
// any optional name/birth-year before handing off to the provider, and
// carries a redirectTo so auth lands back where the user was headed.

function safeRedirectTo(raw: unknown): string {
  const value = typeof raw === "string" ? raw : "/";
  // Only allow same-site paths — never absolute URLs from form data.
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function signInWithMagicLink(formData: FormData): Promise<void> {
  const email = z
    .string()
    .email()
    .safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  const redirectTo = safeRedirectTo(formData.get("redirectTo"));

  if (!email.success) {
    redirect(
      `/signin?error=invalid_email&callbackUrl=${encodeURIComponent(redirectTo)}`,
    );
  }

  await stashPendingProfile(formData);

  try {
    await signIn("resend", { email: email.data, redirectTo });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(
        `/signin?error=email_send&callbackUrl=${encodeURIComponent(redirectTo)}`,
      );
    }
    throw err; // NEXT_REDIRECT on success must propagate
  }
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const redirectTo = safeRedirectTo(formData.get("redirectTo"));
  await stashPendingProfile(formData);
  await signIn("google", { redirectTo });
}

/** Demo onboarding: name (+ optional age) → account → straight to your profile.
 *  The working sign-in path while email delivery is off. */
export async function demoSignIn(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  // Land new users on their own profile first (unless they came from a
  // specific place, e.g. an invite link).
  let redirectTo = safeRedirectTo(formData.get("redirectTo"));
  if (redirectTo === "/") redirectTo = "/profile";

  if (!name) {
    redirect(`/signin?error=demo_name&callbackUrl=${encodeURIComponent(redirectTo)}`);
  }

  // Accept an age and store it as a birth year.
  const ageNum = Number(String(formData.get("age") ?? "").trim());
  const birthYear =
    Number.isFinite(ageNum) && ageNum > 0 && ageNum < 120
      ? String(new Date().getFullYear() - Math.floor(ageNum))
      : "";

  try {
    await signIn("demo", { name, birthYear, redirectTo });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/signin?error=demo&callbackUrl=${encodeURIComponent(redirectTo)}`);
    }
    throw err; // NEXT_REDIRECT on success must propagate
  }
}

export async function signInWithPassword(formData: FormData): Promise<void> {
  const redirectTo = safeRedirectTo(formData.get("redirectTo"));
  await stashPendingProfile(formData);
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      password: String(formData.get("password") ?? ""),
      redirectTo,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(
        `/signin?error=bad_credentials&callbackUrl=${encodeURIComponent(redirectTo)}`,
      );
    }
    throw err;
  }
}

/** Dev-only convenience: create an email/password account then sign in.
 *  Production auth is Google + magic link only. */
export async function registerWithPassword(formData: FormData): Promise<void> {
  if (process.env.NODE_ENV === "production") redirect("/signin");

  const redirectTo = safeRedirectTo(formData.get("redirectTo"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const parsed = z
    .object({ email: z.string().email(), password: z.string().min(8) })
    .safeParse({ email, password });
  if (!parsed.success) {
    redirect(
      `/signin?error=invalid_register&callbackUrl=${encodeURIComponent(redirectTo)}`,
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.passwordHash) {
    redirect(
      `/signin?error=email_taken&callbackUrl=${encodeURIComponent(redirectTo)}`,
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  if (existing) {
    // e.g. an unclaimed record with this email — attach credentials, keep its
    // claim status (claiming itself happens through the invite token flow).
    await prisma.user.update({ where: { email }, data: { passwordHash } });
  } else {
    await prisma.user.create({
      data: { email, passwordHash, claimStatus: "claimed" },
    });
  }

  await signInWithPassword(formData);
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
