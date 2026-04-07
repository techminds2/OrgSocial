import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireViewer } from "@/lib/requireAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(body: any, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function cleanStr(v: any) {
  return typeof v === "string" ? v.trim() : "";
}

function isValidYmd(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function isValidType(v: any): v is "PERSONAL" | "MEETING" | "ADMIN_REMINDER" {
  return v === "PERSONAL" || v === "MEETING" || v === "ADMIN_REMINDER";
}

async function getNoteId(
  ctx: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  const params = await Promise.resolve(ctx.params);
  const id = Number(params.id);
  return id;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const viewer = await requireViewer(req);
    if (!viewer) {
      return noStoreJson({ error: "Unauthorized" }, 401);
    }

    const id = await getNoteId(ctx);
    if (!Number.isFinite(id)) {
      return noStoreJson({ error: "Invalid note id" }, 400);
    }

    const existing = await prisma.calendarNote.findUnique({
      where: { id },
    });

    if (!existing) {
      return noStoreJson({ error: "Note not found" }, 404);
    }

    const canEdit =
      existing.type === "PERSONAL"
        ? viewer.userId === existing.userId
        : viewer.role === "admin" && viewer.userId === existing.createdById;

    if (!canEdit) {
      return noStoreJson({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));

    const noteDate = cleanStr(body?.noteDate);
    const title = cleanStr(body?.title);
    const description = cleanStr(body?.description) || null;
    const type = body?.type;

    if (!isValidYmd(noteDate)) {
      return noStoreJson({ error: "Invalid noteDate" }, 400);
    }

    if (!title) {
      return noStoreJson({ error: "Title is required" }, 400);
    }

    if (!isValidType(type)) {
      return noStoreJson({ error: "Invalid note type" }, 400);
    }

    // non-admin cannot convert to MEETING / ADMIN_REMINDER
    if (viewer.role !== "admin" && type !== "PERSONAL") {
      return noStoreJson(
        { error: "Only admin can use meeting/admin reminder types" },
        403
      );
    }

    const note = await prisma.calendarNote.update({
      where: { id },
      data: {
        noteDate,
        title,
        description,
        type,
      },
      include: {
        createdBy: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    return noStoreJson({ note }, 200);
  } catch (error) {
    console.error("PATCH /api/calendar-notes/[id] error:", error);
    return noStoreJson({ error: "Failed to update note" }, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const viewer = await requireViewer(req);
    if (!viewer) {
      return noStoreJson({ error: "Unauthorized" }, 401);
    }

    const id = await getNoteId(ctx);
    if (!Number.isFinite(id)) {
      return noStoreJson({ error: "Invalid note id" }, 400);
    }

    const existing = await prisma.calendarNote.findUnique({
      where: { id },
    });

    if (!existing) {
      return noStoreJson({ error: "Note not found" }, 404);
    }

    const canDelete =
      existing.type === "PERSONAL"
        ? viewer.userId === existing.userId
        : viewer.role === "admin" && viewer.userId === existing.createdById;

    if (!canDelete) {
      return noStoreJson({ error: "Forbidden" }, 403);
    }

    await prisma.calendarNote.delete({
      where: { id },
    });

    return noStoreJson({ success: true }, 200);
  } catch (error) {
    console.error("DELETE /api/calendar-notes/[id] error:", error);
    return noStoreJson({ error: "Failed to delete note" }, 500);
  }
}