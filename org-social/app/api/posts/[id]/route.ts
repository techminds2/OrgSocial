export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.DJANGO_JWT_SECRET || "");

function cleanToken(t: string) {
  return t.trim().replace(/^Bearer\s+/i, "").replace(/^"+|"+$/g, "");
}

async function getUserIdFromRequest(req: NextRequest): Promise<number | null> {
  try {
    const raw = req.cookies.get("accessToken")?.value;
    if (!raw) return null;

    const token = cleanToken(raw);
    const result = await jwtVerify(token, SECRET, { algorithms: ["HS256"] });
    const uid = (result.payload as any).user_id;
    return uid ? Number(uid) : null;
  } catch {
    return null;
  }
}

/** ✅ Robust: get postId from params if available, otherwise from URL (/api/posts/:id) */
function getPostId(req: NextRequest, context: any): number | null {
  const rawFromParams =
    context?.params?.postId ??
    context?.params?.id ??
    context?.params?.postID ??
    null;

  let raw = rawFromParams;

  // fallback: parse last segment from pathname
  if (!raw) {
    const pathname = req.nextUrl.pathname; // e.g. /api/posts/20
    const last = pathname.split("/").filter(Boolean).pop();
    raw = last || null;
  }

  const id = Number(raw);
  if (!raw || Number.isNaN(id) || id <= 0) return null;
  return id;
}

export async function PATCH(req: NextRequest, context: any) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const postId = getPostId(req, context);
    if (!postId) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const content = (body?.content ?? "").toString();

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (Number(post.authorId) !== Number(userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: { content },
      include: {
        author: { select: { id: true, username: true, profileImage: true } },
        files: true,
        reactions: true,
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, username: true, profileImage: true } },
          },
        },
      },
    });

    const likeCount = updated.reactions.reduce(
      (acc, r) => (r.type === "LIKE" ? acc + 1 : acc),
      0
    );

    const likedByMe = updated.reactions.some(
      (r) => r.userId === userId && r.type === "LIKE"
    );

    return NextResponse.json({
      post: {
        id: updated.id,
        content: updated.content,
        createdAt: updated.createdAt,
        author: updated.author,
        files: updated.files.map((f) => ({
          url: `/api/files/${f.url}`,
          type: (f.type as any) || "document",
        })),
        likeCount,
        likedByMe,
        isMine: true,
        comments: updated.comments.map((c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt,
          author: c.author,
        })),
      },
    });
  } catch (err) {
    console.error("PATCH POST ERROR:", err);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: any) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const postId = getPostId(req, context);
    if (!postId) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (Number(post.authorId) !== Number(userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.comment.deleteMany({ where: { postId } });
    await prisma.reaction.deleteMany({ where: { postId } });
    await prisma.file.deleteMany({ where: { postId } });

    await prisma.post.delete({ where: { id: postId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE POST ERROR:", err);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
