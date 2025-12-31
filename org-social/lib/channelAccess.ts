import prisma from "@/lib/prisma";

export async function isChannelMember(channelId: number, userId: number) {
  const member = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
    select: { id: true },
  });
  return !!member;
}
