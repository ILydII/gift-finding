import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { loadInvite, inviteState } from "@/lib/invite-data";
import { firstName } from "@/lib/give-data";

export const dynamic = "force-dynamic";

// R1 — the claim landing. Sign-in now happens before seeing what a friend
// said (see docs/PRD-onboarding-and-friend-adding.md addendum — account
// timing reversed): token-state messages (expired/claimed/declined) render
// without auth since they reveal nothing personal, but the actual content —
// the Giver's name and the tags — is gated behind sign-in.
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await loadInvite(token);

  if (!invite) {
    return (
      <CenteredNote
        title="This invite link isn't active."
        body="Check you copied the whole link — or ask your friend to send a fresh one."
      />
    );
  }

  const state = inviteState(invite);

  if (state === "expired") {
    const giver = firstName(invite.inviter);
    return (
      <CenteredNote
        title="This link's gone stale."
        body={`Invite links last 30 days. Ask ${giver} for a fresh one — everything they put together is still here.`}
      />
    );
  }
  if (state === "accepted") {
    return (
      <CenteredNote
        title="This one's already been claimed."
        body="If that was you, sign in to get back to your profile."
        cta={{ href: "/signin", label: "Sign in" }}
      />
    );
  }
  if (state === "declined") {
    return (
      <CenteredNote
        title="This invite is no longer active."
        body="Nothing to see here — the person it was for chose not to take part."
      />
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const giver = firstName(invite.inviter);

  // Tags render in creation order with rank values never queried — the subject
  // sees WHAT was said, never how it was ranked.
  const interests = await prisma.interest.findMany({
    where: { ownerId: invite.targetId },
    orderBy: { createdAt: "asc" },
    select: { id: true, taxonomyTag: true, freeText: true },
  });
  const tags = await prisma.interestTag.findMany({
    where: {
      slug: { in: interests.map((i) => i.taxonomyTag).filter(Boolean) as string[] },
    },
  });
  const labelBySlug = new Map(tags.map((t) => [t.slug, t.label]));
  const labels = interests
    .map((i) => i.freeText ?? labelBySlug.get(i.taxonomyTag ?? ""))
    .filter((l): l is string => Boolean(l));

  const hasData = labels.length > 0;

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16">
      <p className="text-sm text-foreground/50">
        {giver} · via Gift Finder
      </p>

      {hasData ? (
        <>
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight">
            {giver} is trying to get your next gift right.
          </h1>
          <p className="mt-3 text-foreground/70">
            They guessed a few things you&apos;re into and wanted to check with
            you first — they can&apos;t see how you answer, just a better list.
          </p>

          <div className="mt-6 rounded-xl border border-black/10 p-5 dark:border-white/10">
            <p className="text-sm text-foreground/60">
              {giver} thinks you&apos;re into:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {labels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-black/15 px-3.5 py-1.5 text-sm dark:border-white/20"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight">
            {giver} is stuck.
          </h1>
          <p className="mt-3 text-foreground/70">
            They want to get you something good and admitted they need help.
            What are you actually into?
          </p>
        </>
      )}

      <div className="mt-8 flex flex-col gap-3">
        <Link
          href={`/invite/${token}/confirm`}
          className="rounded-lg bg-foreground px-5 py-3 text-center font-medium text-background transition hover:opacity-90"
        >
          {hasData ? `${giver} got it right — mostly` : "Tell them what you're into"}
        </Link>
        {hasData && (
          <Link
            href={`/invite/${token}/confirm`}
            className="rounded-lg border border-black/15 px-5 py-3 text-center font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Let me fix a few things
          </Link>
        )}
        <Link
          href={`/invite/${token}/decline`}
          className="mt-1 text-center text-sm text-foreground/50 underline-offset-2 hover:underline"
        >
          I&apos;d rather not be in this
        </Link>
      </div>

      <details className="mt-10 text-sm text-foreground/60">
        <summary className="cursor-pointer underline-offset-2 hover:underline">
          Who can see this?
        </summary>
        <div className="mt-2 flex flex-col gap-1.5 rounded-lg border border-black/10 p-4 dark:border-white/10">
          <p>{giver} added these guesses while figuring out a gift for you.</p>
          <p>Any private notes {giver} wrote are never shown to you — and your edits are never shown to {giver}.</p>
          <p>Only friends who&apos;ve invited you (or you&apos;ve added) see your list.</p>
          <p>Nothing here is public.</p>
        </div>
      </details>
    </div>
  );
}

function CenteredNote({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="mx-auto w-full max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-foreground/60">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-6 inline-block rounded-lg bg-foreground px-5 py-2.5 font-medium text-background transition hover:opacity-90"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
