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

/**
 * GET: Admin-only list of pending join requests for a channel
 * URL: /api/channels/:id/join-request
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const userIdRaw = await getUserIdFromRequest(req);
  const userId = typeof userIdRaw === "string" ? Number(userIdRaw) : userIdRaw;

  if (!userId || !Number.isFinite(userId)) {
    return noStoreJson({ error: "Unauthorized" }, 401);
  }

  const { id } = await ctx.params;
  const channelId = Number(id);

  if (!Number.isFinite(channelId)) {
    return noStoreJson({ error: "Bad channel id", got: id }, 400);
  }

  const me = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
    select: { role: true },
  });

  if (!me || me.role !== "admin") {
    return noStoreJson({ error: "Forbidden" }, 403);
  }

  const pending = await prisma.joinRequest.findMany({
    where: { channelId, status: "pending" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      user: { select: { id: true, username: true, email: true, profileImage: true } },
    },
  });

  return noStoreJson({
    requests: pending.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      user: r.user,
    })),
  });
}

/**
 * POST: A normal user requests to join a channel
 * URL: /api/channels/:id/join-request
 * Body: (optional) {}
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const userIdRaw = await getUserIdFromRequest(req);
  const userId = typeof userIdRaw === "string" ? Number(userIdRaw) : userIdRaw;

  if (!userId || !Number.isFinite(userId)) {
    return noStoreJson({ error: "Unauthorized" }, 401);
  }

  const { id } = await ctx.params;
  const channelId = Number(id);

  if (!Number.isFinite(channelId)) {
    return noStoreJson({ error: "Bad channel id", got: id }, 400);
  }

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true, visibility: true },
  });

  if (!channel) return noStoreJson({ error: "Channel not found" }, 404);

  // If channel is public, you may want to join directly (optional behavior).
  // We'll keep consistent with your system: allow join-request for private, too.
  // But prevent duplicate requests/membership.

  const alreadyMember = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
    select: { id: true },
  });

  if (alreadyMember) {
    return noStoreJson({ ok: true, status: "already_member" });
  }

  try {
    const jr = await prisma.joinRequest.upsert({
      where: { channelId_userId: { channelId, userId } },
      update: { status: "pending" }, // if previously rejected/approved, you can decide behavior
      create: { channelId, userId, status: "pending" },
      select: { id: true, status: true, createdAt: true },
    });

    return noStoreJson({ ok: true, joinRequest: jr });
  } catch (e: any) {
    return noStoreJson({ error: "Failed to create join request" }, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const userIdRaw = await getUserIdFromRequest(req);
  const userId = typeof userIdRaw === "string" ? Number(userIdRaw) : userIdRaw;

  if (!userId || !Number.isFinite(userId)) {
    return noStoreJson({ error: "Unauthorized" }, 401);
  }

  const { id } = await ctx.params;
  const channelId = Number(id);

  if (!Number.isFinite(channelId)) {
    return noStoreJson({ error: "Bad channel id", got: id }, 400);
  }

  try {
    // Delete join request only if it belongs to this user
    const deleted = await prisma.joinRequest.deleteMany({
      where: { channelId, userId, status: "pending" },
    });

    if (deleted.count === 0) {
      return noStoreJson({ ok: false, error: "No pending request found" }, 404);
    }

    // Optional: notify admins that the request was cancelled
    // You can implement a notification system here:
    // await prisma.notification.createMany({...})

    return noStoreJson({ ok: true });
  } catch (e: any) {
    return noStoreJson({ error: "Failed to cancel join request", detail: e?.message }, 500);
  }
}