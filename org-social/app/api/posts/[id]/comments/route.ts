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

    const { payload } = await jwtVerify(cleanToken(raw), SECRET, {
      algorithms: ["HS256"],
    });

    return Number((payload as any).user_id) || null;
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const postId = Number(id);
  if (Number.isNaN(postId))
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });

  const body = await req.json();
  const content = body?.content?.trim();
  if (!content)
    return NextResponse.json(
      { error: "Comment cannot be empty" },
      { status: 400 }
    );

  // 1️⃣ Create comment
  const comment = await prisma.comment.create({
    data: {
      content,
      postId,
      authorId: userId,
    },
    include: {
      author: { select: { username: true } },
      post: { select: { authorId: true } },
    },
  });

  // 2️⃣ Create notification for post author
  if (comment.post.authorId !== userId) {
    await prisma.notification.create({
      data: {
        userId: comment.post.authorId,
        type: "comment",
        message: `${comment.author.username} commented on your post`,
        href: `/posts/${postId}`,
      },
    });
  }

  return NextResponse.json({ comment });
}
