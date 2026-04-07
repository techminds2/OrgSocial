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

export async function POST(req: NextRequest) {
  try {
    const viewer = await requireViewer(req);
    if (!viewer) {
      return noStoreJson({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));

    const userId = Number(body?.userId);
    const noteDate = cleanStr(body?.noteDate);
    const title = cleanStr(body?.title);
    const description = cleanStr(body?.description) || null;
    const type = body?.type;

    if (!Number.isFinite(userId)) {
      return noStoreJson({ error: "Invalid userId" }, 400);
    }

    if (!isValidYmd(noteDate)) {
      return noStoreJson({ error: "Invalid noteDate" }, 400);
    }

    if (!title) {
      return noStoreJson({ error: "Title is required" }, 400);
    }

    if (!isValidType(type)) {
      return noStoreJson({ error: "Invalid note type" }, 400);
    }

    const isAdmin = viewer.role === "admin";
    const isSelf = viewer.userId === userId;

    // branch_manager can only create PERSONAL note for self
    if (!isAdmin && !isSelf) {
      return noStoreJson({ error: "Forbidden" }, 403);
    }

    if (!isAdmin && type !== "PERSONAL") {
      return noStoreJson(
        { error: "Only admin can create meeting/admin reminders" },
        403
      );
    }

    const note = await prisma.calendarNote.create({
      data: {
        userId,
        createdById: viewer.userId,
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

    return noStoreJson({ note }, 201);
  } catch (error) {
    console.error("POST /api/calendar-notes error:", error);
    return noStoreJson({ error: "Failed to create note" }, 500);
  }
}