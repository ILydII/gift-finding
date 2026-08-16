import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/guest";
import { startGiftSearch } from "@/app/give/actions";
import { firstName } from "@/lib/give-data";

export const dynamic = "force-dynamic";

// G1 (PRD §3A) — landing + first prompt, one screen. The first ask is a name,
// never an account. Guests get real draft rows; the only gate is at send.
export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  const { user } = await getViewer();
  const drafts = user
    ? await prisma.friendEdge.findMany({
        where: { userAId: user.id, status: "draft" },
        include: { userB: true },
        orderBy: { createdAt: "desc" },
        take: 3,
      })
    : [];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-6 py-20 text-center">
      <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
        Who are you trying to find a gift for?
      </h1>
      <p className="mt-3 text-foreground/60">
        First name is fine — we&apos;ll do the hard part together.
      </p>

      {error === "too_many_drafts" && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"
        >
          That&apos;s a lot of gift searches for one sitting — finish one first,
          or sign in to keep them all.
        </p>
      )}

      <form
        action={startGiftSearch}
        className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row"
      >
        <input
          name="name"
          required
          maxLength={40}
          placeholder="Emma"
          aria-label="Their first name"
          className="min-w-0 flex-1 rounded-lg border border-black/15 bg-background px-4 py-3 text-lg outline-none transition focus:border-foreground/40 dark:border-white/20"
        />
        <button
          type="submit"
          className="rounded-lg bg-foreground px-6 py-3 font-medium text-background transition hover:opacity-90"
        >
          Let&apos;s figure it out
        </button>
      </form>

      {drafts.length > 0 && (
        <div className="mt-10 w-full max-w-md text-left">
          <h2 className="text-xs font-medium uppercase tracking-wide text-foreground/50">
            Pick up where you left off
          </h2>
          <ul className="mt-2 divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
            {drafts.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/give/${d.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm transition hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <span>Gift for {firstName(d.userB)}</span>
                  <span className="text-foreground/40">Continue →</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-10 text-sm text-foreground/50">
        Invited by a friend? Open the link they sent you — that&apos;s your way
        in.
      </p>
    </div>
  );
}
