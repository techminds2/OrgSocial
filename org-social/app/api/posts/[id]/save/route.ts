import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";
import { DJANGO_JWT_SECRET as SECRET } from "@/lib/jwtSecret";

function cleanToken(token: string) {
  return token.trim().replace(/^Bearer\s+/i, "").replace(/^"+|"+$/g, "");
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

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const postId = Number(id);
  if (Number.isNaN(postId)) return NextResponse.json({ error: "Invalid post id" }, { status: 400 });

  const existing = await prisma.savedPost.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  if (existing) {
    await prisma.savedPost.delete({ where: { id: existing.id } });
    return NextResponse.json({ saved: false });
  }

  await prisma.savedPost.create({ data: { userId, postId } });
  return NextResponse.json({ saved: true });
}
