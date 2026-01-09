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
    const userId = typeof userIdRaw === "string" ? Number(userIdRaw) : userIdRaw;

    if (!userId || !Number.isFinite(userId)) {
      return noStoreJson({ error: "Unauthorized" }, 401);
    }

    const { id, requestId } = await ctx.params;
    const channelId = Number(id);
    const jrId = Number(requestId);

    if (!Number.isFinite(channelId) || channelId <= 0 || !Number.isFinite(jrId) || jrId <= 0) {
      return noStoreJson({ error: "Bad params", got: { id, requestId } }, 400);
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

    if (action !== "approve" && action !== "reject") {
      return noStoreJson({ error: "Invalid action", got: body?.action }, 400);
    }

    // IMPORTANT: ensure it belongs to this channel AND is still pending
    const jr = await prisma.joinRequest.findFirst({
      where: { id: jrId, channelId },
      select: { id: true, userId: true, status: true, channelId: true },
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

    if (action === "approve") {
      await prisma.$transaction([
        prisma.channelMember.upsert({
          where: { channelId_userId: { channelId, userId: jr.userId } },
          update: {}, // keep existing role if already member
          create: { channelId, userId: jr.userId, role: "viewer" },
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

    return noStoreJson({ ok: true });
  } catch (e: any) {
    return noStoreJson(
      { error: "Action failed", detail: String(e?.message || e) },
      500
    );
  }
}
