import Link from "next/link";

// Flow 1 — Giver's first action (the product's front door). The very first
// prompt is other-oriented: "Who do you want to find a gift for?" — never a
// self-profile builder. See BRD Section 6, Flow 1 and FR-1.
export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 py-20 text-center">
      <span className="mb-4 rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-foreground/60 dark:bg-white/10">
        V1 · core loop
      </span>

      <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
        Who do you want to find a gift for?
      </h1>

      <p className="mt-4 max-w-xl text-pretty text-lg text-foreground/70">
        Start with someone you care about. We&apos;ll combine what they want, what
        their friends know about them, and how you like to give — into a short,
        confident list of ideas.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/friends/new"
          className="rounded-lg bg-foreground px-6 py-3 font-medium text-background transition hover:opacity-90"
        >
          Find a gift for someone
        </Link>
        <Link
          href="/friends"
          className="rounded-lg border border-black/15 px-6 py-3 font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          See my friends
        </Link>
      </div>

      <p className="mt-10 text-sm text-foreground/50">
        Building this? Each screen links to the BRD flow it implements — see{" "}
        <code className="font-mono">README.md</code> and{" "}
        <code className="font-mono">docs/ARCHITECTURE.md</code> for how the work
        is split.
      </p>
    </div>
  );
}
