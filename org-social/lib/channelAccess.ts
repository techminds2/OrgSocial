import prisma from "@/lib/prisma";

export type ChannelRole = "viewer" | "editor" | "admin";

export async function getChannelMemberRole(channelId: number, userId: number): Promise<ChannelRole | null> {
  const m = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
    select: { role: true },
  });
  return (m?.role as ChannelRole) || null;
}

export async function isChannelMember(channelId: number, userId: number): Promise<boolean> {
  const m = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
    select: { id: true },
  });
  return !!m;
}

export async function requireChannelRole(
  channelId: number,
  userId: number,
  allowed: ChannelRole[]
): Promise<boolean> {
  const role = await getChannelMemberRole(channelId, userId);
  if (!role) return false;
  return allowed.includes(role);
}
