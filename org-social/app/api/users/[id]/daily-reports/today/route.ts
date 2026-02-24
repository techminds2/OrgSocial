// app/api/users/[id]/daily-reports/today/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireViewer, canViewDailyReports } from "@/lib/requireAuth";
import { todayNepalYmd } from "@/lib/dailyReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(body: any, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const viewer = await requireViewer(req);
    if (!viewer)
      return noStoreJson({ reportYmd: todayNepalYmd(), report: null }, 200);

    const { id } = await ctx.params;
    const targetUserId = Number(id);
    if (!Number.isFinite(targetUserId))
      return noStoreJson({ error: "Invalid user id" }, 400);

    if (!canViewDailyReports(targetUserId, viewer)) {
      return noStoreJson({ error: "Forbidden" }, 403);
    }

    const reportYmd = todayNepalYmd();
    const report = await prisma.dailyReport.findUnique({
      where: { authorId_reportYmd: { authorId: targetUserId, reportYmd } },
    });

    return noStoreJson({ reportYmd, report }, 200);
  } catch (e) {
    console.error("DAILY REPORT TODAY ERROR:", e);
    return noStoreJson({ error: "Server error" }, 500);
  }
}