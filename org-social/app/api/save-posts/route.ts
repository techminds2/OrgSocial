import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

function normalizeMediaUrl(u?: string | null) {
  if (!u) return null;
  const s = String(u).trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `/api/files/${s.replace(/^\/+/, "")}`;
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limitRaw = Number(searchParams.get("limit") || "10");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 10;

  const cursorRaw = searchParams.get("cursor");
  const cursor = cursorRaw ? Number(cursorRaw) : null;

  // IMPORTANT: this assumes SavedPost has an `id` field
  const saved = await prisma.savedPost.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      post: {
        include: {
          author: { select: { id: true, username: true, profileImage: true } },
          files: true,
          reactions: true,
          channel: { select: { id: true, name: true } },
          comments: {
            orderBy: { createdAt: "asc" },
            include: {
              author: { select: { id: true, username: true, profileImage: true } },
            },
          },
        },
      },
    },
  });

  const formatted = saved.map((s: any) => {
    const p = s.post;

    const likeCount = p.reactions.filter((r: any) => r.type === "LIKE").length;
    const likedByMe = p.reactions.some(
      (r: any) => r.userId === userId && r.type === "LIKE"
    );

    return {
      id: p.id,
      content: p.content,
      createdAt: p.createdAt,
      savedAt: s.createdAt,
      saved: true,
      channel: p.channel ? { id: p.channel.id, name: p.channel.name } : null,
      author: {
        id: p.author.id,
        username: p.author.username,
        profileImage: normalizeMediaUrl(p.author.profileImage),
      },
      files: p.files.map((f: any) => ({
        url: normalizeMediaUrl(f.url)!,
        type: f.type || "document",
      })),
      likeCount,
      likedByMe,
      isMine: p.authorId === userId,
      comments: p.comments.map((c: any) => ({
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

  const nextCursor = saved.length === limit ? saved[saved.length - 1].id : null;

  return NextResponse.json({ posts: formatted, nextCursor });
}
