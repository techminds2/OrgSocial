import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const saved = await prisma.savedPost.findMany({
    where: { userId },
    include: {
      post: {
        include: {
          author: true,
          files: true,
          reactions: true,
          comments: { include: { author: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" }, // ✅ saved date order
  });

  type SavedPostWithPost = (typeof saved)[number];
  type Reaction = SavedPostWithPost["post"]["reactions"][number];
  type File = SavedPostWithPost["post"]["files"][number];
  type Comment = SavedPostWithPost["post"]["comments"][number];

  const formatted = saved.map((s) => {
    const p = s.post;

    const likeCount = p.reactions.filter(
      (r: Reaction) => r.type === "LIKE"
    ).length;

    const likedByMe = p.reactions.some(
      (r: Reaction) => r.userId === userId
    );

    return {
      id: p.id,
      content: p.content,
      createdAt: p.createdAt,
      savedAt: s.createdAt, 
      saved: true,         
      author: p.author,
      files: p.files.map((f: File) => ({
        url: `/api/files/${String(f.url).replace(/^\/+/, "")}`,
        type: f.type || "document",
      })),
      likeCount,
      likedByMe,
      isMine: p.authorId === userId,
      comments: p.comments.map((c: Comment) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        author: c.author,
      })),
    };
  });

  return NextResponse.json({ posts: formatted });
}
