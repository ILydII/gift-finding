import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/guest";
import type { FriendEdge, User } from "@/generated/prisma/client";

/** Shared by every /give/[edgeId] page: the edge must belong to the current
 *  viewer — the signed-in user or this browser's guest row. */
export async function getOwnedEdge(
  edgeId: string,
): Promise<{ edge: FriendEdge & { userB: User }; actor: User } | null> {
  const { user } = await getViewer();
  if (!user) return null;
  const edge = await prisma.friendEdge.findUnique({
    where: { id: edgeId },
    include: { userB: true },
  });
  if (!edge || edge.userAId !== user.id) return null;
  return { edge, actor: user };
}

/** First name for copy ("Emma", not "Emma Watson-Smith the 3rd"). */
export function firstName(user: { name: string | null }): string {
  return user.name?.trim().split(/\s+/)[0] ?? "your friend";
}
