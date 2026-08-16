"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildRecommendationInput, giverOwnsReceiver } from "@/lib/recommend-data";
import { generateRecommendations } from "@/lib/recommendation";

// Flow 6 (FR-26–31) server actions. Recommendations are a Giver action, so every
// action requires a signed-in Giver who actually added this receiver.

async function requireGiver(receiverId: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/recommend/${receiverId}`)}`);
  }
  if (!(await giverOwnsReceiver(session.user.id, receiverId))) redirect("/friends");
  return session.user.id;
}

const budgetSchema = z.coerce.number().positive().max(100000);

/** FR-26 — generate a ranked set for (receiver, occasion, optional budget),
 *  persist the request + result, then show it. */
export async function requestRecommendation(
  receiverId: string,
  formData: FormData,
): Promise<void> {
  const giverId = await requireGiver(receiverId);

  const occasionRaw = String(formData.get("occasion") ?? "").trim().slice(0, 40);
  const occasion = occasionRaw || null;
  const budgetParsed = budgetSchema.safeParse(formData.get("budget"));
  const budgetOverride = budgetParsed.success ? budgetParsed.data : null;

  const input = await buildRecommendationInput(giverId, receiverId, {
    occasion,
    budgetOverride,
  });
  const output = generateRecommendations(input);

  const request = await prisma.recommendationRequest.create({
    data: {
      giverId,
      receiverId,
      occasionTag: occasion,
      budgetOverride,
      result: { create: { suggestions: JSON.stringify(output) } },
    },
  });

  redirect(`/recommend/${receiverId}?request=${request.id}`);
}

const feedbackSchema = z.object({
  index: z.coerce.number().int().min(0).max(3),
  value: z.enum(["like", "not_for_them"]),
});

/** FR-29 — lightweight per-suggestion relevance feedback, stored on the result. */
export async function submitFeedback(
  requestId: string,
  formData: FormData,
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/friends");

  const parsed = feedbackSchema.safeParse({
    index: formData.get("index"),
    value: formData.get("value"),
  });

  const request = await prisma.recommendationRequest.findUnique({
    where: { id: requestId },
    include: { result: true },
  });
  if (!request || request.giverId !== session.user.id) redirect("/friends");
  if (!parsed.success || !request.result) {
    redirect(`/recommend/${request.receiverId}?request=${requestId}`);
  }

  try {
    const payload = JSON.parse(request.result.suggestions);
    const list = Array.isArray(payload.suggestions) ? payload.suggestions : [];
    if (list[parsed.data.index]) {
      // Toggle off if the same choice is tapped again.
      list[parsed.data.index].feedback =
        list[parsed.data.index].feedback === parsed.data.value ? null : parsed.data.value;
      await prisma.recommendationResult.update({
        where: { requestId },
        data: { suggestions: JSON.stringify({ ...payload, suggestions: list }) },
      });
    }
  } catch {
    // Corrupt payload — nothing to update; fall through to a clean re-render.
  }

  redirect(`/recommend/${request.receiverId}?request=${requestId}`);
}

const reasoningSchema = z.string().trim().min(1).max(500);

/** Design Principle 4 — the optional "why this one feels right" line the Giver
 *  adds before acting, keeping the last step a human one. Logged privately. */
export async function addReasoning(
  requestId: string,
  formData: FormData,
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/friends");

  const request = await prisma.recommendationRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.giverId !== session.user.id) redirect("/friends");

  const parsed = reasoningSchema.safeParse(formData.get("reasoning"));
  if (parsed.success) {
    await prisma.friendNote.create({
      data: {
        ownerId: session.user.id,
        subjectId: request.receiverId,
        noteText: parsed.data,
      },
    });
  }

  redirect(`/recommend/${request.receiverId}?request=${requestId}&noted=1`);
}
