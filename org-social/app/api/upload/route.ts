import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "@/lib/s3";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode((process.env.JWT_SECRET ?? "").trim());
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("accessToken")?.value;

    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { payload } = await jwtVerify(token, SECRET);
    const userId = Number(
      (payload as any).user_id ?? (payload as any).id ?? (payload as any).sub
    );

    if (!userId)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const formData = await req.formData();
    const content = formData.get("content") as string;
    const files = formData.getAll("files") as File[];
    const types = formData.getAll("types") as string[];

    const post = await prisma.post.create({
      data: { content, authorId: userId },
    });

    const uploadedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!(file instanceof File)) continue;

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

      uploadedFiles.push(savedFile);
    }

    return NextResponse.json({ success: true, post, files: uploadedFiles });
  } catch (error: any) {
    console.error("UPLOAD ERROR:", error);
    return NextResponse.json(
      { error: "Post failed", detail: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}
