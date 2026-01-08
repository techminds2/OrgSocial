export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

function noStoreJson(body: any, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function GET(req: NextRequest) {
  try {
    const userIdRaw = await getUserIdFromRequest(req);

    if (!userIdRaw) {
      return noStoreJson({ error: "Unauthorized" }, 401);
    }

    const userId = typeof userIdRaw === "string" ? Number(userIdRaw) : userIdRaw;
    if (!userId || !Number.isFinite(userId)) {
      return noStoreJson({ error: "Unauthorized" }, 401);
    }

    // channels where I'm admin
    const adminChannels = await prisma.channelMember.findMany({
      where: { userId, role: "admin" },
      select: { channelId: true },
    });

    const channelIds = adminChannels.map((x) => x.channelId);

    if (channelIds.length === 0) {
      return noStoreJson({ count: 0, notifications: [] });
    }

    const pending = await prisma.joinRequest.findMany({
      where: { channelId: { in: channelIds }, status: "pending" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
      include: {
        channel: { select: { id: true, name: true } },
        user: { select: { id: true, username: true, email: true, profileImage: true } },
      },
    });

    const notifications = pending.map((r) => ({
      id: r.id,
      type: "JOIN_REQUEST" as const,
      channelId: r.channel.id,
      channelName: r.channel.name,
      userId: r.user.id,
      username: r.user.username,
      createdAt: r.createdAt,
      message: `${r.user.username} requested to join #${r.channel.name}`,
      href: `/requests`, // standalone page
    }));

    return noStoreJson({ count: notifications.length, notifications });
  } catch (e: any) {
    return noStoreJson(
      { error: "Failed to load join requests", detail: String(e?.message || e) },
      500
    );
  }
}
