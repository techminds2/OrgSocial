export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "@/lib/s3";
import crypto from "crypto";
import { DJANGO_JWT_SECRET as SECRET } from "@/lib/jwtSecret";


// const SECRET = new TextEncoder().encode(process.env.DJANGO_JWT_SECRET || "");

function cleanToken(t: string) {
  return t
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^"+|"+$/g, "");
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

function getPostId(req: NextRequest, context: any): number | null {
  const rawFromParams =
    context?.params?.postId ??
    context?.params?.id ??
    context?.params?.postID ??
    null;

  let raw = rawFromParams;

  if (!raw) {
    const pathname = req.nextUrl.pathname; // e.g. /api/posts/20
    const last = pathname.split("/").filter(Boolean).pop();
    raw = last || null;
  }

  const id = Number(raw);
  if (!raw || Number.isNaN(id) || id <= 0) return null;
  return id;
}

function extFromName(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function guessType(mime: string): "image" | "video" | "document" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "document";
}

async function uploadToS3(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = extFromName(file.name);
  const key = `posts/${crypto.randomUUID()}${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      Body: bytes,
      ContentType: file.type || "application/octet-stream",
    })
  );

  return { key, type: guessType(file.type || "") };
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

    const contentType = req.headers.get("content-type") || "";

    let content = "";
    let keepKeys: string[] = [];
    let incomingFiles: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      content = String(form.get("content") ?? "");

      const keepKeysRaw = String(form.get("keepKeys") ?? "[]");
      try {
        keepKeys = JSON.parse(keepKeysRaw || "[]");
        if (!Array.isArray(keepKeys)) keepKeys = [];
      } catch {
        keepKeys = [];
      }

      incomingFiles = (form.getAll("files").filter(Boolean) as File[]) || [];
    } else {
      // fallback: old behavior (content only)
      const body = await req.json().catch(() => null);
      content = (body?.content ?? "").toString();
      keepKeys = []; // no attachment editing from JSON client
      incomingFiles = [];
    }

    const existing = await prisma.file.findMany({
      where: { postId },
      select: { url: true },
    });

    const existingKeys = existing.map((f) => f.url);

    // if client didn't send keepKeys (JSON client), keep everything
    const effectiveKeep =
      contentType.includes("multipart/form-data") ? keepKeys : existingKeys;

    const toDeleteKeys = existingKeys.filter((k) => !effectiveKeep.includes(k));

    const uploaded: Array<{ key: string; type: "image" | "video" | "document" }> =
      [];
    for (const f of incomingFiles) {
      if (!f || !f.name) continue;
      uploaded.push(await uploadToS3(f));
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (toDeleteKeys.length) {
        await tx.file.deleteMany({
          where: { postId, url: { in: toDeleteKeys } },
        });
      }

      if (uploaded.length) {
        await tx.file.createMany({
          data: uploaded.map((u) => ({
            postId,
            url: u.key,
            type: u.type,
          })),
        });
      }

      return tx.post.update({
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
    });

    if (toDeleteKeys.length) {
      await Promise.allSettled(
        toDeleteKeys.map((key) =>
          s3.send(
            new DeleteObjectCommand({
              Bucket: process.env.S3_BUCKET!,
              Key: key,
            })
          )
        )
      );
    }

    const likeCount = updated.reactions.reduce(
      (acc, r) => (r.type === "LIKE" ? acc + 1 : acc),
      0
    );

    const likedByMe = updated.reactions.some(
      (r) => r.userId === userId && r.type === "LIKE"
    );

    const createdAt = updated.createdAt as any;
    const updatedAt = (updated as any).updatedAt ?? updated.createdAt;

    return NextResponse.json({
      post: {
        id: updated.id,
        content: updated.content,
        createdAt: createdAt,
        updatedAt: updatedAt,
        isEdited: new Date(updatedAt).getTime() > new Date(createdAt).getTime(),
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
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: any) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const postId = getPostId(req, context);
    if (!postId)
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post)
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    if (Number(post.authorId) !== Number(userId))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const files = await prisma.file.findMany({
      where: { postId },
      select: { url: true },
    });

    await Promise.allSettled(
      files
        .filter((f) => !!f.url)
        .map((f) =>
          s3.send(
            new DeleteObjectCommand({
              Bucket: process.env.S3_BUCKET!,
              Key: f.url,
            })
          )
        )
    );

    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { postId } }),
      prisma.reaction.deleteMany({ where: { postId } }),
      prisma.file.deleteMany({ where: { postId } }),
      prisma.post.delete({ where: { id: postId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE POST ERROR:", err);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
