import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireViewer } from "@/lib/requireAuth";
import { clampRemaining, safePercent } from "@/lib/regionalTargets";

function toNum(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: NextRequest) {
  try {
    const viewer = await requireViewer(req);
    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(req.nextUrl.searchParams.get("userId"));
    const month = String(req.nextUrl.searchParams.get("month") || "").trim();

    if (!Number.isFinite(userId) || userId <= 0 || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const canView = viewer.role === "admin" || viewer.userId === userId;
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [target, reports] = await Promise.all([
      prisma.regionalMonthlyTarget.findUnique({
        where: {
          userId_month: { userId, month },
        },
      }),
      prisma.regionalDailyReport.findMany({
        where: {
          authorId: userId,
          reportYmd: {
            startsWith: `${month}-`,
          },
        },
        select: {
          totalCollection: true,
          newConnectionsToday: true,
          renewalsToday: true,
        },
      }),
    ]);

    const achievedCollection = reports.reduce(
      (sum, r) => sum + toNum(r.totalCollection),
      0,
    );

    const achievedNewConnections = reports.reduce(
      (sum, r) => sum + toNum(r.newConnectionsToday),
      0,
    );

    const achievedRenewals = reports.reduce(
      (sum, r) => sum + toNum(r.renewalsToday),
      0,
    );

    const collectionTarget = toNum(target?.collectionTarget);
    const newConnectionTarget = toNum(target?.newConnectionTarget);
    const renewalTarget = toNum(target?.renewalTarget);

    return NextResponse.json({
      month,
      target: {
        collectionTarget,
        newConnectionTarget,
        renewalTarget,
      },
      achieved: {
        collection: achievedCollection,
        newConnections: achievedNewConnections,
        renewals: achievedRenewals,
      },
      remaining: {
        collection: clampRemaining(collectionTarget, achievedCollection),
        newConnections: clampRemaining(newConnectionTarget, achievedNewConnections),
        renewals: clampRemaining(renewalTarget, achievedRenewals),
      },
      percent: {
        collection: safePercent(achievedCollection, collectionTarget),
        newConnections: safePercent(achievedNewConnections, newConnectionTarget),
        renewals: safePercent(achievedRenewals, renewalTarget),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load progress" },
      { status: 500 },
    );
  }
}