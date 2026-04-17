import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireViewer } from "@/lib/requireAuth";
import { canEditMonthlyTarget } from "@/lib/regionalTargets";

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

    const item = await prisma.regionalMonthlyTarget.findUnique({
      where: {
        userId_month: { userId, month },
      },
    });

    return NextResponse.json({
      item,
      canEdit: canEditMonthlyTarget(month),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load monthly targets" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const viewer = await requireViewer(req);
    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (viewer.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const userId = Number(body.userId);
    const month = String(body.month || "").trim();

    const collectionTarget = Math.max(0, Number(body.collectionTarget ?? 0));
    const newConnectionTarget = Math.max(0, Number(body.newConnectionTarget ?? 0));
    const renewalTarget = Math.max(0, Number(body.renewalTarget ?? 0));

    if (!Number.isFinite(userId) || userId <= 0 || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (!canEditMonthlyTarget(month)) {
      return NextResponse.json(
        {
          error:
            "Targets can only be edited for the current month. Past months are locked, and future months become editable only after that month begins.",
        },
        { status: 403 },
      );
    }

    const year = Number(month.slice(0, 4));

    const item = await prisma.regionalMonthlyTarget.upsert({
      where: {
        userId_month: { userId, month },
      },
      update: {
        collectionTarget,
        newConnectionTarget,
        renewalTarget,
      },
      create: {
        userId,
        month,
        year,
        collectionTarget,
        newConnectionTarget,
        renewalTarget,
      },
    });

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to save monthly targets" },
      { status: 500 },
    );
  }
}