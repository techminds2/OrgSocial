export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "@/lib/s3";

const SECRET = new TextEncoder().encode(process.env.DJANGO_JWT_SECRET || "");

function cleanToken(t: string) {
  return t.trim().replace(/^Bearer\s+/i, "").replace(/^"+|"+$/g, "");
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

function normalizeKeyToFileApi(key?: string | null) {
  if (!key) return null;
  const s = String(key).trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `/api/files/${s.replace(/^\/+/, "")}`;
}

/**
 * GET /api/channels
 * Returns channels + member count + banner url
 */
export async function GET(req: NextRequest) {
  try {
    const channels = await prisma.channel.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        members: true,
      },
    });

    const formatted = channels.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      bannerKey: c.bannerKey,
      bannerUrl: normalizeKeyToFileApi(c.bannerKey),
      memberCount: c.members.length,
    }));

    return NextResponse.json({ channels: formatted });
  } catch (err) {
    console.error("GET CHANNELS ERROR:", err);
    return NextResponse.json({ error: "Failed to load channels" }, { status: 500 });
  }
}

/**
 * POST /api/channels (multipart/form-data)
 * fields:
 * - name: string (required)
 * - banner: file (optional)
 * - memberIds: JSON string array like "[2,3,4]" (optional)
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const name = String(formData.get("name") || "").trim();
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    // Optional members
    let memberIds: number[] = [];
    const memberIdsRaw = formData.get("memberIds");
    if (typeof memberIdsRaw === "string" && memberIdsRaw.trim()) {
      try {
        const parsed = JSON.parse(memberIdsRaw);
        if (Array.isArray(parsed)) {
          memberIds = parsed.map((x) => Number(x)).filter((n) => Number.isFinite(n));
        }
      } catch {
        // ignore bad JSON
      }
    }

    // Always include creator as a member
    if (!memberIds.includes(userId)) memberIds.unshift(userId);

    // Optional banner upload
    const banner = formData.get("banner");
    let bannerKey: string | null = null;

    if (banner && typeof banner !== "string") {
      const file = banner as File;
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
      const fileName = `${crypto.randomUUID()}.${ext}`;
      bannerKey = `channels/${fileName}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: bannerKey,
          Body: buffer,
          ContentType: file.type || "application/octet-stream",
        })
      );
    }

    const channel = await prisma.channel.create({
      data: {
        name,
        bannerKey,
        members: {
          create: memberIds.map((uid) => ({
            userId: uid,
            role: uid === userId ? "admin" : "member",
          })),
        },
      },
      include: {
        members: true,
      },
    });

    return NextResponse.json({
      success: true,
      channel: {
        id: channel.id,
        name: channel.name,
        createdAt: channel.createdAt,
        bannerKey: channel.bannerKey,
        bannerUrl: normalizeKeyToFileApi(channel.bannerKey),
        members: channel.members,
      },
    });
  } catch (err: any) {
    console.error("CREATE CHANNEL ERROR:", err);

    // Prisma unique error (duplicate name)
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Channel name already exists" }, { status: 409 });
    }

    return NextResponse.json({ error: "Failed to create channel" }, { status: 500 });
  }
}
 