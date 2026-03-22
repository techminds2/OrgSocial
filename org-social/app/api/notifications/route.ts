import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";
import { DJANGO_JWT_SECRET as SECRET } from "@/lib/jwtSecret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function cleanToken(token: string) {
  return token.trim().replace(/^Bearer\s+/i, "").replace(/^"+|"+$/g, "");
}

async function getUserId(req: NextRequest): Promise<number | null> {
  try {
    const raw = req.cookies.get("accessToken")?.value;
    if (!raw) return null;

    const { payload } = await jwtVerify(cleanToken(raw), SECRET, {
      algorithms: ["HS256"],
    });

    return Number((payload as any).user_id) || null;
  } catch {
    return null;
  }
}

function todayNepalYmd() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);

  if (!userId) {
    return NextResponse.json(
      { notifications: [] },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }

  const base = req.nextUrl.origin;
  const today = todayNepalYmd();

  try {
    /* 1) Existing join-request notifications */
    const joinReqRes = await fetch(`${base}/api/notifications/join-requests`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
      cache: "no-store",
    });

    const joinReqJson = joinReqRes.ok
      ? await joinReqRes.json().catch(() => ({}))
      : {};

    const joinRequestNotifications = (joinReqJson.notifications || []).map(
      (n: any) => ({
        ...n,
        type: "join-request",
      }),
    );

    /* 2) Existing DB notifications */
    const dbNotifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    /* 3) Calendar note reminders for today */
    const todayNotes = await prisma.calendarNote.findMany({
      where: {
        userId,
        noteDate: today,
      },
      orderBy: [{ createdAt: "desc" }],
    });

    const calendarNoteNotifications = todayNotes.map((note) => ({
      id: `calendar-note-${note.id}-${today}`,
      sourceId: note.id,
      type: "calendar-note" as const,
      message: note.title,
      description: note.description || "",
      createdAt: note.createdAt,
      href: `/profile?date=${note.noteDate}`,
      noteDate: note.noteDate,
      isRead: false,
    }));

    /* 4) Merge & sort */
    const allNotifications = [
      ...calendarNoteNotifications,
      ...joinRequestNotifications,
      ...dbNotifications,
    ].sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return NextResponse.json(
      { notifications: allNotifications },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Failed to load notifications",
        detail: String(e?.message || e),
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}