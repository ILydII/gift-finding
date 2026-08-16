import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOwnedEdge, firstName } from "@/lib/give-data";
import { DISPLAY_SLUGS } from "@/lib/taxonomy";
import { SelectInterests } from "@/components/give/SelectInterests";
import { saveContribution } from "@/app/give/actions";

export const dynamic = "force-dynamic";

// G2 (PRD §3A) — relationship + interest selection, one screen.
export default async function SelectPage({
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

  const tags = await prisma.interestTag.findMany({
    where: { slug: { in: [...DISPLAY_SLUGS] } },
  });
  const labels = Object.fromEntries(tags.map((t) => [t.slug, t.label]));

  // Resume state: this contributor's existing picks, in rank order.
  const existing = await prisma.interest.findMany({
    where: {
      ownerId: edge.userBId,
      contributedById: actor.id,
      taxonomyTag: { not: null },
    },
    include: { rankings: { where: { rankerId: actor.id } } },
  });
  const initialSelection = existing
    .sort(
      (a, b) =>
        (a.rankings[0]?.rankValue ?? 99) - (b.rankings[0]?.rankValue ?? 99),
    )
    .map((i) => i.taxonomyTag!)
    .filter((slug) => DISPLAY_SLUGS.has(slug));

  const context = await prisma.relationshipContext.findUnique({
    where: {
      rankerId_subjectId: { rankerId: actor.id, subjectId: edge.userBId },
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      {sp.back === "1" && (
        <p className="mb-6 rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.03]">
          You already added {name} — pick up where you left off.
        </p>
      )}
      <h1 className="text-3xl font-semibold tracking-tight">
        What&apos;s {name} into?
      </h1>

      <div className="mt-8">
        <SelectInterests
          targetName={name}
          labels={labels}
          initialRelationship={context?.relationshipType ?? null}
          initialSelection={initialSelection}
          action={saveContribution.bind(null, edgeId)}
        />
      </div>
    </div>
  );
}
