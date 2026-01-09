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

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ notifications: [] });
  }

  const base = req.nextUrl.origin;

  /* 1️⃣ Fetch join-request notifications (existing system) */
  const joinReqRes = await fetch(`${base}/api/notifications/join-requests`, {
    headers: { cookie: req.headers.get("cookie") ?? "" },
    cache: "no-store",
  });

  const joinReqJson = await joinReqRes.json();
  const joinRequestNotifications = (joinReqJson.notifications || []).map(
    (n: any) => ({
      ...n,
      type: "join-request",
    })
  );

  /* 2️⃣ Fetch comment notifications (DB) */
  const commentNotifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  /* 3️⃣ Merge & sort */
  const allNotifications = [
    ...joinRequestNotifications,
    ...commentNotifications,
  ].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );

  return NextResponse.json(
    { notifications: allNotifications },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
