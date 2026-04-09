import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireViewer } from "@/lib/requireAuth";
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
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await requireViewer(req);
    if (!viewer) return noStoreJson({ error: "Unauthorized" }, 401);

    const params = await ctx.params;
    const userId = Number(params.id);
    if (!Number.isFinite(userId)) {
      return noStoreJson({ error: "Invalid user id" }, 400);
    }

    const viewerUserId = Number((viewer as any).userId);
    const viewerRole = String(viewer.role || "").toLowerCase();

    const canView =
      (viewerRole === "manager" && viewerUserId === userId) ||
      viewerRole === "admin";

    if (!canView) return noStoreJson({ error: "Forbidden" }, 403);

    const reportYmd = todayNepalYmd();

    const report = await prisma.regionalDailyReport.findUnique({
      where: {
        authorId_reportYmd: {
          authorId: userId,
          reportYmd,
        },
      },
    });

    return noStoreJson({ reportYmd, report });
  } catch (e) {
    console.error("REGIONAL REPORT TODAY ERROR:", e);
    return noStoreJson({ error: "Server error" }, 500);
  }
}