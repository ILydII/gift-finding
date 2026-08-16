import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOwnedEdge, firstName } from "@/lib/give-data";
import { getBaseUrl } from "@/lib/url";
import { CopyLinkField } from "@/components/CopyButton";

export const dynamic = "force-dynamic";

// G5 (PRD §3A) — sent. Pays off immediately: the Giver's outcome must not
// depend on the Receiver responding, so the next step (gift ideas) is right
// here.
export default async function SentPage({
  params,
  searchParams,
}: {
  params: Promise<{ edgeId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { edgeId } = await params;
  const sp = await searchParams;

  const owned = await getOwnedEdge(edgeId);
  if (!owned) redirect("/");
  const { edge, actor } = owned;
  const name = firstName(edge.userB);

  const invite = await prisma.invite.findFirst({
    where: { inviterId: actor.id, targetId: edge.userBId },
    orderBy: { createdAt: "desc" },
  });
  if (!invite) redirect(`/give/${edgeId}/send`);

  const baseUrl = await getBaseUrl();
  const claimUrl = `${baseUrl}/invite/${invite.token}`;
  const emailed = Boolean(invite.email) && sp.email !== "failed";

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        {emailed ? `Sent. ${name} will hear from you.` : `Your link is ready.`}
      </h1>

      {sp.email === "failed" && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"
        >
          We couldn&apos;t email {name}, but your link works — copy it below and
          send it yourself.
        </p>
      )}

      <p className="mt-3 text-foreground/60">
        {emailed
          ? "Or send it yourself:"
          : `Paste it anywhere ${name} will see it:`}
      </p>
      <div className="mt-3">
        <CopyLinkField url={claimUrl} />
      </div>

      <div className="mt-10 rounded-xl border border-black/10 p-5 dark:border-white/10">
        <p className="text-sm text-foreground/60">
          While you wait — here&apos;s what we&apos;d get {name} based on what
          you told us.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/recommend/${edge.userBId}`}
            className="flex-1 rounded-lg bg-foreground px-5 py-3 text-center font-medium text-background transition hover:opacity-90"
          >
            See gift ideas for {name}
          </Link>
          <Link
            href="/"
            className="flex-1 rounded-lg border border-black/15 px-5 py-3 text-center font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Add someone else
          </Link>
        </div>
      </div>

      <p className="mt-6 text-sm text-foreground/50">
        {name} shows as <span className="font-medium">Invited</span> in{" "}
        <Link href="/friends" className="underline underline-offset-2">
          your friends
        </Link>{" "}
        until they take a look.
      </p>
    </div>
  );
}
