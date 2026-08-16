"use client";

import { useMemo, useState } from "react";
import { orderedGroups } from "@/lib/taxonomy";
import { RELATIONSHIP_TYPES } from "@/lib/constants";

// G2 (PRD §3A): relationship + interest selection in one pass. Every tap
// appends to an ordered array — the badge number is the array index, and that
// order carries into the rank screen as the provisional ranking. Only the
// first 10 selections carry ordinal weight.

const MAX_BADGED = 10;

export function SelectInterests({
  targetName,
  labels,
  initialRelationship,
  initialSelection,
  action,
}: {
  targetName: string;
  labels: Record<string, string>;
  initialRelationship: string | null;
  initialSelection: string[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [relationship, setRelationship] = useState<string | null>(
    initialRelationship,
  );
  const [selection, setSelection] = useState<string[]>(initialSelection);

  const groups = useMemo(() => orderedGroups(relationship), [relationship]);

  function toggle(slug: string) {
    setSelection((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  const count = selection.length;

  return (
    <form action={action} className="flex flex-col gap-8 pb-28">
      <input type="hidden" name="relationship" value={relationship ?? ""} />
      <input type="hidden" name="selection" value={JSON.stringify(selection)} />

      <section>
        <h2 className="font-medium">How do you know {targetName}?</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {RELATIONSHIP_TYPES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRelationship(r.value)}
              aria-pressed={relationship === r.value}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                relationship === r.value
                  ? "border-violet bg-violet text-white"
                  : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-medium">What&apos;s {targetName} into?</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Tap what you already know — most {targetName}-ish first. You don&apos;t
          have to be right about all of it; their other friends will fill in the
          rest.
        </p>

        <div className="mt-5 flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.header}>
              <h3 className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                {group.header}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.slugs
                  .filter((slug) => labels[slug])
                  .map((slug) => {
                    const idx = selection.indexOf(slug);
                    const picked = idx !== -1;
                    const badged = picked && idx < MAX_BADGED;
                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => toggle(slug)}
                        aria-pressed={picked}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition ${
                          picked
                            ? "border-violet bg-violet text-white"
                            : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                        }`}
                      >
                        {badged && (
                          <span
                            aria-hidden
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-background/25 text-[10px] font-semibold"
                          >
                            {idx + 1}
                          </span>
                        )}
                        {labels[slug]}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sticky bottom bar: primary Next + the whole-step escape hatch. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-black/10 bg-background/95 backdrop-blur dark:border-white/10">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-3">
          <button
            type="submit"
            name="skip"
            value="1"
            className="text-sm text-foreground/60 underline-offset-2 hover:underline"
          >
            I&apos;m honestly not sure — let {targetName} tell me
          </button>
          <div className="flex items-center gap-3">
            {count > 0 && count < 3 && (
              <span className="hidden text-sm text-foreground/50 sm:inline">
                A few more makes this much better
              </span>
            )}
            <button
              type="submit"
              disabled={count === 0}
              className="rounded-lg bg-violet px-5 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            >
              Next{count > 0 ? ` (${count} picked)` : ""}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
