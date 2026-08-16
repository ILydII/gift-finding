import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadInvite, inviteState } from "@/lib/invite-data";
import { firstName } from "@/lib/give-data";
import { EditInterests } from "@/components/invite/EditInterests";
import { claimInvite } from "@/app/invite/[token]/actions";

export const dynamic = "force-dynamic";

// R2 — confirm, edit & save. Sign-in already happened at R1, so this screen
// is always reached authenticated; "Save my profile" both applies edits and
// claims the record (FR-14).
export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invite = await loadInvite(token);
  if (!invite || inviteState(invite) !== "ok") redirect(`/invite/${token}`);
  const giver = firstName(invite.inviter);

  const session = await auth();
  if (!session?.user?.id) {
    redirect(
      `/signin?callbackUrl=${encodeURIComponent(`/invite/${token}/confirm`)}`,
    );
  }

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

      <div className="mt-8">
        <EditInterests
          items={items}
          action={claimInvite.bind(null, token)}
          submitLabel="Save my profile"
        />
      </div>
    </div>
  );
}
