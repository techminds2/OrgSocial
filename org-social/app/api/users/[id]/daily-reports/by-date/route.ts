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

    const date = req.nextUrl.searchParams.get("date");
    if (!date) {
      return NextResponse.json({ report: null });
    }

    const report = await prisma.dailyReport.findFirst({
      where: {
        authorId: targetUserId,
        reportYmd: date,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("GET /api/users/[id]/daily-report/by-date error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}