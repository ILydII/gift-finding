import Link from "next/link";
import { redirect } from "next/navigation";
import { loadInvite, inviteState } from "@/lib/invite-data";
import { firstName } from "@/lib/give-data";
import { declineInvite } from "@/app/invite/[token]/actions";

export const dynamic = "force-dynamic";

// One tap, one confirm, no guilt copy. A cheap, dignified exit is what makes
// staying meaningful.
export default async function DeclinePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await loadInvite(token);
  if (!invite || inviteState(invite) !== "ok") redirect(`/invite/${token}`);
  const giver = firstName(invite.inviter);

  return (
    <div className="mx-auto w-full max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Remove everything about you?
      </h1>
      <p className="mt-3 text-foreground/60">
        Everything recorded about you gets deleted, and this address won&apos;t
        be invited again. {giver} will only see that you&apos;re not using this
        — never that you said no.
      </p>

      <form action={declineInvite.bind(null, token)} className="mt-8">
        <button
          type="submit"
          className="w-full rounded-lg border border-coral/40 px-5 py-3 font-medium text-coral transition hover:bg-coral/5 dark:text-coral"
        >
          Yes — remove me
        </button>
      </form>
      <Link
        href={`/invite/${token}`}
        className="mt-4 inline-block text-sm text-foreground/50 underline-offset-2 hover:underline"
      >
        Never mind, take me back
      </Link>
    </div>
  );
}
