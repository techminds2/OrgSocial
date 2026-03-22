import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const noteId = Number(id);

    if (!Number.isFinite(noteId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();

    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const noteDate = String(body.noteDate || "");

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(noteDate)) {
      return NextResponse.json({ error: "Invalid noteDate" }, { status: 400 });
    }

    const updated = await prisma.calendarNote.update({
      where: { id: noteId },
      data: {
        title,
        description: description || null,
        noteDate,
      },
    });

    return NextResponse.json({ note: updated });
  } catch (error) {
    console.error("PATCH /api/calendar-notes/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const noteId = Number(id);

    if (!Number.isFinite(noteId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await prisma.calendarNote.delete({
      where: { id: noteId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/calendar-notes/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 },
    );
  }
}
