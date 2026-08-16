import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { firstName } from "@/lib/give-data";
import { giverOwnsReceiver } from "@/lib/recommend-data";
import { OCCASIONS, GIFTING_PHILOSOPHIES, RISK_TOLERANCES } from "@/lib/constants";
import type { GiftSuggestion, OriginStream, SlotType } from "@/lib/recommendation";
import { requestRecommendation, submitFeedback, addReasoning } from "./actions";

export const dynamic = "force-dynamic";

// Flow 6 (PRD Processing & Output §6–7) — request a recommendation and view the
// four ranked ideas, each slot-typed, traceable, and with lightweight feedback.

const SLOT_BADGE: Record<SlotType, { label: string; className: string }> = {
  certainty: {
    label: "Sure thing",
    className: "bg-emerald/15 text-emerald",
  },
  personally_anchored: {
    label: "From you",
    className: "bg-violet/15 text-violet",
  },
  diversified: {
    label: "Worth a look",
    className: "bg-sky/15 text-sky",
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
                className="rounded-xl border border-black/10 bg-surface p-5 shadow-sm dark:border-white/10"
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
                        className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted"
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
                        ? "border-emerald/40 bg-emerald/15 text-emerald"
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
                        ? "border-coral/40 bg-coral/15 text-coral"
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
                className="w-full rounded-lg border border-black/15 bg-background px-3 py-2 text-sm outline-none transition focus:border-violet/40 dark:border-white/20"
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
  // Prefill gifting style from this friend's saved style (RelationshipContext),
  // still tunable per occasion. Budget is per-occasion only — no stored default.
  const relationship = await prisma.relationshipContext.findUnique({
    where: { rankerId_subjectId: { rankerId: giverId, subjectId: receiverId } },
  });
  let savedPhilosophies: string[] = [];
  try {
    const parsed = JSON.parse(relationship?.philosophyTags ?? "[]");
    if (Array.isArray(parsed)) savedPhilosophies = parsed.map(String);
  } catch {
    savedPhilosophies = [];
  }
  const savedRisk = relationship?.riskTolerance ?? null;

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Find a gift for {name}</h1>
      <p className="mt-2 text-foreground/60">
        Set the occasion, budget, and how you want to give — just for this gift.
        We&apos;ll combine {name}&apos;s wishlist, what their friends know, and what
        you&apos;ve noted into four ideas, each with the reason it&apos;s there.
      </p>

      <form action={requestRecommendation.bind(null, receiverId)} className="mt-6 flex flex-col gap-5">
        <div>
          <label htmlFor="occasion" className="text-sm font-medium">
            Occasion
          </label>
          <select
            id="occasion"
            name="occasion"
            defaultValue="birthday"
            className="mt-1.5 w-full rounded-lg border border-black/15 bg-background px-3 py-2.5 outline-none transition focus:border-violet/40 dark:border-white/20"
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
              className="w-full rounded-lg border border-black/15 bg-background px-3 py-2.5 outline-none transition focus:border-violet/40 dark:border-white/20"
            />
          </div>
          <p className="mt-1 text-xs text-foreground/50">
            Just for this gift — overrides your usual budget.
          </p>
        </div>

        <fieldset className="border-0 p-0">
          <legend className="text-sm font-medium">How do you want to give — for this gift?</legend>
          <p className="mt-1 text-xs text-foreground/50">
            Shapes the flavour of the four ideas. Starts from your usual style; change it for this occasion.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {GIFTING_PHILOSOPHIES.map((p) => (
              <label
                key={p.value}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-black/15 px-3 py-1.5 text-sm transition has-[:checked]:border-violet/50 has-[:checked]:bg-violet/5 dark:border-white/20"
              >
                <input
                  type="checkbox"
                  name="philosophy"
                  value={p.value}
                  defaultChecked={savedPhilosophies.includes(p.value)}
                  className="accent-foreground"
                />
                {p.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <span className="text-sm font-medium">How safe or bold?</span>
          <div className="mt-2 flex gap-2">
            {RISK_TOLERANCES.map((r) => (
              <label
                key={r.value}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-black/15 px-3 py-1.5 text-sm transition has-[:checked]:border-violet/50 has-[:checked]:bg-violet/5 dark:border-white/20"
              >
                <input
                  type="radio"
                  name="risk"
                  value={r.value}
                  defaultChecked={savedRisk === r.value}
                  className="accent-foreground"
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-violet px-5 py-3 font-medium text-white transition hover:opacity-90"
        >
          Get gift ideas for {name}
        </button>
      </form>
    </div>
  );
}
