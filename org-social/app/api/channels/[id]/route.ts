export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "@/lib/s3";

type Role = "viewer" | "editor" | "admin";
const VALID_ROLES: Role[] = ["viewer", "editor", "admin"];

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const channelId = Number(id);
    if (!Number.isFinite(channelId) || channelId <= 0) {
      return NextResponse.json({ error: "Invalid channel id" }, { status: 400 });
    }

    // permission check: creator OR admin
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: {
        id: true,
        createdById: true,
        members: {
          where: { userId },
          select: { role: true },
          take: 1,
        },
      },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const isCreator = channel.createdById === userId;
    const isAdmin = channel.members[0]?.role === "admin";

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ delete children first (because File/Comment/Reaction don't cascade from Post)
    const postIds = await prisma.post.findMany({
      where: { channelId },
      select: { id: true },
    });

    const ids = postIds.map((p) => p.id);

    await prisma.$transaction(async (tx) => {
      if (ids.length) {
        await tx.comment.deleteMany({ where: { postId: { in: ids } } });
        await tx.reaction.deleteMany({ where: { postId: { in: ids } } });
        await tx.file.deleteMany({ where: { postId: { in: ids } } });
        await tx.post.deleteMany({ where: { id: { in: ids } } });
      }

      // clean related rows directly attached to channel (safe even if cascades exist)
      await tx.joinRequest.deleteMany({ where: { channelId } });
      await tx.channelMember.deleteMany({ where: { channelId } });

      // finally delete channel
      await tx.channel.delete({ where: { id: channelId } });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE CHANNEL ERROR:", err);
    return NextResponse.json({ error: "Failed to delete channel" }, { status: 500 });
  }
}
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const channelId = Number(id);
    if (!Number.isFinite(channelId)) {
      return NextResponse.json({ error: "Invalid channel id" }, { status: 400 });
    }

    const formData = await req.formData();

    const nameRaw = formData.get("name");
    const banner = formData.get("banner");
    const membersRaw = formData.get("members");

    const updateName =
      typeof nameRaw === "string" && nameRaw.trim().length > 0;

    const updateMembers =
      typeof membersRaw === "string" && membersRaw.trim().length > 0;

    let members: { userId: number; role: Role }[] = [];

    if (updateMembers) {
      try {
        const parsed = JSON.parse(membersRaw as string);
        if (Array.isArray(parsed)) {
          members = parsed
            .map((m) => ({
              userId: Number(m?.userId),
              role: m?.role,
            }))
            .filter(
              (m) =>
                Number.isFinite(m.userId) &&
                VALID_ROLES.includes(m.role)
            );
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid members payload" },
          { status: 400 }
        );
      }
    }

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: {
        id: true,
        createdById: true,
        members: {
          where: { userId },
          select: { role: true },
          take: 1,
        },
      },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const isCreator = channel.createdById === userId;
    const isAdmin = channel.members[0]?.role === "admin";

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      /* 1️⃣ Name update */
      if (updateName) {
        await tx.channel.update({
          where: { id: channelId },
          data: { name: nameRaw!.trim() },
        });
      }

      /* 2️⃣ Banner update */
      if (banner && typeof banner !== "string") {
        const file = banner as File;
        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = file.name.split(".").pop() || "png";
        const key = `channels/${crypto.randomUUID()}.${ext}`;

        await s3.send(
          new PutObjectCommand({
            Bucket: process.env.S3_BUCKET!,
            Key: key,
            Body: buffer,
            ContentType: file.type,
          })
        );

        await tx.channel.update({
          where: { id: channelId },
          data: { bannerKey: key },
        });
      }

      /* 3️⃣ Members sync ONLY if sent */
      if (updateMembers) {
        const creatorId = channel.createdById;

        const incoming = members.filter(
          (m) => m.userId !== creatorId
        );

        const incomingIds = incoming.map((m) => m.userId);

        await tx.channelMember.deleteMany({
          where: {
            channelId,
            userId: {
              notIn: [creatorId, ...incomingIds],
            },
          },
        });

        // ensure creator always admin
        await tx.channelMember.upsert({
          where: {
            channelId_userId: {
              channelId,
              userId: creatorId,
            },
          },
          update: { role: "admin" },
          create: {
            channelId,
            userId: creatorId,
            role: "admin",
          },
        });

        for (const m of incoming) {
          await tx.channelMember.upsert({
            where: {
              channelId_userId: {
                channelId,
                userId: m.userId,
              },
            },
            update: { role: m.role },
            create: {
              channelId,
              userId: m.userId,
              role: m.role,
            },
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("UPDATE CHANNEL ERROR:", err);
    return NextResponse.json(
      { error: "Failed to update channel" },
      { status: 500 }
    );
  }
}

