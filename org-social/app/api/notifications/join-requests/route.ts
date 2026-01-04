export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userIdRaw = await getUserIdFromRequest(req);
  console.log("[notif] userIdRaw:", userIdRaw, "type:", typeof userIdRaw);

  if (!userIdRaw) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = typeof userIdRaw === "string" ? Number(userIdRaw) : userIdRaw;
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminChannels = await prisma.channelMember.findMany({
    where: { userId, role: "admin" },
    select: { channelId: true },
  });

  const channelIds = adminChannels.map((x) => x.channelId);
  console.log("[notif] channelIds:", channelIds);

  if (channelIds.length === 0) {
    return NextResponse.json(
      { count: 0, notifications: [] },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
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

  console.log("[notif] pendingCount:", pending.length);

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

  return NextResponse.json(
    { count: pending.length, notifications },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
