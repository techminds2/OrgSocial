import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireViewer, canViewDailyReports } from "@/lib/requireAuth";

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
    if (!viewer) return noStoreJson({ items: [] }, 200);

    const { id } = await ctx.params;
    const targetUserId = Number(id);
    if (!Number.isFinite(targetUserId)) return noStoreJson({ error: "Invalid user id" }, 400);

    if (!canViewDailyReports(targetUserId, viewer)) {
      return noStoreJson({ error: "Forbidden" }, 403);
    }

    const month = req.nextUrl.searchParams.get("month")?.trim() || "";
    if (!/^\d{4}-\d{2}$/.test(month)) return noStoreJson({ error: "month must be YYYY-MM" }, 400);

    const start = `${month}-01`;
    const [yy, mm] = month.split("-").map(Number);
    const next = new Date(Date.UTC(yy, mm, 1));
    const endExclusive = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-01`;

    const items = await prisma.dailyReport.findMany({
      where: { authorId: targetUserId, reportYmd: { gte: start, lt: endExclusive } },
      select: { id: true, reportYmd: true, createdAt: true, updatedAt: true },
      orderBy: { reportYmd: "asc" },
    });

    return noStoreJson({ items }, 200);
  } catch (e) {
    console.error("DAILY REPORT MONTH ERROR:", e);
    return noStoreJson({ error: "Server error" }, 500);
  }
}