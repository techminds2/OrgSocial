import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireViewer } from "@/lib/requireAuth";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await requireViewer(req);
    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const userId = Number(id);
    const date = String(req.nextUrl.searchParams.get("date") || "").trim();

    if (!Number.isFinite(userId) || userId <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const canView =
      (viewer.role === "manager" && viewer.userId === userId) ||
      (viewer.role === "admin" && targetUser.role === "manager");

    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const report = await prisma.regionalDailyReport.findUnique({
      where: {
        authorId_reportYmd: {
          authorId: userId,
          reportYmd: date,
        },
      },
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("regional-reports/by-date GET error:", error);
    return NextResponse.json(
      { error: "Failed to load regional report by date" },
      { status: 500 },
    );
  }
}