export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const channelId = Number(id);
    if (!Number.isFinite(channelId) || channelId <= 0) {
      return NextResponse.json({ error: "Invalid channel id" }, { status: 400 });
    }

    // permission check: creator OR admin
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: {
        id: true,
        createdById: true,
        members: {
          where: { userId },
          select: { role: true },
          take: 1,
        },
      },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const isCreator = channel.createdById === userId;
    const isAdmin = channel.members[0]?.role === "admin";

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ delete children first (because File/Comment/Reaction don't cascade from Post)
    const postIds = await prisma.post.findMany({
      where: { channelId },
      select: { id: true },
    });

    const ids = postIds.map((p) => p.id);

    await prisma.$transaction(async (tx) => {
      if (ids.length) {
        await tx.comment.deleteMany({ where: { postId: { in: ids } } });
        await tx.reaction.deleteMany({ where: { postId: { in: ids } } });
        await tx.file.deleteMany({ where: { postId: { in: ids } } });
        await tx.post.deleteMany({ where: { id: { in: ids } } });
      }

      // clean related rows directly attached to channel (safe even if cascades exist)
      await tx.joinRequest.deleteMany({ where: { channelId } });
      await tx.channelMember.deleteMany({ where: { channelId } });

      // finally delete channel
      await tx.channel.delete({ where: { id: channelId } });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE CHANNEL ERROR:", err);
    return NextResponse.json({ error: "Failed to delete channel" }, { status: 500 });
  }
}
