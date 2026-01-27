// src/app/api/todos/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const todos = await prisma.todo.findMany({
      where: { userId },
      orderBy: [
        { priority: "desc" }, 
        { createdAt: "desc" }
      ],
    });
    return NextResponse.json({ todos });
  } catch (err) {
    console.error("GET TODOS ERROR:", err);
    return NextResponse.json(
      { error: "Failed to fetch todos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { title, priority } = body;

    if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

    const todo = await prisma.todo.create({
      data: { userId, title, priority: priority || "Medium" },
    });

    return NextResponse.json({ todo });
  } catch (err) {
    console.error("CREATE TODO ERROR:", err);
    return NextResponse.json({ error: "Failed to create todo" }, { status: 500 });
  }
}
