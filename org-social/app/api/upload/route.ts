/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Create a post with file uploads
 *     description: >
 *       Creates a post with text content and optional files.
 *       Requires authentication via accessToken cookie.
 *     tags:
 *       - Posts
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: Hello world
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               types:
 *                 type: array
 *                 items:
 *                   type: string
 *                   required: false
 *     responses:
 *       200:
 *         description: Post created successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export const runtime = "nodejs";

import { NextResponse, NextRequest } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "@/lib/s3";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";

const SECRET_STR = process.env.DJANGO_JWT_SECRET || "";
const SECRET = new TextEncoder().encode(SECRET_STR);

function cleanToken(t: string) {
  return t
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^"+|"+$/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const accessTokenRaw = req.cookies.get("accessToken")?.value;
    const accessToken = accessTokenRaw ? cleanToken(accessTokenRaw) : undefined;

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(accessToken, SECRET, {
      algorithms: ["HS256"],
    });
    const userId = payload.user_id as number;

    if (!userId) {
      return NextResponse.json(
        { error: "Invalid token payload" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const content = formData.get("content") as string;
    const files = formData.getAll("files") as File[];
    const types = formData.getAll("types") as string[];

    const uploadedFiles: { url: string; type: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const key = `uploads/${fileName}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: key,
          Body: buffer,
          ContentType: file.type,
        })
      );
      console.log("Files to store in DB:", uploadedFiles);

      uploadedFiles.push({
        url: key,
        type: types[i],
      });
    }

    const post = await prisma.post.create({
      data: {
        content,
        author: { connect: { id: userId } },
        files: {
          create: uploadedFiles.map((f) =>
            f.type ? { url: f.url, type: f.type } : { url: f.url }
          ),
        },
      },
      include: { files: true },
    });

    return NextResponse.json({
      success: true,
      post,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return NextResponse.json({ error: "Post failed" }, { status: 500 });
  }
}
