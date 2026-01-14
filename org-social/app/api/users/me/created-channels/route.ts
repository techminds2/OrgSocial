import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const channels = await prisma.channel.findMany({
    where: { createdById: userId },
    select: { id: true, name: true, createdAt: true, visibility: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ channels });
}
