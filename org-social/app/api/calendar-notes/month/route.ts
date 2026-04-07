import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireViewer } from "@/lib/requireAuth";

function getMonthLastDay(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export async function GET(req: NextRequest) {
  try {
    const viewer = await requireViewer(req);
    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const month = req.nextUrl.searchParams.get("month");
    const userIdRaw = req.nextUrl.searchParams.get("userId");

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
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

    const [year, mon] = month.split("-").map(Number);
    const start = `${year}-${String(mon).padStart(2, "0")}-01`;
    const end = `${year}-${String(mon).padStart(2, "0")}-${String(
      getMonthLastDay(year, mon)
    ).padStart(2, "0")}`;

    const notes = await prisma.calendarNote.findMany({
      where: {
        userId: requestedUserId,
        noteDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        createdBy: {
          select: { id: true, username: true, email: true },
        },
      },
      orderBy: [{ noteDate: "asc" }, { createdAt: "asc" }],
    });

    const countsByDate: Record<string, number> = {};
    for (const n of notes) {
      countsByDate[n.noteDate] = (countsByDate[n.noteDate] || 0) + 1;
    }

    return NextResponse.json({
      items: notes,
      countsByDate,
    });
  } catch (error) {
    console.error("GET /api/calendar-notes/month error:", error);
    return NextResponse.json(
      { error: "Failed to fetch month notes" },
      { status: 500 }
    );
  }
}