import type { ReactNode } from "react";

type Props = {
  title: string;
  /** BRD flow this screen implements, e.g. "Flow 2 — Pre-invite contribution". */
  flow?: string;
  /** BRD functional-requirement ids covered, e.g. ["FR-19", "FR-22"]. */
  brdRefs?: string[];
  description: string;
  /** Concrete build tasks for whoever picks up this section. */
  todos?: string[];
  children?: ReactNode;
};

/**
 * A consistent placeholder for a not-yet-built screen. It documents which part
 * of the BRD the screen owns and what's left to do, so the work can be split
 * across collaborators without stepping on each other. Delete once the screen
 * is implemented.
 */
export function SectionStub({ title, flow, brdRefs, description, todos, children }: Props) {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="rounded-xl border border-dashed border-black/15 bg-black/[0.02] p-6 dark:border-white/20 dark:bg-white/[0.03]">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sunflower/15 px-2.5 py-0.5 text-xs font-medium text-sunflower dark:text-sunflower">
            scaffold — not built yet
          </span>
          {flow && (
            <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs text-foreground/70 dark:bg-white/10">
              {flow}
            </span>
          )}
          {brdRefs?.map((ref) => (
            <span
              key={ref}
              className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-mono text-indigo-700 dark:text-indigo-300"
            >
              {ref}
            </span>
          ))}
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-foreground/70">{description}</p>

        {todos && todos.length > 0 && (
          <div className="mt-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
              To build
            </h2>
            <ul className="mt-2 space-y-1.5">
              {todos.map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="mt-1 inline-block h-3.5 w-3.5 shrink-0 rounded border border-violet/30" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}
