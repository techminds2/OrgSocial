export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const channelId = Number(id);
  if (!Number.isFinite(channelId)) return NextResponse.json({ error: "Bad channel id" }, { status: 400 });

  const jr = await prisma.joinRequest.findUnique({
    where: { channelId_userId: { channelId, userId } },
    select: { status: true },
  });

  return NextResponse.json({ pending: jr?.status === "pending" });
}
