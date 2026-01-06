export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

function parseChannelId(id: string) {
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const channelId = parseChannelId(id);
    if (!channelId) return NextResponse.json({ error: "Bad channel id" }, { status: 400 });

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, visibility: true },
    });
    if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

    if (channel.visibility !== "public") {
      return NextResponse.json({ error: "Join request allowed only for public channels" }, { status: 400 });
    }

    // already member?
    const isMember = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
      select: { id: true },
    });
    if (isMember) return NextResponse.json({ error: "Already a member" }, { status: 400 });

    const jr = await prisma.joinRequest.upsert({
      where: { channelId_userId: { channelId, userId } },
      update: { status: "pending" },
      create: { channelId, userId, status: "pending" },
    });

    return NextResponse.json({ success: true, request: jr });
  } catch (err) {
    console.error("CREATE JOIN REQUEST ERROR:", err);
    return NextResponse.json({ error: "Failed to request join" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const channelId = parseChannelId(id);
    if (!channelId) return NextResponse.json({ error: "Bad channel id" }, { status: 400 });

    await prisma.joinRequest.delete({
      where: { channelId_userId: { channelId, userId } },
    }).catch(() => null);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("CANCEL JOIN REQUEST ERROR:", err);
    return NextResponse.json({ error: "Failed to cancel request" }, { status: 500 });
  }
}
