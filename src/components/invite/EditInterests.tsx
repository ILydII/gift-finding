"use client";

import { useState } from "react";

// R2 (PRD §3B): the inherited list as removable chips. Removal is instant, no
// confirm dialog — the delete button IS the trust treatment.

export function EditInterests({
  items,
  action,
  submitLabel,
}: {
  items: { id: string; label: string }[];
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
}) {
  const [kept, setKept] = useState<string[]>(items.map((i) => i.id));
  const [added, setAdded] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  function addDraft() {
    const label = draft.trim().slice(0, 50);
    if (!label) return;
    if (added.some((a) => a.toLowerCase() === label.toLowerCase())) {
      setDraft("");
      return;
    }
    setAdded([...added, label]);
    setDraft("");
  }

  const visible = items.filter((i) => kept.includes(i.id));

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="keepIds" value={JSON.stringify(kept)} />
      <input type="hidden" name="added" value={JSON.stringify(added)} />

      <div className="flex flex-wrap gap-2">
        {visible.map((item) => (
          <span
            key={item.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/15 py-1.5 pl-3.5 pr-1.5 text-sm dark:border-white/20"
          >
            {item.label}
            <button
              type="button"
              onClick={() => setKept(kept.filter((id) => id !== item.id))}
              aria-label={`Remove ${item.label}`}
              className="flex h-6 w-6 items-center justify-center rounded-full text-foreground/50 transition hover:bg-black/10 hover:text-foreground dark:hover:bg-white/15"
            >
              ✕
            </button>
          </span>
        ))}
        {added.map((label) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-foreground bg-foreground py-1.5 pl-3.5 pr-1.5 text-sm text-background"
          >
            {label}
            <button
              type="button"
              onClick={() => setAdded(added.filter((a) => a !== label))}
              aria-label={`Remove ${label}`}
              className="flex h-6 w-6 items-center justify-center rounded-full text-background/70 transition hover:bg-background/20 hover:text-background"
            >
              ✕
            </button>
          </span>
        ))}
        {visible.length === 0 && added.length === 0 && (
          <p className="text-sm text-foreground/50">
            Empty list is fine too — add anything you like below.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDraft();
            }
          }}
          maxLength={50}
          placeholder="Add what they missed…"
          aria-label="Add an interest"
          className="min-w-0 flex-1 rounded-lg border border-black/15 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40 dark:border-white/20"
        />
        <button
          type="button"
          onClick={addDraft}
          className="rounded-lg border border-black/15 px-4 py-2 text-sm transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Add
        </button>
      </div>

      <button
        type="submit"
        className="rounded-lg bg-foreground px-5 py-3 font-medium text-background transition hover:opacity-90"
      >
        {submitLabel}
      </button>
    </form>
  );
}
