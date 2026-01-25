import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

function normalizeMediaUrl(u?: string | null) {
  if (!u) return null;
  const s = String(u).trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `/api/files/${s.replace(/^\/+/, "")}`;
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const posts = await prisma.post.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, username: true, profileImage: true } },
        files: true,
        channel: { select: { id: true, name: true } },
        reactions: true,
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, username: true, profileImage: true } },
          },
        },
      },
    });

    const postIds = posts.map((p) => p.id);

    const savedRows = postIds.length
      ? await prisma.savedPost.findMany({
          where: { userId, postId: { in: postIds } },
          select: { postId: true, createdAt: true },
        })
      : [];

    const savedMap = new Map<number, Date>(
      savedRows.map((s) => [s.postId, s.createdAt]),
    );

    const formatted = posts.map((p) => {
      const likeCount = p.reactions.reduce(
        (acc, r) => (r.type === "LIKE" ? acc + 1 : acc),
        0,
      );

      const likedByMe = p.reactions.some(
        (r) => r.userId === userId && r.type === "LIKE",
      );

      const savedAt = savedMap.get(p.id) ?? null;

      return {
        id: p.id,
        content: p.content,
        createdAt: p.createdAt,
        channel: p.channel ? { id: p.channel.id, name: p.channel.name } : null,
        author: {
          id: p.author.id,
          username: p.author.username,
          profileImage: normalizeMediaUrl(p.author.profileImage),
        },
        files: p.files.map((f) => ({
          url: normalizeMediaUrl(f.url)!,
          type: f.type || "document",
        })),
        likeCount,
        likedByMe,
        saved: !!savedAt,
        savedAt,
        isMine: true,
        comments: p.comments.map((c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt,
          author: {
            id: c.author.id,
            username: c.author.username,
            profileImage: normalizeMediaUrl(c.author.profileImage),
          },
        })),
      };
    });

    return NextResponse.json({ posts: formatted });
  } catch (err) {
    console.error("PROFILE POSTS ERROR:", err);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 },
    );
  }
}
