import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get("date");
    const userIdRaw = req.nextUrl.searchParams.get("userId");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const userId = Number(userIdRaw);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const notes = await prisma.calendarNote.findMany({
      where: {
        userId,
        noteDate: date,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("GET /api/calendar-notes/by-date error:", error);
    return NextResponse.json(
      { error: "Failed to fetch date notes" },
      { status: 500 },
    );
  }
}
