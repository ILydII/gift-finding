import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadInvite, inviteState } from "@/lib/invite-data";
import { firstName } from "@/lib/give-data";
import { EditInterests } from "@/components/invite/EditInterests";
import { AccountGate } from "@/components/AccountGate";
import { saveReceiverEdits, claimInvite } from "@/app/invite/[token]/actions";

export const dynamic = "force-dynamic";

// R2 (PRD §3B) — confirm, edit & save. Edits work before any account exists
// (token authority); the account block sits below, and "Save my profile" is
// what creates the link to the unclaimed record (FR-14).
export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const sp = await searchParams;

  const invite = await loadInvite(token);
  if (!invite || inviteState(invite) !== "ok") redirect(`/invite/${token}`);
  const giver = firstName(invite.inviter);

  const session = await auth();
  const signedIn = Boolean(session?.user?.id);

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
  const items = interests.map((i) => ({
    id: i.id,
    label: i.freeText ?? labelBySlug.get(i.taxonomyTag ?? "") ?? "Unknown",
  }));

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        Fix anything that&apos;s off.
      </h1>
      <p className="mt-2 text-foreground/60">
        Ditch what&apos;s wrong, add what&apos;s missing — {giver} won&apos;t be
        told what you changed. This is yours now.
      </p>

      {sp.saved === "1" && (
        <p className="mt-4 rounded-lg border border-green-600/30 bg-green-600/5 px-4 py-3 text-sm">
          Saved. Sign in below to make it yours for good.
        </p>
      )}
      {sp.error === "auth" && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"
        >
          Sign in below first, then save your profile.
        </p>
      )}

      <div className="mt-8">
        <EditInterests
          items={items}
          action={
            signedIn
              ? claimInvite.bind(null, token)
              : saveReceiverEdits.bind(null, token)
          }
          submitLabel={signedIn ? "Save my profile" : "Save changes"}
        />
      </div>

      {!signedIn && (
        <div className="mt-8">
          <AccountGate
            redirectTo={`/invite/${token}/confirm`}
            headline="Save this so your friends see it."
            subline={`One account, and ${giver}'s gift ideas get sharper from here.`}
          />
        </div>
      )}
    </div>
  );
}
