"use client";

import { useRef, useState } from "react";

// G3 (PRD §3A/§4): the selection rendered back as a numbered list. Drag (via
// a dedicated handle, Pointer Events so it works the same for mouse and
// touch) plus ▲/▼ buttons — the buttons stay as the keyboard/screen-reader
// path, drag is additive. Positions 1–3 sit above a "Counts most" hairline;
// a full order is stored but only the top 3 is demanded.

export type RankRow = {
  key: string; // stable client key
  id?: string; // existing Interest id (absent for new custom entries)
  freeText?: string;
  label: string;
};

export function RankList({
  targetName,
  initialRows,
  initialNote,
  action,
}: {
  targetName: string;
  initialRows: RankRow[];
  initialNote: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [rows, setRows] = useState<RankRow[]>(initialRows);
  const [custom, setCustom] = useState("");
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const nextKey = useRef(0);
  const rowElsRef = useRef<Map<string, HTMLLIElement>>(new Map());

  function announce(text: string) {
    if (liveRef.current) liveRef.current.textContent = text;
  }

  function move(index: number, delta: -1 | 1) {
    const next = index + delta;
    if (next < 0 || next >= rows.length) return;
    const copy = [...rows];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    setRows(copy);
    announce(`${copy[next].label}, now position ${next + 1} of ${copy.length}`);
  }

  // Drag reorder: a handle starts the drag; as the pointer crosses another
  // row's vertical midpoint, the dragged row moves to that position live.
  // Pointer Events (not HTML5 dnd) so mouse and touch behave the same way.
  function handlePointerDown(e: React.PointerEvent, key: string) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingKey(key);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingKey) return;
    e.preventDefault();

    const fromIndex = rows.findIndex((r) => r.key === draggingKey);
    if (fromIndex === -1) return;

    let toIndex = fromIndex;
    for (let i = 0; i < rows.length; i++) {
      const el = rowElsRef.current.get(rows[i].key);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        toIndex = i;
        break;
      }
    }

    if (toIndex !== fromIndex) {
      const copy = [...rows];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      setRows(copy);
    }
  }

  function handlePointerUp() {
    if (!draggingKey) return;
    const finalIndex = rows.findIndex((r) => r.key === draggingKey);
    if (finalIndex !== -1) {
      announce(
        `${rows[finalIndex].label}, now position ${finalIndex + 1} of ${rows.length}`,
      );
    }
    setDraggingKey(null);
  }

  function remove(index: number) {
    const removed = rows[index];
    setRows(rows.filter((_, i) => i !== index));
    announce(`${removed.label} removed`);
  }

  function addCustom() {
    const label = custom.trim().slice(0, 50);
    if (!label) return;
    if (rows.some((r) => r.label.toLowerCase() === label.toLowerCase())) {
      setCustom("");
      return;
    }
    nextKey.current += 1;
    setRows([...rows, { key: `new-${nextKey.current}`, freeText: label, label }]);
    setCustom("");
    announce(`${label} added at position ${rows.length + 1}`);
  }

  const payload = rows.map((r) =>
    r.id ? { id: r.id } : { freeText: r.freeText ?? r.label },
  );

  return (
    <form action={action} className="flex flex-col gap-6 pb-28">
      <input type="hidden" name="rows" value={JSON.stringify(payload)} />
      <p ref={liveRef} aria-live="polite" className="sr-only" />

      <ol className="flex flex-col gap-1">
        {rows.map((row, i) => (
          <li
            key={row.key}
            ref={(el) => {
              if (el) rowElsRef.current.set(row.key, el);
              else rowElsRef.current.delete(row.key);
            }}
            className="contents"
          >
            {i === 0 && (
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-foreground/50">
                Counts most
              </p>
            )}
            {i === 3 && (
              <p className="mb-1 mt-3 border-t border-black/10 pt-3 text-xs font-medium uppercase tracking-wide text-foreground/40 dark:border-white/10">
                Also true
              </p>
            )}
            <div
              className={`flex items-center gap-2 rounded-lg border border-black/10 bg-background px-3 py-2 transition dark:border-white/10 ${
                draggingKey === row.key
                  ? "opacity-60 shadow-md ring-2 ring-foreground/20"
                  : ""
              }`}
            >
              <button
                type="button"
                aria-label={`Drag to reorder ${row.label}`}
                onPointerDown={(e) => handlePointerDown(e, row.key)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ touchAction: "none" }}
                className="flex h-9 w-6 shrink-0 cursor-grab items-center justify-center text-foreground/30 transition hover:text-foreground/60 active:cursor-grabbing"
              >
                ⠿
              </button>
              <span className="w-6 shrink-0 text-center text-sm font-semibold text-foreground/40 tabular-nums">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {row.label}
                {row.freeText && (
                  <span className="ml-2 text-xs text-foreground/40">yours</span>
                )}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move ${row.label} up`}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-black/10 transition hover:bg-black/5 disabled:opacity-30 dark:border-white/15 dark:hover:bg-white/10"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                  aria-label={`Move ${row.label} down`}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-black/10 transition hover:bg-black/5 disabled:opacity-30 dark:border-white/15 dark:hover:bg-white/10"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`Remove ${row.label}`}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-foreground/50 transition hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                >
                  ✕
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div>
        <label htmlFor="custom-interest" className="text-sm font-medium">
          + Something specific
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="custom-interest"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            maxLength={50}
            placeholder={`"late-night baking" · "anything Formula 1" · "that one bakery on 5th"`}
            className="min-w-0 flex-1 rounded-lg border border-black/15 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40 dark:border-white/20"
          />
          <button
            type="button"
            onClick={addCustom}
            className="rounded-lg border border-black/15 px-4 py-2 text-sm transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Add
          </button>
        </div>
        <p className="mt-1 text-xs text-foreground/40">
          Keep it short — like &quot;sourdough&quot; or &quot;F1&quot;. It joins
          the bottom of the list; move it up if it matters.
        </p>
      </div>

      <div>
        <label htmlFor="private-note" className="text-sm font-medium">
          Anything else worth knowing?
        </label>
        <textarea
          id="private-note"
          name="note"
          defaultValue={initialNote}
          rows={2}
          maxLength={1000}
          placeholder={`Notes to yourself about ${targetName}…`}
          className="mt-1.5 w-full rounded-lg border border-black/15 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40 dark:border-white/20"
        />
        <p className="mt-1 flex items-center gap-1 text-xs text-foreground/50">
          <span aria-hidden>🔒</span> Only you can see this. {targetName} never
          will — not now, not ever.
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-black/10 bg-background/95 backdrop-blur dark:border-white/10">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-3">
          <button
            type="submit"
            name="notSure"
            value="1"
            className="text-sm text-foreground/60 underline-offset-2 hover:underline"
          >
            Not sure about the order
          </button>
          <button
            type="submit"
            disabled={rows.length === 0}
            className="rounded-lg bg-foreground px-5 py-2.5 font-medium text-background transition hover:opacity-90 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </form>
  );
}
