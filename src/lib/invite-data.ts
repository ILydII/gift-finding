import { prisma } from "@/lib/prisma";

export async function loadInvite(token: string) {
  return prisma.invite.findUnique({
    where: { token },
    include: { inviter: true, target: true },
  });
}

export function inviteState(invite: {
  status: string;
  expiresAt: Date | null;
  target: { claimStatus: string };
}): "ok" | "expired" | "accepted" | "declined" {
  if (invite.status === "accepted" || invite.target.claimStatus === "claimed")
    return "accepted";
  if (invite.status === "declined" || invite.target.claimStatus === "declined")
    return "declined";
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now())
    return "expired";
  return "ok";
}
