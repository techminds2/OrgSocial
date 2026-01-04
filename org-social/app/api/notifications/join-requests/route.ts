export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // channels where I'm admin
  const adminChannels = await prisma.channelMember.findMany({
    where: { userId, role: "admin" },
    select: { channelId: true },
  });

  const channelIds = adminChannels.map((x) => x.channelId);
  if (channelIds.length === 0) {
    return NextResponse.json({ count: 0, notifications: [] });
  }

  const pending = await prisma.joinRequest.findMany({
    where: { channelId: { in: channelIds }, status: "pending" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 25,
    include: {
      channel: { select: { id: true, name: true } },
      user: { select: { id: true, username: true, email: true, profileImage: true } },
    },
  });

  const notifications = pending.map((r) => ({
    id: r.id,
    type: "JOIN_REQUEST",
    channelId: r.channel.id,
    channelName: r.channel.name,
    userId: r.user.id,
    username: r.user.username,
    createdAt: r.createdAt,
    message: `${r.user.username} requested to join #${r.channel.name}`,
    href: `/channels/${r.channel.id}/requests`,
  }));

  return NextResponse.json({ count: pending.length, notifications });
}
