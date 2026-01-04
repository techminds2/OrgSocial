export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";
import { requireChannelRole } from "@/lib/channelAccess";

type Ctx = { params: Promise<{ id: string; requestId: string }> };

function num(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, requestId } = await ctx.params;
    const channelId = num(id);
    const jrId = num(requestId);

    if (!channelId) return NextResponse.json({ error: "Bad channel id" }, { status: 400 });
    if (!jrId) return NextResponse.json({ error: "Bad request id" }, { status: 400 });

    const ok = await requireChannelRole(channelId, userId, ["admin"]);
    if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").toLowerCase(); // "approve" | "reject"
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
    }

    const jr = await prisma.joinRequest.findUnique({
      where: { id: jrId },
      select: { id: true, channelId: true, userId: true, status: true },
    });

    if (!jr || jr.channelId !== channelId) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (action === "reject") {
      const updated = await prisma.joinRequest.update({
        where: { id: jrId },
        data: { status: "rejected" },
      });
      return NextResponse.json({ success: true, request: updated });
    }

    // approve
    const result = await prisma.$transaction(async (tx) => {
      await tx.joinRequest.update({
        where: { id: jrId },
        data: { status: "approved" },
      });

      // ensure member exists
      await tx.channelMember.upsert({
        where: { channelId_userId: { channelId, userId: jr.userId } },
        update: { role: "viewer" },
        create: { channelId, userId: jr.userId, role: "viewer" },
      });

      return true;
    });

    return NextResponse.json({ success: result });
  } catch (err) {
    console.error("APPROVE/REJECT ERROR:", err);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}
