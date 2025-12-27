/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Get all posts
 *     description: Returns all posts with author info and attached files
 *     tags:
 *       - Posts
 *     responses:
 *       200:
 *         description: List of posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                       content:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       author:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: number
 *                           username:
 *                             type: string
 *                           profileImage:
 *                             type: string
 *                       files:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             url:
 *                               type: string
 *                             type:
 *                               type: string
 *       500:
 *         description: Server error
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.DJANGO_JWT_SECRET || "");

/* -------------------- AUTH HELPER -------------------- */
async function getUserIdFromRequest(req: NextRequest): Promise<number | null> {
  try {
    const raw = req.cookies.get("accessToken")?.value;
    if (!raw) return null;

    const token = raw
      .trim()
      .replace(/^Bearer\s+/i, "")
      .replace(/^"+|"+$/g, "");

    const result = await jwtVerify(token, SECRET, { algorithms: ["HS256"] });
    const uid = (result.payload as any).user_id;
    return uid ? Number(uid) : null;
  } catch {
    return null;
  }
}

/* -------------------- GET POSTS (single fetch) -------------------- */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);

    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: { id: true, username: true, profileImage: true },
        },
        files: true,
        reactions: true,
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: {
              select: { id: true, username: true, profileImage: true },
            },
          },
        },
      },
    });

    const formatted = posts.map((p) => {
      const likeCount = p.reactions.reduce(
        (acc, r) => (r.type === "LIKE" ? acc + 1 : acc),
        0
      );

      const likedByMe = userId
        ? p.reactions.some((r) => r.userId === userId && r.type === "LIKE")
        : false;

      const isMine = userId ? p.author.id === userId : false;

      return {
        id: p.id,
        content: p.content,
        createdAt: p.createdAt,
        author: p.author,
        files: p.files.map((f) => ({
          url: `/api/files/${f.url}`, // this is the file proxy route
          type: (f.type as any) || "document",
        })),
        likeCount,
        likedByMe,
        isMine,
        comments: p.comments.map((c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt,
          author: c.author,
        })),
      };
    });

    return NextResponse.json({ posts: formatted });
  } catch (err) {
    console.error("GET POSTS ERROR:", err);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
