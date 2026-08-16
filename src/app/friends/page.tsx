import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { firstName } from "@/lib/give-data";

export const dynamic = "force-dynamic";

// The friend hub (FR-15 + PRD FR-31): every target with status. Never a red or
// "failed" state — an ignored invite just stays "Invited".
export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent("/friends")}`);
  }

  const edges = await prisma.friendEdge.findMany({
    where: { userAId: session.user.id },
    include: { userB: true },
    orderBy: { createdAt: "desc" },
  });

  const rankedSubjects = new Set(
    (
      await prisma.interestRanking.findMany({
        where: { rankerId: session.user.id },
        select: { subjectId: true },
        distinct: ["subjectId"],
      })
    ).map((r) => r.subjectId),
  );

  function describe(edge: (typeof edges)[number]): {
    label: string;
    dim?: boolean;
  } {
    if (edge.userB.claimStatus === "declined")
      return { label: `${firstName(edge.userB)} isn't using this`, dim: true };
    if (edge.status === "draft") return { label: "Draft — not sent yet" };
    if (edge.userB.claimStatus === "unclaimed")
      return { label: "Invited · hasn't looked yet" };
    return rankedSubjects.has(edge.userBId)
      ? { label: "Joined · you've shared what you know" }
      : { label: "Joined · add what you know" };
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your friends</h1>
          <p className="mt-1 text-sm text-foreground/60">
            People you&apos;re finding gifts for.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
        >
          + Add a friend
        </Link>
      </div>

      <ul className="mt-6 divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
        {edges.length === 0 && (
          <li className="p-6 text-sm text-foreground/60">
            No friends yet —{" "}
            <Link href="/" className="underline underline-offset-2">
              start with someone you care about
            </Link>
            .
          </li>
        )}
        {edges.map((edge) => {
          const status = describe(edge);
          const isDraft = edge.status === "draft";
          const declined = edge.userB.claimStatus === "declined";
          return (
            <li
              key={edge.id}
              className={`flex items-center justify-between gap-3 p-4 ${status.dim ? "opacity-60" : ""}`}
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {edge.userB.name ?? edge.userB.email ?? "Unnamed friend"}
                </p>
                <p className="text-xs text-foreground/50">{status.label}</p>
              </div>
              {!declined && (
                <div className="flex shrink-0 items-center gap-2">
                  {isDraft ? (
                    <Link
                      href={`/give/${edge.id}`}
                      className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition hover:opacity-90"
                    >
                      Finish &amp; send
                    </Link>
                  ) : (
                    <>
                      {edge.userB.claimStatus === "unclaimed" && (
                        <Link
                          href={`/give/${edge.id}/sent`}
                          className="rounded-md border border-black/15 px-3 py-1.5 text-sm transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                        >
                          Invite link
                        </Link>
                      )}
                      <Link
                        href={`/recommend/${edge.userBId}`}
                        className="rounded-md border border-black/15 px-3 py-1.5 text-sm transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                      >
                        Get ideas
                      </Link>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
