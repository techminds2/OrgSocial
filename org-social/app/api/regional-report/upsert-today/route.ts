import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireViewer } from "@/lib/requireAuth";
import { todayNepalYmd } from "@/lib/dailyReport";
import { monthFromYmd, safePercent } from "@/lib/regionalTargets";

function toInt(v: unknown) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

export async function POST(req: NextRequest) {
  try {
    const viewer = await requireViewer(req);
    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (viewer.role !== "manager") {
      return NextResponse.json(
        { error: "Only managers can save regional report" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const reportYmd = String(body.reportYmd || "").trim();
    const todayYmd = todayNepalYmd();

    if (!reportYmd || reportYmd !== todayYmd) {
      return NextResponse.json(
        { error: "Regional report can only be saved for today" },
        { status: 400 },
      );
    }

    const regionName = String(body.regionName || "").trim();
    if (!regionName) {
      return NextResponse.json(
        { error: "Region name is required" },
        { status: 400 },
      );
    }

    const month = monthFromYmd(reportYmd);

    const monthlyTarget = await prisma.regionalMonthlyTarget.findUnique({
      where: {
        userId_month: {
          userId: viewer.userId,
          month,
        },
      },
    });

    const collectionTarget = monthlyTarget?.collectionTarget ?? 0;
    const newConnectionTarget = monthlyTarget?.newConnectionTarget ?? 0;
    const renewalTarget = monthlyTarget?.renewalTarget ?? 0;

    const totalCollection = toInt(body.totalCollection);
    const newConnectionsToday = toInt(body.newConnectionsToday);
    const renewalsToday = toInt(body.renewalsToday);

    const collectionAchievement = totalCollection;
    const newConnectionAchievementPct = safePercent(
      newConnectionsToday,
      newConnectionTarget,
    );
    const renewalAchievementPct = safePercent(
      renewalsToday,
      renewalTarget,
    );

    const report = await prisma.regionalDailyReport.upsert({
      where: {
        authorId_reportYmd: {
          authorId: viewer.userId,
          reportYmd,
        },
      },
      update: {
        regionName,

        branchesVisitedToday: String(body.branchesVisitedToday || "").trim() || null,
        keyObservations: String(body.keyObservations || "").trim() || null,

        totalCollection,
        activeCustomers: toInt(body.activeCustomers),
        expiredCustomers: toInt(body.expiredCustomers),
        totalCustomerBase: toInt(body.totalCustomerBase),

        totalTickets: toInt(body.totalTickets),
        pendingTickets: toInt(body.pendingTickets),
        ticketsClosedToday: toInt(body.ticketsClosedToday),
        reasonPendingTickets:
          String(body.reasonPendingTickets || "").trim() || null,

        totalNewConnections: toInt(body.totalNewConnections),
        newConnectionsToday,
        connectionPendingToday: toInt(body.connectionPendingToday),
        renewalsToday,
        renewalPending: toInt(body.renewalPending),
        reasonPendingConnection:
          String(body.reasonPendingConnection || "").trim() || null,

        collectionTarget,
        collectionAchievement,
        newConnectionTarget,
        newConnectionAchievementPct,
        renewalTarget,
        renewalAchievementPct,

        issueDetails: String(body.issueDetails || "").trim() || null,
        immediateActionsTaken:
          String(body.immediateActionsTaken || "").trim() || null,
        nextDayPlan: String(body.nextDayPlan || "").trim() || null,
        supportRequiredFromHO:
          String(body.supportRequiredFromHO || "").trim() || null,
      },
      create: {
        authorId: viewer.userId,
        reportYmd,
        regionName,

        branchesVisitedToday: String(body.branchesVisitedToday || "").trim() || null,
        keyObservations: String(body.keyObservations || "").trim() || null,

        totalCollection,
        activeCustomers: toInt(body.activeCustomers),
        expiredCustomers: toInt(body.expiredCustomers),
        totalCustomerBase: toInt(body.totalCustomerBase),

        totalTickets: toInt(body.totalTickets),
        pendingTickets: toInt(body.pendingTickets),
        ticketsClosedToday: toInt(body.ticketsClosedToday),
        reasonPendingTickets:
          String(body.reasonPendingTickets || "").trim() || null,

        totalNewConnections: toInt(body.totalNewConnections),
        newConnectionsToday,
        connectionPendingToday: toInt(body.connectionPendingToday),
        renewalsToday,
        renewalPending: toInt(body.renewalPending),
        reasonPendingConnection:
          String(body.reasonPendingConnection || "").trim() || null,

        collectionTarget,
        collectionAchievement,
        newConnectionTarget,
        newConnectionAchievementPct,
        renewalTarget,
        renewalAchievementPct,

        issueDetails: String(body.issueDetails || "").trim() || null,
        immediateActionsTaken:
          String(body.immediateActionsTaken || "").trim() || null,
        nextDayPlan: String(body.nextDayPlan || "").trim() || null,
        supportRequiredFromHO:
          String(body.supportRequiredFromHO || "").trim() || null,
      },
    });

    return NextResponse.json({ ok: true, report });
  } catch (error) {
    console.error("regional-report upsert error:", error);
    return NextResponse.json(
      { error: "Failed to save regional report" },
      { status: 500 },
    );
  }
}