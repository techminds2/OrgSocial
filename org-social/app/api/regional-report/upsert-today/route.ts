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

const float0 = (v: any) => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
};

const cleanStr = (v: any) => (typeof v === "string" ? v.trim() : "");
const cleanRegion = (s: string) => s.replace(/[^a-zA-Z0-9\s-]/g, "").trim();

export async function POST(req: NextRequest) {
  try {
    const viewer = await requireViewer(req);
    if (!viewer) return noStoreJson({ error: "Unauthorized" }, 401);

    if (viewer.role !== "manager") {
      return noStoreJson({ error: "Forbidden" }, 403);
    }

    const viewerUserId = Number((viewer as any).userId);
    if (!Number.isFinite(viewerUserId)) {
      return noStoreJson({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));

    const reportYmd = cleanStr(body?.reportYmd) || todayNepalYmd();
    const regionName = cleanRegion(cleanStr(body?.regionName));

    if (!regionName) {
      return noStoreJson({ error: "Region Name is required" }, 400);
    }

    const data = {
      reportYmd,
      regionName,

      branchesVisitedToday: cleanStr(body?.branchesVisitedToday) || null,
      keyObservations: cleanStr(body?.keyObservations) || null,

      totalCollection: int0(body?.totalCollection),
      activeCustomers: int0(body?.activeCustomers),
      expiredCustomers: int0(body?.expiredCustomers),
      totalCustomerBase: int0(body?.totalCustomerBase),

      totalTickets: int0(body?.totalTickets),
      pendingTickets: int0(body?.pendingTickets),
      ticketsClosedToday: int0(body?.ticketsClosedToday),
      reasonPendingTickets: cleanStr(body?.reasonPendingTickets) || null,

      totalNewConnections: int0(body?.totalNewConnections),
      newConnectionsToday: int0(body?.newConnectionsToday),
      connectionPendingToday: int0(body?.connectionPendingToday),
      renewalsToday: int0(body?.renewalsToday),
      renewalPending: int0(body?.renewalPending),
      reasonPendingConnection: cleanStr(body?.reasonPendingConnection) || null,

      collectionTarget: int0(body?.collectionTarget),
      collectionAchievement: int0(body?.collectionAchievement),
      newConnectionTarget: int0(body?.newConnectionTarget),
      newConnectionAchievementPct: float0(body?.newConnectionAchievementPct),
      renewalTarget: int0(body?.renewalTarget),
      renewalAchievementPct: float0(body?.renewalAchievementPct),

      issueDetails: cleanStr(body?.issueDetails) || null,

      immediateActionsTaken: cleanStr(body?.immediateActionsTaken) || null,
      nextDayPlan: cleanStr(body?.nextDayPlan) || null,
      supportRequiredFromHO: cleanStr(body?.supportRequiredFromHO) || null,
    };

    const report = await prisma.regionalDailyReport.upsert({
      where: {
        authorId_reportYmd: {
          authorId: viewerUserId,
          reportYmd,
        },
      },
      create: {
        authorId: viewerUserId,
        ...data,
      },
      update: data,
    });

    return noStoreJson({ reportYmd, report }, 200);
  } catch (e) {
    console.error("REGIONAL REPORT UPSERT ERROR:", e);
    return noStoreJson(
      {
        error: "Server error",
        debug: String(e),
      },
      500,
    );
  }
}