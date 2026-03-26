import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

function toIntId(v: unknown) {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userIdRaw = await getUserIdFromRequest(req);
  const userId = toIntId(userIdRaw);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const todoId = toIntId(id);

  if (!todoId) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));

    const title =
      typeof body?.title === "string" ? body.title.trim() : undefined;
    const priority =
      body?.priority === "High" ||
      body?.priority === "Medium" ||
      body?.priority === "Low"
        ? body.priority
        : undefined;
    const completed =
      typeof body?.completed === "boolean" ? body.completed : undefined;

    const data: Record<string, any> = {};

    if (title !== undefined) {
      if (!title) {
        return NextResponse.json({ error: "Title required" }, { status: 400 });
      }
      data.title = title;
    }

    if (priority !== undefined) {
      data.priority = priority;
    }

    if (completed !== undefined) {
      data.completed = completed;
      data.completedAt = completed ? new Date() : null;
    }

    const updated = await prisma.todo.updateMany({
      where: {
        id: todoId,
        userId,
        deletedAt: null,
      },
      data,
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    const todo = await prisma.todo.findFirst({
      where: {
        id: todoId,
        userId,
        deletedAt: null,
      },
    });

    return NextResponse.json({ success: true, todo });
  } catch (err: any) {
    console.error("UPDATE TODO ERROR:", err?.message || err);
    return NextResponse.json(
      { error: "Failed to update todo" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userIdRaw = await getUserIdFromRequest(req);
  const userId = toIntId(userIdRaw);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const todoId = toIntId(id);

  if (!todoId) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const deleted = await prisma.todo.updateMany({
      where: {
        id: todoId,
        userId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE TODO ERROR:", err?.message || err);
    return NextResponse.json(
      { error: "Failed to delete todo" },
      { status: 500 }
    );
  }
}