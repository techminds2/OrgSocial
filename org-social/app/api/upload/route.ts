import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "@/lib/s3";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const content = formData.get("content") as string;
    const files = formData.getAll("files") as File[];
    const types = formData.getAll("types") as string[];

    const uploadedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      console.log("Uploading:", file.name);

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

      uploadedFiles.push({
        url: `http://172.23.24.166:9000/${process.env.S3_BUCKET}/${key}`,
        type: types[i],
      });
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return NextResponse.json({ error: "Post failed" }, { status: 500 });
  }
}
