import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function todayNepalYmd() {
  const now = new Date();
  const nepalTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kathmandu" }),
  );

  const y = nepalTime.getFullYear();
  const m = String(nepalTime.getMonth() + 1).padStart(2, "0");
  const d = String(nepalTime.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

export async function GET() {
  try {
    // replace this later with actual logged-in user id
    const userId = 1;

    const today = todayNepalYmd();

    const notes = await prisma.calendarNote.findMany({
      where: {
        userId,
        noteDate: today,
      },
      orderBy: { createdAt: "asc" },
    });

    const reminders = notes.map((n) => ({
      id: `calendar-note-${n.id}`,
      sourceId: n.id,
      type: "calendar-note",
      message: n.title,
      description: n.description || "",
      createdAt: n.createdAt,
      href: `/profile?date=${n.noteDate}`,
      noteDate: n.noteDate,
      isRead: false,
    }));

    return NextResponse.json({ reminders });
  } catch (error) {
    console.error("GET /api/calendar-notes/today-reminders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reminders" },
      { status: 500 },
    );
  }
}