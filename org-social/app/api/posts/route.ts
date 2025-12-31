export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "@/lib/s3";
import { getUserIdFromRequest } from "@/lib/auth";

function normalizeMediaUrl(u?: string | null) {
  if (!u) return null;
  const s = String(u).trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `/api/files/${s.replace(/^\/+/, "")}`;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(Number(searchParams.get("limit") || 10), 50));
    const cursorId = searchParams.get("cursor") ? Number(searchParams.get("cursor")) : null;

    const posts = await prisma.post.findMany({
      where: { channelId: null }, // ✅ dashboard-only
      take: limit,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        author: { select: { id: true, username: true, profileImage: true } },
        files: true,
        reactions: true,
        comments: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, username: true, profileImage: true } } },
        },
      },
    });

    const formatted = posts.map((p) => {
      const likeCount = p.reactions.reduce((acc, r) => (r.type === "LIKE" ? acc + 1 : acc), 0);
      const likedByMe = p.reactions.some((r) => r.userId === userId && r.type === "LIKE");
      const isMine = p.author.id === userId;

      return {
        id: p.id,
        content: p.content,
        createdAt: p.createdAt,
        author: { ...p.author, profileImage: normalizeMediaUrl(p.author.profileImage) },
        files: p.files.map((f) => ({
          url: `/api/files/${f.url}`,
          type: (f.type as any) || "document",
        })),
        likeCount,
        likedByMe,
        isMine,
        comments: p.comments.map((c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt,
          author: { ...c.author, profileImage: normalizeMediaUrl(c.author.profileImage) },
        })),
      };
    });

    const nextCursor = posts.length === limit ? posts[posts.length - 1].id : null;
    return NextResponse.json({ posts: formatted, nextCursor });
  } catch (err: any) {
    console.error("GET DASHBOARD POSTS ERROR:", err);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const content = String(formData.get("content") || "");
    const files = formData.getAll("files") as File[];
    const types = formData.getAll("types") as string[];

    const uploadedFiles: { url: string; type?: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop() || "bin";
      const key = `uploads/${crypto.randomUUID()}.${ext}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: key,
          Body: buffer,
          ContentType: file.type || "application/octet-stream",
        })
      );

      uploadedFiles.push({ url: key, type: types[i] });
    }

    const post = await prisma.post.create({
      data: {
        content,
        channelId: null, // ✅ dashboard post
        authorId: userId,
        files: {
          create: uploadedFiles.map((f) => (f.type ? { url: f.url, type: f.type } : { url: f.url })),
        },
      },
      include: { files: true },
    });

    return NextResponse.json({ success: true, post });
  } catch (err: any) {
    console.error("CREATE DASHBOARD POST ERROR:", err);
    return NextResponse.json({ error: "Post failed" }, { status: 500 });
  }
}
