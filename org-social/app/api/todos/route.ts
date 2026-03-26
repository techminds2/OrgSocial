import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

function toIntId(v: unknown) {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  const userIdRaw = await getUserIdFromRequest(req);
  const userId = toIntId(userIdRaw);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const todos = await prisma.todo.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [
          { completed: false },
          { completed: true, completedAt: null },
          { completed: true, completedAt: { gte: oneWeekAgo } },
        ],
      },
      orderBy: [
        { completed: "asc" },
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ todos });
  } catch (err: any) {
    console.error("GET TODOS ERROR:", err?.message || err);
    return NextResponse.json(
      { error: "Failed to fetch todos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const userIdRaw = await getUserIdFromRequest(req);
  const userId = toIntId(userIdRaw);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const priority =
      body?.priority === "High" ||
      body?.priority === "Medium" ||
      body?.priority === "Low"
        ? body.priority
        : "Medium";

    if (!title) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }

    const todo = await prisma.todo.create({
      data: {
        userId,
        title,
        priority,
        completed: false,
        completedAt: null,
        deletedAt: null,
      },
    });

    return NextResponse.json({ todo }, { status: 201 });
  } catch (err: any) {
    console.error("CREATE TODO ERROR:", err?.message || err);
    return NextResponse.json(
      { error: "Failed to create todo" },
      { status: 500 }
    );
  }
}