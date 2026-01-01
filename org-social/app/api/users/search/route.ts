export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") || "").trim();
    if (!q) return NextResponse.json({ users: [] });

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: { id: true, username: true, email: true, profileImage: true },
      orderBy: { id: "desc" },
    });

    return NextResponse.json({ users });
  } catch (err) {
    console.error("USER SEARCH ERROR:", err);
    return NextResponse.json({ error: "Failed search" }, { status: 500 });
  }
}
