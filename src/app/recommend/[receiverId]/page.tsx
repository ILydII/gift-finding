import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { firstName } from "@/lib/give-data";
import { giverOwnsReceiver } from "@/lib/recommend-data";
import { OCCASIONS } from "@/lib/constants";
import type { GiftSuggestion, OriginStream, SlotType } from "@/lib/recommendation";
import { requestRecommendation, submitFeedback, addReasoning } from "./actions";

export const dynamic = "force-dynamic";

// Flow 6 (PRD Processing & Output §6–7) — request a recommendation and view the
// four ranked ideas, each slot-typed, traceable, and with lightweight feedback.

const SLOT_BADGE: Record<SlotType, { label: string; className: string }> = {
  certainty: {
    label: "Sure thing",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  personally_anchored: {
    label: "From you",
    className: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  diversified: {
    label: "Worth a look",
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
};

const ORIGIN_LABEL: Partial<Record<OriginStream, string>> = {
  wishlist: "their wishlist",
  receiver_self: "their own tag",
  requesting_giver: "you ranked it",
  giver_note: "your note",
  shared_interest: "shared with you",
  gift_idea_note: "your idea",
  community: "their friends",
  giver_style: "your style",
  fallback: "safe default",
};

type StoredSuggestion = GiftSuggestion & { feedback?: "like" | "not_for_them" | null };

export default async function RecommendPage({
  params,
  searchParams,
}: {
  params: Promise<{ receiverId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { receiverId } = await params;
  const sp = await searchParams;
  const requestId = typeof sp.request === "string" ? sp.request : null;
  const justNoted = sp.noted === "1";

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/recommend/${receiverId}`)}`);
  }
  const giverId = session.user.id;
  if (!(await giverOwnsReceiver(giverId, receiverId))) redirect("/friends");

  const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
  if (!receiver) redirect("/friends");
  const name = firstName(receiver);

  // ---- Results view ----
  if (requestId) {
    const request = await prisma.recommendationRequest.findUnique({
      where: { id: requestId },
      include: { result: true },
    });
    if (!request || request.giverId !== giverId || request.receiverId !== receiverId) {
      redirect(`/recommend/${receiverId}`);
    }

    let suggestions: StoredSuggestion[] = [];
    let notices: string[] = [];
    try {
      const payload = JSON.parse(request.result?.suggestions ?? "{}");
      suggestions = Array.isArray(payload.suggestions) ? payload.suggestions : [];
      notices = Array.isArray(payload.notices) ? payload.notices : [];
    } catch {
      suggestions = [];
    }

    const occasionLabel =
      OCCASIONS.find((o) => o.value === request.occasionTag)?.label ??
      request.occasionTag ??
      "No occasion";

    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Gift ideas for {name}
            </h1>
            <p className="mt-1 text-sm text-foreground/60">
              {occasionLabel}
              {request.budgetOverride != null && ` · up to $${request.budgetOverride}`}
            </p>
          </div>
          <Link
            href={`/recommend/${receiverId}`}
            className="shrink-0 rounded-lg border border-black/15 px-3 py-1.5 text-sm transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            New search
          </Link>
        </div>

        {notices.length > 0 && (
          <ul className="mt-5 space-y-1.5 rounded-lg border border-black/10 bg-black/[.02] p-4 text-sm text-foreground/60 dark:border-white/10 dark:bg-white/[.03]">
            {notices.map((n, i) => (
              <li key={i}>· {n}</li>
            ))}
          </ul>
        )}

        <ol className="mt-6 space-y-4">
          {suggestions.map((s, i) => {
            const badge = SLOT_BADGE[s.slotType] ?? SLOT_BADGE.diversified;
            // The certainty slot only earns "Sure thing" when it's actually
            // wishlist/gift-idea backed; otherwise it fell back to the best
            // interest pick (§6 Slot 1 fallback) and shouldn't overclaim.
            const isBackedCertainty =
              s.originTrace.includes("wishlist") || s.originTrace.includes("gift_idea_note");
            const badgeLabel =
              s.slotType === "certainty" && !isBackedCertainty ? "Top pick" : badge.label;
            return (
              <li
                key={i}
                className="rounded-xl border border-black/10 p-5 shadow-sm dark:border-white/10"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                  >
                    {badgeLabel}
                  </span>
                  {s.level === "category" && (
                    <span className="text-xs text-foreground/40">a direction, not one exact thing</span>
                  )}
                  {s.priceEstimate && (
                    <span className="ml-auto text-sm text-foreground/60">{s.priceEstimate}</span>
                  )}
                </div>

                <p className="mt-2 text-lg font-medium">{s.title}</p>
                <p className="mt-1 text-sm text-foreground/70">{s.rationale}</p>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {s.originTrace
                    .filter((o) => ORIGIN_LABEL[o])
                    .map((o) => (
                      <span
                        key={o}
                        className="rounded-md bg-foreground/5 px-1.5 py-0.5 text-[11px] text-foreground/50"
                      >
                        {ORIGIN_LABEL[o]}
                      </span>
                    ))}
                  {s.diversityRepeat && (
                    <span className="text-[11px] text-foreground/40">· similar area (thin data)</span>
                  )}
                </div>

                <form action={submitFeedback.bind(null, requestId)} className="mt-4 flex gap-2">
                  <input type="hidden" name="index" value={i} />
                  <button
                    type="submit"
                    name="value"
                    value="like"
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      s.feedback === "like"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                    }`}
                  >
                    👍 Good call
                  </button>
                  <button
                    type="submit"
                    name="value"
                    value="not_for_them"
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      s.feedback === "not_for_them"
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                    }`}
                  >
                    🙅 Not for them
                  </button>
                </form>
              </li>
            );
          })}
        </ol>

        {suggestions.length === 0 && (
          <p className="mt-6 text-sm text-foreground/60">
            Something went wrong reading this result.{" "}
            <Link href={`/recommend/${receiverId}`} className="underline underline-offset-2">
              Try a new search
            </Link>
            .
          </p>
        )}

        {/* Design Principle 4 — the last step stays human. */}
        <div className="mt-8 rounded-xl border border-dashed border-black/15 p-5 dark:border-white/20">
          {justNoted ? (
            <p className="text-sm text-foreground/70">
              Saved — that&apos;s yours, kept private to you.
            </p>
          ) : (
            <form action={addReasoning.bind(null, requestId)} className="flex flex-col gap-2">
              <label htmlFor="reasoning" className="text-sm font-medium">
                Why does one of these feel right for {name}?
              </label>
              <textarea
                id="reasoning"
                name="reasoning"
                rows={2}
                maxLength={500}
                placeholder="Optional — a line for yourself before you decide. Only you will ever see this."
                className="w-full rounded-lg border border-black/15 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40 dark:border-white/20"
              />
              <button
                type="submit"
                className="self-start rounded-lg border border-black/15 px-4 py-2 text-sm font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                Save my note
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ---- Request form ----
  const hasStyle = Boolean(
    await prisma.giftingStyleProfile.findUnique({ where: { userId: giverId } }),
  );

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Find a gift for {name}</h1>
      <p className="mt-2 text-foreground/60">
        Pick the occasion and (optionally) a budget. We&apos;ll combine {name}&apos;s
        wishlist, what their friends know, and what you&apos;ve noted — into four ideas,
        each with the reason it&apos;s there.
      </p>

      {!hasStyle && (
        <p className="mt-4 rounded-lg border border-black/10 bg-black/[.02] px-4 py-3 text-sm text-foreground/60 dark:border-white/10 dark:bg-white/[.03]">
          Tip: set your{" "}
          <Link href="/profile" className="underline underline-offset-2">
            gifting style
          </Link>{" "}
          (budget, how you like to give) and these get more tailored.
        </p>
      )}

      <form action={requestRecommendation.bind(null, receiverId)} className="mt-6 flex flex-col gap-5">
        <div>
          <label htmlFor="occasion" className="text-sm font-medium">
            Occasion
          </label>
          <select
            id="occasion"
            name="occasion"
            defaultValue="birthday"
            className="mt-1.5 w-full rounded-lg border border-black/15 bg-background px-3 py-2.5 outline-none transition focus:border-foreground/40 dark:border-white/20"
          >
            {OCCASIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-foreground/50">
            The occasion gates what fits — an anniversary and a &ldquo;just because&rdquo; get
            different ideas, not just a different price.
          </p>
        </div>

        <div>
          <label htmlFor="budget" className="text-sm font-medium">
            Budget <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-foreground/50">$</span>
            <input
              id="budget"
              name="budget"
              type="number"
              min={1}
              max={100000}
              placeholder="Up to…"
              className="w-full rounded-lg border border-black/15 bg-background px-3 py-2.5 outline-none transition focus:border-foreground/40 dark:border-white/20"
            />
          </div>
          <p className="mt-1 text-xs text-foreground/50">
            Overrides your default gifting-style budget for this one gift.
          </p>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-foreground px-5 py-3 font-medium text-background transition hover:opacity-90"
        >
          Get gift ideas for {name}
        </button>
      </form>
    </div>
  );
}
