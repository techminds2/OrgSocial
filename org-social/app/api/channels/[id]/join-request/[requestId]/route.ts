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
  const userIdRaw = await getUserIdFromRequest(req);
  const userId = typeof userIdRaw === "string" ? Number(userIdRaw) : userIdRaw;

  if (!userId || !Number.isFinite(userId)) {
    return noStoreJson({ error: "Unauthorized" }, 401);
  }

  const { id, requestId } = await ctx.params;
  const channelId = Number(id);
  const jrId = Number(requestId);

  if (!Number.isFinite(channelId) || !Number.isFinite(jrId)) {
    return noStoreJson({ error: "Bad params", got: { id, requestId } }, 400);
  }

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
    return noStoreJson({ error: "Invalid action" }, 400);
  }

  const jr = await prisma.joinRequest.findUnique({ where: { id: jrId } });
  if (!jr || jr.channelId !== channelId) {
    return noStoreJson({ error: "Join request not found" }, 404);
  }

  if (action === "approve") {
    await prisma.$transaction([
      prisma.joinRequest.update({
        where: { id: jrId },
        data: { status: "approved" },
      }),
      prisma.channelMember.upsert({
        where: { channelId_userId: { channelId, userId: jr.userId } },
        update: {},
        create: { channelId, userId: jr.userId, role: "viewer" },
      }),
    ]);
  } else {
    await prisma.joinRequest.update({
      where: { id: jrId },
      data: { status: "rejected" },
    });
  }

  return noStoreJson({ ok: true });
}
