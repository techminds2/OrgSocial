import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const channelId = Number(body?.channelId);
  const postIds = Array.isArray(body?.postIds)
    ? body.postIds.map((x: any) => Number(x))
    : [];

  if (
    !Number.isFinite(channelId) ||
    postIds.length === 0 ||
    postIds.some((x: number) => !Number.isFinite(x))
  ) {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const valid = await prisma.post.findMany({
    where: { id: { in: postIds }, channelId },
    select: { id: true },
  });
  const validIds = valid.map((p) => p.id);
  if (validIds.length === 0) return NextResponse.json({ ok: true });

  await prisma.postSeen.createMany({
    data: validIds.map((postId) => ({ userId, postId, channelId })),
    skipDuplicates: true,
  });

  return NextResponse.json({ ok: true, seen: validIds.length });
}
