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

    const { payload } = await jwtVerify(accessToken, SECRET, { algorithms: ["HS256"] });
    const userId = payload.user_id as number;

    if (!userId) {
      return NextResponse.json({ error: "Invalid token payload" }, { status: 401 });
    }

    const formData = await req.formData();
    const content = formData.get("content") as string;
    const files = formData.getAll("files") as File[];
    const types = formData.getAll("types") as string[];

    const uploadedFiles: { url: string; type: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      const ab = await file.arrayBuffer();
      if (!ab || ab.byteLength === 0) continue;

      const uuid = crypto.randomUUID();
      const ext = file.name.includes(".")
        ? file.name.split(".").pop()!.toLowerCase()
        : "";
      const key = `uploads/${uuid}${ext ? "." + ext : ""}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: key,
          Body: Buffer.from(ab),
          ContentType: file.type || "application/octet-stream",
        })
      );

      const url = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${key}`;
      const savedFile = await prisma.file.create({
        data: { url, type: types[i] || "document", postId: post.id },
      });
    }

    const post = await prisma.post.create({
      data: {
        content,
        author: { connect: { id: userId } },
        files: {
          create: uploadedFiles.map((f) => ({ url: f.url })),
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
    return NextResponse.json(
      { error: "Post failed", detail: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}
