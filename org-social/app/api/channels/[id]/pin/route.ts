import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";
import { DJANGO_JWT_SECRET as SECRET } from "@/lib/jwtSecret";

function cleanToken(t: string) {
  return t
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^"+|"+$/g, "");
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

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const userId = await getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const channelId = Number(id);
  if (!Number.isFinite(channelId))
    return NextResponse.json({ error: "Bad channel id" }, { status: 400 });

  // Optional: verify user is member of channel before allowing pin
  // (recommended if you have ChannelMember table)
  // const member = await prisma.channelMember.findFirst({ where: { channelId, userId }});
  // if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.user.update({
    where: { id: userId },
    data: { pinnedChannelId: channelId },
  });

  return NextResponse.json({ ok: true, pinnedChannelId: channelId });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: userId },
    data: { pinnedChannelId: null },
  });

  return NextResponse.json({ ok: true, pinnedChannelId: null });
}
