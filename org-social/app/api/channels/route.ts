export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "@/lib/s3";
import { getUserIdFromRequest } from "@/lib/auth";
import { Prisma } from "@/src/generated/prisma";
import { jwtVerify } from "jose";
import { DJANGO_JWT_SECRET as SECRET } from "@/lib/jwtSecret";

function normalizeKeyToFileApi(key?: string | null) {
  if (!key) return null;
  const s = String(key).trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `/api/files/${s.replace(/^\/+/, "")}`;
}

type Role = "viewer" | "editor" | "admin";
const VALID_ROLES: Role[] = ["viewer", "editor", "admin"];

type Visibility = "public" | "private";
const VALID_VISIBILITY: Visibility[] = ["public", "private"];

function cleanToken(t: string) {
  return t.trim().replace(/^Bearer\s+/i, "").replace(/^"+|"+$/g, "");
}
async function getUserId(req: NextRequest): Promise<number | null> {
  try {
    const raw = req.cookies.get("accessToken")?.value; // ✅ works in route handlers
    if (!raw) return null;

    const { payload } = await jwtVerify(cleanToken(raw), SECRET, {
      algorithms: ["HS256"],
    });

    const uid = Number((payload as any).user_id);
    return Number.isFinite(uid) ? uid : null;
  } catch {
    return null;
  }
}
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Adjust table names to your schema:
  // Example assumes ChannelMember table: channelMember { userId, channelId, role }
  const memberships = await prisma.channelMember.findMany({
    where: { userId },
    select: {
      channel: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          bannerKey: true,
          visibility: true,
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { channelId: "desc" },
  });

  const channels = memberships.map((m) => ({
    id: m.channel.id,
    name: m.channel.name,
    createdAt: m.channel.createdAt,
    bannerKey: m.channel.bannerKey,
    visibility: m.channel.visibility,
    memberCount: m.channel._count.members,
  }));

  return NextResponse.json({ channels });
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const name = String(formData.get("name") || "").trim();
    if (!name)
      return NextResponse.json({ error: "name is required" }, { status: 400 });

    const visibilityRaw = String(formData.get("visibility") || "private")
      .trim()
      .toLowerCase();
    const visibility: Visibility = VALID_VISIBILITY.includes(
      visibilityRaw as Visibility,
    )
      ? (visibilityRaw as Visibility)
      : "private";

    let members: { userId: number; role: Role }[] = [];

    const membersRaw = formData.get("members");
    if (typeof membersRaw === "string" && membersRaw.trim()) {
      try {
        const parsed = JSON.parse(membersRaw);
        if (Array.isArray(parsed)) {
          members = parsed
            .map((x) => ({
              userId: Number(x?.userId),
              role: String(x?.role || "viewer") as Role,
            }))
            .filter(
              (m) => Number.isFinite(m.userId) && VALID_ROLES.includes(m.role),
            );
        }
      } catch {}
    }

    if (members.length === 0) {
      let memberIds: number[] = [];
      const memberIdsRaw = formData.get("memberIds");
      if (typeof memberIdsRaw === "string" && memberIdsRaw.trim()) {
        try {
          const parsed = JSON.parse(memberIdsRaw);
          if (Array.isArray(parsed)) {
            memberIds = parsed
              .map((x) => Number(x))
              .filter((n) => Number.isFinite(n));
          }
        } catch {}
      }
      members = memberIds.map((uid) => ({
        userId: uid,
        role: "viewer" as Role,
      }));
    }

    members = members.filter((m) => m.userId !== userId);
    members.unshift({ userId, role: "admin" });

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
        }),
      );
    }

    const channel = await prisma.channel.create({
      data: {
        name,
        bannerKey,
        visibility,
        createdBy: { connect: { id: userId } },
        members: {
          create: members.map((m) => ({
            userId: m.userId,
            role: m.role,
          })),
        },
      },
      include: { members: true },
    });

    return NextResponse.json({
      success: true,
      channel: {
        id: channel.id,
        name: channel.name,
        createdAt: channel.createdAt,
        bannerKey: channel.bannerKey,
        bannerUrl: normalizeKeyToFileApi(channel.bannerKey),
        visibility: channel.visibility,
        members: channel.members,
      },
    });
  } catch (err: any) {
    console.error("CREATE CHANNEL ERROR:", err);
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "Channel name already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create channel" },
      { status: 500 },
    );
  }
}
