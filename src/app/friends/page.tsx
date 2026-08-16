import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { FriendStatus } from "@/lib/constants";

// Per-user data that depends on the session — never prerender/cache at build.
export const dynamic = "force-dynamic";

// FR-15 — the Giver's list of friends/targets with per-friend status.
//
// NOTE: auth isn't wired yet, so this loads the seeded demo Giver by email to
// prove the DB → server-component path works end to end. Whoever builds auth
// should replace `getCurrentGiver()` with the real session user.
async function getCurrentGiver() {
  return prisma.user.findUnique({ where: { email: "demo@example.com" } });
}

function statusLabel(status: FriendStatus): string {
  switch (status) {
    case "unclaimed":
      return "Invited · not joined yet";
    case "claimed_not_ranked":
      return "Joined · not ranked";
    case "claimed_and_ranked":
      return "Joined · ranked";
  }
}

export default async function FriendsPage() {
  const giver = await getCurrentGiver();

  const edges = giver
    ? await prisma.friendEdge.findMany({
        where: { userAId: giver.id },
        include: { userB: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your friends</h1>
          <p className="mt-1 text-sm text-foreground/60">
            People you&apos;re finding gifts for. Signed in as the seeded demo
            account.
          </p>
        </div>
        <Link
          href="/friends/new"
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
        >
          + Add a friend
        </Link>
      </div>

      <ul className="mt-6 divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
        {edges.length === 0 && (
          <li className="p-6 text-sm text-foreground/60">
            No friends yet. Run <code className="font-mono">npm run db:seed</code>{" "}
            for demo data, or add someone.
          </li>
        )}
        {edges.map((edge) => {
          const status: FriendStatus =
            edge.userB.claimStatus === "unclaimed"
              ? "unclaimed"
              : "claimed_not_ranked";
          return (
            <li key={edge.id} className="flex items-center justify-between p-4">
              <div>
                <Link
                  href={`/friends/${edge.userB.id}`}
                  className="font-medium hover:underline"
                >
                  {edge.userB.name ?? edge.userB.email ?? "Unnamed friend"}
                </Link>
                <p className="text-xs text-foreground/50">{statusLabel(status)}</p>
              </div>
              <Link
                href={`/recommend/${edge.userB.id}`}
                className="rounded-md border border-black/15 px-3 py-1.5 text-sm transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                Get ideas
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
