import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(body: any, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const userIdRaw = await getUserIdFromRequest(req);
    const userId =
      typeof userIdRaw === "string" ? Number(userIdRaw) : userIdRaw;

    if (!userId || !Number.isFinite(userId)) {
      return noStoreJson({ error: "Unauthorized" }, 401);
    }

    const { id, requestId } = await ctx.params;
    const channelId = Number(id);
    const jrId = Number(requestId);

    if (
      !Number.isFinite(channelId) ||
      channelId <= 0 ||
      !Number.isFinite(jrId) ||
      jrId <= 0
    ) {
      return noStoreJson(
        { error: "Bad params", got: { id, requestId } },
        400
      );
    }

    // admin check
    const me = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
      select: { role: true },
    });

    if (!me || me.role !== "admin") {
      return noStoreJson({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as "approve" | "reject";
    const role = body?.role as "viewer" | "editor" | "admin";

    if (action !== "approve" && action !== "reject") {
      return noStoreJson(
        { error: "Invalid action", got: body?.action },
        400
      );
    }

    if (action === "approve") {
      if (!role || !["viewer", "editor", "admin"].includes(role)) {
        return noStoreJson({ error: "Invalid role" }, 400);
      }
    }

    // Fetch join request + channel info
    const jr = await prisma.joinRequest.findFirst({
      where: { id: jrId, channelId },
      include: {
        channel: { select: { id: true, name: true } },
        user: { select: { id: true, username: true } },
      },
    });

    if (!jr) {
      return noStoreJson({ error: "Join request not found" }, 404);
    }

    if (jr.status !== "pending") {
      return noStoreJson(
        { error: "Already handled", status: jr.status },
        409
      );
    }

    // --- Apply action ---
    if (action === "approve") {
      await prisma.$transaction([
        prisma.channelMember.upsert({
          where: { channelId_userId: { channelId, userId: jr.userId } },
          update: { role },
          create: {
            channelId,
            userId: jr.userId,
            role,
          },
        }),
        prisma.joinRequest.update({
          where: { id: jrId },
          data: { status: "approved" },
        }),
      ]);
    } else {
      await prisma.joinRequest.update({
        where: { id: jrId },
        data: { status: "rejected" },
      });
    }

    
    const message =
      action === "approve"
        ? `Your request to join #${jr.channel.name} was approved`
        : `Your request to join #${jr.channel.name} was rejected`;

    const notification = await prisma.notification.create({
      data: {
        userId: jr.userId,
        type: "join-request",
        message,
        href: `/channels/${jr.channel.id}`,
      },
    });

    const io = (globalThis as any).io;
    if (io) {
      io.to(`user_${jr.userId}`).emit("notification", {
        id: notification.id,
        type: "join-request",
        channelId: jr.channel.id,
        channelName: jr.channel.name,
        message,
        href: `/channels/${jr.channel.id}`,
        createdAt: new Date(),
      });
    }

    return noStoreJson({ ok: true });
  } catch (e: any) {
    return noStoreJson(
      { error: "Action failed", detail: String(e?.message || e) },
      500
    );
  }
}
