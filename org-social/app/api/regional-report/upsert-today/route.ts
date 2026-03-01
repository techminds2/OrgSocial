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

const intOrNull = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
};

const cleanStr = (v: any) => (typeof v === "string" ? v.trim() : "");

export async function POST(req: NextRequest) {
  try {
    const viewer = await requireViewer(req);
    if (!viewer) return noStoreJson({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));

    const reportYmd = cleanStr(body?.reportYmd) || todayNepalYmd();
    const regionName = cleanStr(body?.regionName);

    if (!regionName)
      return noStoreJson({ error: "Region Name is required" }, 400);

    const data = {
      reportYmd,
      regionName,
      totalMeetings: intOrNull(body?.totalMeetings),
      totalBranchesVisited: intOrNull(body?.totalBranchesVisited),
      marketingDaysPlanned: intOrNull(body?.marketingDaysPlanned),
      dynamicData: body?.dynamicData || {},
      remarks: cleanStr(body?.remarks) || null,
    };

    const report = await prisma.regionalDailyReport.upsert({
      where: {
        authorId_reportYmd: {
          authorId: viewer.userId,
          reportYmd,
        },
      },
      create: {
        authorId: viewer.userId,
        ...data,
      },
      update: data,
    });

    return noStoreJson({ reportYmd, report }, 200);
  } catch (e) {
    console.error("REGIONAL REPORT UPSERT ERROR:", e);
    return noStoreJson({ error: "Server error" }, 500);
  }
}
