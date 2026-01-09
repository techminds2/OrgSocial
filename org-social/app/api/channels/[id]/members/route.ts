export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";
import { requireChannelRole, ChannelRole } from "@/lib/channelAccess";

type Ctx = { params: Promise<{ id: string }> };

function parseChannelId(id: string) {
  const channelId = Number(id);
  return Number.isFinite(channelId) ? channelId : null;
}

const VALID_ROLES: ChannelRole[] = ["viewer", "editor", "admin"];

/* =========================
   GET – list members
   ========================= */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const channelId = parseChannelId(id);
    if (!channelId) {
      return NextResponse.json({ error: "Bad channel id" }, { status: 400 });
    }

    // Any member can view
    const isMember = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
      select: { id: true },
    });

    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const members = await prisma.channelMember.findMany({
      where: { channelId },
      orderBy: [{ role: "asc" }, { id: "asc" }],
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    return NextResponse.json({
      members: members.map((m) => ({
        userId: m.userId,
        role: m.role,
        user: m.user,
      })),
    });
  } catch (err) {
    console.error("GET MEMBERS ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load members" },
      { status: 500 }
    );
  }
}

/* =========================
   POST – add or upsert member
   ========================= */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const channelId = parseChannelId(id);
    if (!channelId) {
      return NextResponse.json({ error: "Bad channel id" }, { status: 400 });
    }

    // Admin only
    const ok = await requireChannelRole(channelId, userId, ["admin"]);
    if (!ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const addUserId = Number(body.userId);
    const role = String(body.role || "viewer") as ChannelRole;

    if (!Number.isFinite(addUserId)) {
      return NextResponse.json({ error: "Bad userId" }, { status: 400 });
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Bad role" }, { status: 400 });
    }

    const member = await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId, userId: addUserId } },
      update: { role },
      create: { channelId, userId: addUserId, role },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, member });
  } catch (err) {
    console.error("ADD MEMBER ERROR:", err);
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    );
  }
}

/* =========================
   PATCH – update role only
   ========================= */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const channelId = parseChannelId(id);
    if (!channelId) {
      return NextResponse.json({ error: "Bad channel id" }, { status: 400 });
    }

    // Admin only
    const ok = await requireChannelRole(channelId, userId, ["admin"]);
    if (!ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const targetUserId = Number(body.userId);
    const role = String(body.role) as ChannelRole;

    if (!Number.isFinite(targetUserId)) {
      return NextResponse.json({ error: "Bad userId" }, { status: 400 });
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Bad role" }, { status: 400 });
    }

    // Safety: admin cannot demote self
    if (targetUserId === userId && role !== "admin") {
      return NextResponse.json(
        { error: "You cannot remove your own admin role" },
        { status: 400 }
      );
    }

    const updated = await prisma.channelMember.update({
      where: { channelId_userId: { channelId, userId: targetUserId } },
      data: { role },
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (err) {
    console.error("UPDATE MEMBER ERROR:", err);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE – remove member
   ========================= */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const channelId = parseChannelId(id);
    if (!channelId) {
      return NextResponse.json({ error: "Bad channel id" }, { status: 400 });
    }

    // Admin only
    const ok = await requireChannelRole(channelId, userId, ["admin"]);
    if (!ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = Number(searchParams.get("userId"));

    if (!Number.isFinite(targetUserId)) {
      return NextResponse.json({ error: "Bad userId" }, { status: 400 });
    }

    // Safety: cannot remove self
    if (targetUserId === userId) {
      return NextResponse.json(
        { error: "You cannot remove yourself" },
        { status: 400 }
      );
    }

    await prisma.channelMember.delete({
      where: { channelId_userId: { channelId, userId: targetUserId } },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("REMOVE MEMBER ERROR:", err);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
