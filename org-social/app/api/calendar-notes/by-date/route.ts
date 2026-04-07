import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireViewer } from "@/lib/requireAuth";

export async function GET(req: NextRequest) {
  try {
    const viewer = await requireViewer(req);
    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const date = req.nextUrl.searchParams.get("date");
    const userIdRaw = req.nextUrl.searchParams.get("userId");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const requestedUserId = Number(userIdRaw);
    if (!Number.isFinite(requestedUserId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const isAdmin = viewer.role === "admin";
    const isSelf = viewer.userId === requestedUserId;

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const notes = await prisma.calendarNote.findMany({
      where: {
        userId: requestedUserId,
        noteDate: date,
      },
      include: {
        createdBy: {
          select: { id: true, username: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("GET /api/calendar-notes/by-date error:", error);
    return NextResponse.json(
      { error: "Failed to fetch date notes" },
      { status: 500 }
    );
  }
}