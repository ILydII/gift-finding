import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedEdge, firstName } from "@/lib/give-data";
import { sendInvite } from "@/app/give/actions";

export const dynamic = "force-dynamic";

const ERROR_COPY: Record<string, string> = {
  email: "That email doesn't look right. Fix it, or just get a link instead.",
  rate: "You've sent a lot of invites today — try again tomorrow, or copy links instead.",
  self: "That's you — this flow is for finding someone else a gift. (Your own profile fills in when a friend invites you.)",
};

// G4 — invite. Sign-in already happened up front (before naming anyone), so
// this screen is always reached authenticated; no account gate here.
export default async function SendPage({
  params,
  searchParams,
}: {
  params: Promise<{ edgeId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { edgeId } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(
      `/signin?callbackUrl=${encodeURIComponent(`/give/${edgeId}/send`)}`,
    );
  }

  const owned = await getOwnedEdge(edgeId);
  if (!owned) redirect("/");
  const { edge, actor } = owned;
  const name = firstName(edge.userB);
  const senderLabel = session.user.name ?? session.user.email ?? "You";

  const pending = await prisma.invite.findFirst({
    where: { inviterId: actor.id, targetId: edge.userBId, status: "pending" },
  });
  const prefillEmail = pending?.email ?? edge.userB.email ?? "";

  const contributed = await prisma.interest.count({
    where: { ownerId: edge.userBId, contributedById: actor.id },
  });

  const defaultLine =
    contributed > 0
      ? `They added a few things they think you're into and want to check they got it right. Takes about a minute — and no, you don't have to write a wishlist.`
      : `They admitted they need help. Take a minute and point them the right way.`;

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Almost there.</h1>
      <p className="mt-2 text-foreground/60">
        Here&apos;s what {name} will see
        {contributed > 0
          ? ` — built from the ${contributed} thing${contributed === 1 ? "" : "s"} you picked.`
          : "."}
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-sunflower/30 bg-sunflower/5 px-4 py-3 text-sm"
        >
          {ERROR_COPY[error] ?? "Something went wrong — try again."}
        </p>
      )}

      <form
        action={sendInvite.bind(null, edgeId)}
        className="mt-6 flex flex-col gap-6"
      >
        <div className="rounded-xl border border-black/10 bg-surface p-5 shadow-sm dark:border-white/10">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/40">
            {name}&apos;s invite
          </p>
          <p className="mt-2 font-semibold">
            {senderLabel}{" "}
            {contributed > 0
              ? "is trying to find you something good."
              : "needs your help picking you something good."}
          </p>
          <input
            name="personalLine"
            maxLength={140}
            placeholder={defaultLine}
            className="mt-2 w-full rounded-md border border-dashed border-black/15 bg-transparent px-2 py-1.5 text-sm text-foreground/80 outline-none transition focus:border-violet/40 dark:border-white/20"
            aria-label="Add one personal line to the invite (optional)"
          />
          <p className="mt-1 text-xs text-foreground/40">
            That line is yours to edit — leave it as is, or make it personal.
          </p>
          <span className="mt-3 inline-block rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white opacity-80">
            See what {senderLabel} said
          </span>
        </div>

        {!session.user.name && (
          <div>
            <label htmlFor="sender-name" className="text-sm font-medium">
              Your name
            </label>
            <input
              id="sender-name"
              name="senderName"
              required
              maxLength={60}
              placeholder="So the invite comes from you, not an email address"
              className="mt-1.5 w-full rounded-lg border border-black/15 bg-background px-3 py-2.5 outline-none transition focus:border-violet/40 dark:border-white/20"
            />
          </div>
        )}

        <div>
          <label htmlFor="recipient-email" className="text-sm font-medium">
            Where can we reach {name}?
          </label>
          <input
            id="recipient-email"
            name="recipientEmail"
            type="email"
            defaultValue={prefillEmail}
            placeholder={`${name.toLowerCase()}@example.com`}
            className="mt-1.5 w-full rounded-lg border border-black/15 bg-background px-3 py-2.5 outline-none transition focus:border-violet/40 dark:border-white/20"
          />
          <p className="mt-1 text-xs text-foreground/50">
            Optional — or skip it and just send them a link yourself.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            name="mode"
            value="email"
            className="flex-1 rounded-lg bg-violet px-5 py-3 font-medium text-white transition hover:opacity-90"
          >
            Send it to {name}
          </button>
          <button
            type="submit"
            name="mode"
            value="link"
            className="flex-1 rounded-lg border border-black/15 px-5 py-3 font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Just get me a link
          </button>
        </div>
      </form>
    </div>
  );
}
