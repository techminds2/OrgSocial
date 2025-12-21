export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "@/lib/s3";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ key: string[] }> }
) {
  const { key } = await ctx.params;         
  const objectKey = key.join("/");         

  try {
    const bucket = process.env.S3_BUCKET!;
    const obj = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: objectKey })
    );

    if (!obj.Body) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse(obj.Body as any, {
      headers: {
        "Content-Type": obj.ContentType || "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.name || "GetObject failed", message: e?.message || null },
      { status: e?.$metadata?.httpStatusCode || 500 }
    );
  }
}
