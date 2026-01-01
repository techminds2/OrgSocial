export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "@/lib/s3";
import { getUserIdFromRequest } from "@/lib/auth";

function normalizeKeyToFileApi(key?: string | null) {
  if (!key) return null;
  const s = String(key).trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `/api/files/${s.replace(/^\/+/, "")}`;
}

type Role = "viewer" | "editor" | "admin";
const VALID_ROLES: Role[] = ["viewer", "editor", "admin"];

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const channels = await prisma.channel.findMany({
      where: { members: { some: { userId } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { members: true },
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

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const name = String(formData.get("name") || "").trim();
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    // -------------------------------
    // ✅ members-with-roles (preferred)
    // members = [{"userId": 2, "role":"viewer"}, ...]
    // fallback: memberIds = [2,3,4]
    // creator always becomes admin
    // -------------------------------
    let members: { userId: number; role: Role }[] = [];

    const membersRaw = formData.get("members");
    if (typeof membersRaw === "string" && membersRaw.trim()) {
      try {
        const parsed = JSON.parse(membersRaw);
        if (Array.isArray(parsed)) {
          members = parsed
            .map((x) => ({
              userId: Number(x?.userId),
              role: (String(x?.role || "viewer") as Role),
            }))
            .filter((m) => Number.isFinite(m.userId) && VALID_ROLES.includes(m.role));
        }
      } catch {}
    }

    // fallback: old memberIds
    if (members.length === 0) {
      let memberIds: number[] = [];
      const memberIdsRaw = formData.get("memberIds");
      if (typeof memberIdsRaw === "string" && memberIdsRaw.trim()) {
        try {
          const parsed = JSON.parse(memberIdsRaw);
          if (Array.isArray(parsed)) {
            memberIds = parsed.map((x) => Number(x)).filter((n) => Number.isFinite(n));
          }
        } catch {}
      }
      members = memberIds.map((uid) => ({ userId: uid, role: "viewer" as Role }));
    }

    // ensure creator is admin and remove duplicates of creator
    members = members.filter((m) => m.userId !== userId);
    members.unshift({ userId, role: "admin" });

    // banner upload (unchanged)
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
        members: channel.members,
      },
    });
  } catch (err: any) {
    console.error("CREATE CHANNEL ERROR:", err);
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Channel name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create channel" }, { status: 500 });
  }
}
