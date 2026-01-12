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

  if (!userId) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const posts = await prisma.post.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        files: true,
        channel: { select: { id: true, name: true } },
      },
    });

    const formatted = posts.map((p) => ({
      id: p.id,
      content: p.content,
      createdAt: p.createdAt,
      channel: p.channel
        ? { id: p.channel.id, name: p.channel.name }
        : null,
      files: p.files.map((f) => ({
        url: normalizeMediaUrl(f.url),
        type: f.type,
      })),
    }));

    return NextResponse.json({ posts: formatted });
  } catch (err) {
    console.error("MY POSTS ERROR:", err);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
