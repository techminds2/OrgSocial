export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channels = await prisma.channel.findMany({
      where: {
        visibility: "public",
        NOT: {
          members: {
            some: { userId },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        _count: {
          select: { members: true },
        },
        joinRequests: {
          where: { userId, status: "pending" },
          select: { id: true, status: true },
        },
      },
      take: 50,
    });

    const formatted = channels.map((c) => {
      const pending = c.joinRequests[0] ?? null;
      const isRequestBased = c.publicAccessMode === "request";

      return {
        id: c.id,
        name: c.name,
        createdAt: c.createdAt,
        visibility: c.visibility,
        publicAccessMode: c.publicAccessMode,
        memberCount: c._count.members,
        isMember: false,
        hasPendingRequest: isRequestBased ? !!pending : false,
        pendingRequestId: isRequestBased ? pending?.id ?? null : null,
      };
    });

    return NextResponse.json({ channels: formatted });
  } catch (err) {
    console.error("GET PUBLIC CHANNELS ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load public channels" },
      { status: 500 }
    );
  }
}