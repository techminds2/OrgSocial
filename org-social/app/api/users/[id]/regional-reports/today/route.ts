import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireViewer } from "@/lib/requireAuth";
import { todayNepalYmd } from "@/lib/dailyReport";

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

    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
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

    const reportYmd = todayNepalYmd();

    const report = await prisma.regionalDailyReport.findUnique({
      where: {
        authorId_reportYmd: {
          authorId: userId,
          reportYmd,
        },
      },
    });

    return NextResponse.json({
      reportYmd,
      report,
    });
  } catch (error) {
    console.error("regional-reports/today GET error:", error);
    return NextResponse.json(
      { error: "Failed to load today's regional report" },
      { status: 500 },
    );
  }
}