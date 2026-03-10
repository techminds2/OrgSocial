import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  cleanToken,
  getUserFromRequest,
  fetchCorporateUserById,
  canViewDailyReports,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const viewer = await getUserFromRequest(req);

    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const targetUserId = Number(id);

    if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const raw = req.cookies.get("accessToken")?.value;
    if (!raw) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = cleanToken(raw);

    const targetUser = await fetchCorporateUserById(token, targetUserId);
    const targetRole = (targetUser?.role ?? null) as string | null;

    const allowed = canViewDailyReports({
      viewerRole: viewer.role,
      viewerId: viewer.user_id,
      targetUserId,
      targetUserRole: targetRole,
    });

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const month = req.nextUrl.searchParams.get("month");
    if (!month) {
      return NextResponse.json({ items: [] });
    }

    const startDate = `${month}-01`;
    const nextMonthDate = new Date(`${month}-01T00:00:00`);

    if (Number.isNaN(nextMonthDate.getTime())) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const endYear = nextMonthDate.getFullYear();
    const endMonth = String(nextMonthDate.getMonth() + 1).padStart(2, "0");
    const endDate = `${endYear}-${endMonth}-01`;

    const items = await prisma.dailyReport.findMany({
      where: {
        authorId: targetUserId,
        reportYmd: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        id: true,
        reportYmd: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        reportYmd: "desc",
      },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/users/[id]/daily-report/month error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}