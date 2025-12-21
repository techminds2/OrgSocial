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
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profileImage: true,
          },
        },
        files: true,
      },
    });

    // ✅ Rewrite file URLs here (THIS IS THE PLACE)
    const postsWithFileUrls = posts.map((post) => ({
      ...post,
      files: post.files.map((f) => ({
        ...f,
        url: `/api/files/${f.url}`, // f.url = "uploads/xxx.png"
      })),
    }));

    // ✅ Return the rewritten data
    return NextResponse.json({ posts: postsWithFileUrls });
  } catch (err) {
    console.error("Fetch posts error:", err);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
