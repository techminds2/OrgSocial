import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function getMonthLastDay(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export async function GET(req: NextRequest) {
  try {
    const month = req.nextUrl.searchParams.get("month");
    const userIdRaw = req.nextUrl.searchParams.get("userId");

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    const userId = Number(userIdRaw);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const [year, mon] = month.split("-").map(Number);
    const start = `${year}-${String(mon).padStart(2, "0")}-01`;
    const end = `${year}-${String(mon).padStart(2, "0")}-${String(
      getMonthLastDay(year, mon),
    ).padStart(2, "0")}`;

    const notes = await prisma.calendarNote.findMany({
      where: {
        userId,
        noteDate: {
          gte: start,
          lte: end,
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
      { status: 500 },
    );
  }
}
