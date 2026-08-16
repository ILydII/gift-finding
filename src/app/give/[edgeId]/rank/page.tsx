import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOwnedEdge, firstName } from "@/lib/give-data";
import { RankList, type RankRow } from "@/components/give/RankList";
import { saveRanking } from "@/app/give/actions";

export const dynamic = "force-dynamic";

// G3 (PRD §3A/§4) — rank, refine, add. Selection order arrives as the
// provisional ranking; this screen turns it into deliberate ordinal data.
export default async function RankPage({
  params,
}: {
  params: Promise<{ edgeId: string }>;
}) {
  const { edgeId } = await params;
  const owned = await getOwnedEdge(edgeId);
  if (!owned) redirect("/");
  const { edge, actor } = owned;
  const name = firstName(edge.userB);

  const interests = await prisma.interest.findMany({
    where: { ownerId: edge.userBId, contributedById: actor.id },
    include: { rankings: { where: { rankerId: actor.id } } },
    orderBy: { createdAt: "asc" },
  });
  if (interests.length === 0) redirect(`/give/${edgeId}`);

  const tagSlugs = interests
    .map((i) => i.taxonomyTag)
    .filter((s): s is string => Boolean(s));
  const tags = await prisma.interestTag.findMany({
    where: { slug: { in: tagSlugs } },
  });
  const labelBySlug = new Map(tags.map((t) => [t.slug, t.label]));

  const rows: RankRow[] = interests
    .map((i) => ({
      key: i.id,
      id: i.id,
      freeText: i.freeText ?? undefined,
      label: i.freeText ?? labelBySlug.get(i.taxonomyTag ?? "") ?? "Unknown",
      rank: i.rankings[0]?.rankValue ?? null,
    }))
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    .map(({ key, id, freeText, label }) => ({ key, id, freeText, label }));

  const note = await prisma.friendNote.findFirst({
    where: { ownerId: actor.id, subjectId: edge.userBId },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">
        Sound about right?
      </h1>
      <p className="mt-2 text-foreground/60">
        We put these in the order you picked them. Move anything that&apos;s off
        — your top 3 do most of the work.
      </p>

      <div className="mt-8">
        <RankList
          targetName={name}
          initialRows={rows}
          initialNote={note?.noteText ?? ""}
          action={saveRanking.bind(null, edgeId)}
        />
      </div>
    </div>
  );
}
