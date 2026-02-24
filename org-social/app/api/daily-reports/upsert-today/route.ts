// app/api/daily-reports/upsert-today/route.ts
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

const int0 = (v: any) => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.trunc(n);
};

const cleanStr = (v: any) => (typeof v === "string" ? v.trim() : "");
const cleanBranch = (s: string) => s.replace(/[^a-zA-Z0-9\s-]/g, "").trim();

export async function POST(req: NextRequest) {
  try {
    const viewer = await requireViewer(req);
    if (!viewer) return noStoreJson({ error: "Unauthorized" }, 401);

    const viewerUserId = Number((viewer as any).userId);
    if (!Number.isFinite(viewerUserId)) {
      return noStoreJson({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));

    const reportYmd = cleanStr(body?.reportYmd) || todayNepalYmd();
    const branchName = cleanBranch(cleanStr(body?.branchName));
    if (!branchName) return noStoreJson({ error: "Branch Name is required" }, 400);

    const data = {
      reportYmd,
      branchName,

      newConnectionRequest: int0(body?.newConnectionRequest),
      pendingConnection: int0(body?.pendingConnection),
      completedConnection: int0(body?.completedConnection),
      reasonPendingConnection: cleanStr(body?.reasonPendingConnection) || null,

      internetTkt: int0(body?.internetTkt),
      pendingTkt: int0(body?.pendingTkt),
      completedTkt: int0(body?.completedTkt),
      reasonPendingTkt: cleanStr(body?.reasonPendingTkt) || null,

      expireCustomerDay: int0(body?.expireCustomerDay),
      renewDay: int0(body?.renewDay),
      activeCustomer: int0(body?.activeCustomer),
      totalExpireCustomer: int0(body?.totalExpireCustomer),
      outgoingCalls: int0(body?.outgoingCalls),
    };

    const report = await prisma.dailyReport.upsert({
      where: {
        authorId_reportYmd: {
          authorId: viewerUserId, // ✅ fixed
          reportYmd,
        },
      },
      create: {
        authorId: viewerUserId, // ✅ fixed
        ...data,
      },
      update: data,
    });

    return noStoreJson({ reportYmd, report }, 200);
  } catch (e) {
    console.error("DAILY REPORT UPSERT ERROR:", e);
    return noStoreJson({ error: "Server error" }, 500);
  }
}