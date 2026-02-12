import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";
import { DJANGO_JWT_SECRET as SECRET } from "@/lib/jwtSecret";

function cleanToken(t: string) {
  return t.trim().replace(/^Bearer\s+/i, "").replace(/^"+|"+$/g, "");
}

async function getUserId(req: NextRequest): Promise<number | null> {
  try {
    const raw = req.cookies.get("accessToken")?.value;
    if (!raw) return null;
    const { payload } = await jwtVerify(cleanToken(raw), SECRET, { algorithms: ["HS256"] });
    return Number((payload as any).user_id) || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ pinnedChannelId: null }, { status: 200 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pinnedChannelId: true },
  });

  return NextResponse.json({ pinnedChannelId: user?.pinnedChannelId ?? null });
}
