import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { FriendEdge, User } from "@/generated/prisma/client";

/** Shared by every /give/[edgeId] page: the edge must belong to the current
 *  signed-in user. Sign-in happens up front (before naming anyone), so there
 *  is no guest/anonymous state to account for here. */
export async function getOwnedEdge(
  edgeId: string,
): Promise<{ edge: FriendEdge & { userB: User }; actor: User } | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const edge = await prisma.friendEdge.findUnique({
    where: { id: edgeId },
    include: { userB: true },
  });
  if (!edge || edge.userAId !== session.user.id) return null;
  const actor = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!actor) return null;
  return { edge, actor };
}

/** First name for copy ("Emma", not "Emma Watson-Smith the 3rd"). */
export function firstName(user: { name: string | null }): string {
  return user.name?.trim().split(/\s+/)[0] ?? "your friend";
}
