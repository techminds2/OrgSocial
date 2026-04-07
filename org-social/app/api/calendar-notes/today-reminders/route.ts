import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireViewer } from "@/lib/requireAuth";

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

export async function GET(req: NextRequest) {
  try {
    const viewer = await requireViewer(req);

    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = todayNepalYmd();

    const notes = await prisma.calendarNote.findMany({
      where: {
        userId: viewer.userId,
        noteDate: today,
      },
      include: {
        createdBy: {
          select: { id: true, username: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const reminders = notes.map((n) => ({
      id: `calendar-note-${n.id}`,
      sourceId: n.id,
      type: n.type,
      message: n.title,
      description: n.description || "",
      createdAt: n.createdAt,
      href: `/profile?date=${n.noteDate}`,
      noteDate: n.noteDate,
      isRead: false,
      createdBy: n.createdBy,
      createdById: n.createdById,
      userId: n.userId,
      isAdminAdded: n.createdById !== n.userId,
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