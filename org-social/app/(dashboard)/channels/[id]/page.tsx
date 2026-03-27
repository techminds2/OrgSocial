import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect, notFound } from "next/navigation";
import ChannelFeed from "./ChannelFeed";
import JoinRequestGate from "./JoinRequestGate";
import { DJANGO_JWT_SECRET as SECRET } from "@/lib/jwtSecret";

function cleanToken(t: string) {
  return t.trim().replace(/^Bearer\s+/i, "").replace(/^"+|"+$/g, "");
}

async function getUserIdFromCookies() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("accessToken")?.value;
  if (!raw) return null;

  try {
    const token = cleanToken(raw);
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: ["HS256"],
    });
    const uid = (payload as any).user_id;
    return uid ? Number(uid) : null;
  } catch {
    return null;
  }
}

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const userId = await getUserIdFromCookies();
  if (!userId) redirect("/");

  const channelId = Number(id);
  if (!Number.isFinite(channelId)) notFound();

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      name: true,
      bannerKey: true,
      visibility: true,
      publicAccessMode: true,
      createdById: true,
    },
  });

  if (!channel) notFound();

  let member = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
    select: { id: true, role: true },
  });

  if (!member && channel.visibility === "public" && channel.publicAccessMode === "open") {
    await prisma.channelMember.upsert({
      where: {
        channelId_userId: { channelId, userId },
      },
      update: {},
      create: {
        channelId,
        userId,
        role: "viewer",
      },
    });

    member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
      select: { id: true, role: true },
    });
  }

  const canDelete =
    channel.createdById === userId || member?.role === "admin";

  if (member) {
    const role = (member.role || "viewer") as "viewer" | "editor" | "admin";

    return (
      <ChannelFeed
        channelId={channelId}
        channelName={channel.name}
        bannerKey={channel.bannerKey}
        role={role}
        canDelete={canDelete}
      />
    );
  }

  if (channel.visibility === "public" && channel.publicAccessMode === "request") {
    return (
      <JoinRequestGate
        channelId={channelId}
        channelName={channel.name}
        bannerKey={channel.bannerKey}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-xl bg-white border rounded-xl p-4">
        <h2 className="text-lg font-semibold">Access denied</h2>
        <p className="text-sm text-gray-600 mt-1">
          This is a private channel. You are not a member.
        </p>
      </div>
    </div>
  );
}