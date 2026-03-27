export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

type Visibility = "public" | "private";
type PublicAccessMode = "open" | "request";
type MemberRole = "viewer" | "editor" | "admin";

const VALID_VISIBILITY: Visibility[] = ["public", "private"];
const VALID_PUBLIC_ACCESS: PublicAccessMode[] = ["open", "request"];
const VALID_ROLES: MemberRole[] = ["viewer", "editor", "admin"];

function normalizeMediaUrl(key?: string | null) {
  if (!key) return null;
  if (key.startsWith("http://") || key.startsWith("https://")) return key;
  return `/api/files/${encodeURIComponent(key)}`;
}

async function parseMembers(raw: FormDataEntryValue | null) {
  if (!raw || typeof raw !== "string") return [];

  try {
    const parsed = JSON.parse(raw) as Array<{ userId: number; role?: string }>;
    if (!Array.isArray(parsed)) return [];

    const cleaned = parsed
      .map((m) => ({
        userId: Number(m.userId),
        role: VALID_ROLES.includes((m.role || "viewer") as MemberRole)
          ? (m.role as MemberRole)
          : ("viewer" as MemberRole),
      }))
      .filter((m) => Number.isFinite(m.userId));

    const seen = new Set<number>();
    return cleaned.filter((m) => {
      if (seen.has(m.userId)) return false;
      seen.add(m.userId);
      return true;
    });
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const channels = await prisma.channel.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        _count: {
          select: { members: true, posts: true },
        },
      },
      take: 100,
    });

    return NextResponse.json({
      channels: channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        createdAt: channel.createdAt,
        bannerKey: channel.bannerKey,
        bannerUrl: normalizeMediaUrl(channel.bannerKey),
        visibility: channel.visibility,
        publicAccessMode: channel.publicAccessMode,
        memberCount: channel._count.members,
        postCount: channel._count.posts,
      })),
    });
  } catch (error) {
    console.error("GET CHANNELS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load channels" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();

    const rawName = String(formData.get("name") || "").trim();
    if (!rawName) {
      return NextResponse.json(
        { error: "Channel name is required" },
        { status: 400 }
      );
    }

    const name = rawName.replace(/\s+/g, " ").trim();

    const visibilityRaw = String(formData.get("visibility") || "private")
      .trim()
      .toLowerCase();

    const visibility: Visibility = VALID_VISIBILITY.includes(
      visibilityRaw as Visibility
    )
      ? (visibilityRaw as Visibility)
      : "private";

    const publicAccessModeRaw = String(
      formData.get("publicAccessMode") || "request"
    )
      .trim()
      .toLowerCase();

    const publicAccessMode: PublicAccessMode = VALID_PUBLIC_ACCESS.includes(
      publicAccessModeRaw as PublicAccessMode
    )
      ? (publicAccessModeRaw as PublicAccessMode)
      : "request";

    const members = await parseMembers(formData.get("members"));

    const finalMembers = [...members];
    const creatorAlreadyIncluded = finalMembers.some((m) => m.userId === userId);

    if (!creatorAlreadyIncluded) {
      finalMembers.unshift({ userId, role: "admin" });
    } else {
      for (const m of finalMembers) {
        if (m.userId === userId) {
          m.role = "admin";
        }
      }
    }

    const existing = await prisma.channel.findUnique({
      where: { name },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A channel with this name already exists" },
        { status: 409 }
      );
    }

    const bannerFile = formData.get("banner");
    let bannerKey: string | null = null;

    // Keep your existing upload logic here if you already have one.
    // If you already store uploaded files elsewhere, replace this section.
    if (bannerFile && bannerFile instanceof File && bannerFile.size > 0) {
      // Example only:
      // bannerKey = await uploadChannelBanner(bannerFile);
      bannerKey = null;
    }

    const channel = await prisma.channel.create({
      data: {
        name,
        bannerKey,
        visibility,
        publicAccessMode: visibility === "public" ? publicAccessMode : "request",
        createdBy: { connect: { id: userId } },
        members: {
          create: finalMembers.map((m) => ({
            userId: m.userId,
            role: m.role,
          })),
        },
      },
      include: {
        members: true,
      },
    });

    return NextResponse.json({
      channel: {
        id: channel.id,
        name: channel.name,
        createdAt: channel.createdAt,
        bannerKey: channel.bannerKey,
        bannerUrl: normalizeMediaUrl(channel.bannerKey),
        visibility: channel.visibility,
        publicAccessMode: channel.publicAccessMode,
        members: channel.members,
      },
    });
  } catch (error) {
    console.error("CREATE CHANNEL ERROR:", error);
    return NextResponse.json(
      { error: "Failed to create channel" },
      { status: 500 }
    );
  }
}