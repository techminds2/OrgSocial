import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const userId = Number(body?.userId);
    const noteDate = String(body?.noteDate || "");
    const title = String(body?.title || "").trim();
    const description = String(body?.description || "").trim();

    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(noteDate)) {
      return NextResponse.json({ error: "Invalid noteDate" }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const note = await prisma.calendarNote.create({
      data: {
        userId,
        noteDate,
        title,
        description: description || null,
      },
    });

    return NextResponse.json({ note });
  } catch (error) {
    console.error("POST /api/calendar-notes error:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 },
    );
  }
}