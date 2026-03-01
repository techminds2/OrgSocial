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
    if (!viewer) return noStoreJson({ report: null }, 200);

    const { id } = await ctx.params;
    const targetUserId = Number(id);

    if (!canViewDailyReports(targetUserId, viewer))
      return noStoreJson({ error: "Forbidden" }, 403);

    const date = req.nextUrl.searchParams.get("date") || "";

    const report = await prisma.regionalDailyReport.findUnique({
      where: { authorId_reportYmd: { authorId: targetUserId, reportYmd: date } },
    });

    return noStoreJson({ report }, 200);
  } catch (e) {
    return noStoreJson({ error: "Server error" }, 500);
  }
}