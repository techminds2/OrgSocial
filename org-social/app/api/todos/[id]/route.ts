// src/app/api/todos/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params; // ✅ unwrap
  const todoId = Number(id);

  if (!Number.isFinite(todoId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { title, priority, completed } = body;

    const todo = await prisma.todo.updateMany({
      where: { id: todoId, userId },
      data: {
        ...(title !== undefined && { title }),
        ...(priority !== undefined && { priority }),
        ...(completed !== undefined && { completed }),
      },
    });

    if (todo.count === 0) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("UPDATE TODO ERROR:", err);
    return NextResponse.json({ error: "Failed to update todo" }, { status: 500 });
  }
}


export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // params is a Promise
) {
  try {
    const { id: todoIdStr } = await params; // unwrap the Promise here

    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!todoIdStr) {
      return NextResponse.json({ error: "ID missing" }, { status: 400 });
    }

    const todoId = parseInt(todoIdStr, 10);
    if (isNaN(todoId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const deleted = await prisma.todo.deleteMany({
      where: { id: todoId, userId }, // only delete user's own todo
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE TODO ERROR:", err);
    return NextResponse.json({ error: "Failed to delete todo" }, { status: 500 });
  }
}
