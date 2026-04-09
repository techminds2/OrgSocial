import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireViewer } from "@/lib/requireAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(body: any, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function monthRange(month: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;

  const year = Number(m[1]);
  const mon = Number(m[2]);

  if (!year || mon < 1 || mon > 12) return null;

  const start = `${year}-${String(mon).padStart(2, "0")}-01`;

  const next = new Date(year, mon, 1);
  const end = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;

  return { start, end };
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

    const month = String(req.nextUrl.searchParams.get("month") || "");
    const range = monthRange(month);
    if (!range) return noStoreJson({ error: "Invalid month" }, 400);

    const items = await prisma.regionalDailyReport.findMany({
      where: {
        authorId: userId,
        reportYmd: {
          gte: range.start,
          lt: range.end,
        },
      },
      select: {
        id: true,
        reportYmd: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ reportYmd: "asc" }, { id: "asc" }],
    });

    return noStoreJson({ month, items });
  } catch (e) {
    console.error("REGIONAL REPORT MONTH ERROR:", e);
    return noStoreJson({ error: "Server error" }, 500);
  }
}