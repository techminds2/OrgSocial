// app/channels/[id]/requests/page.tsx
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect, notFound } from "next/navigation";
import RequestsClient from "./RequestsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SECRET = new TextEncoder().encode(process.env.DJANGO_JWT_SECRET || "");

function cleanToken(t: string) {
  return t.trim().replace(/^Bearer\s+/i, "").replace(/^"+|"+$/g, "");
}

async function getUserIdFromCookies() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("accessToken")?.value;
  if (!raw) return null;

  try {
    const token = cleanToken(raw);
    const { payload } = await jwtVerify(token, SECRET, { algorithms: ["HS256"] });
    const uid = (payload as any).user_id;
    return uid ? Number(uid) : null;
  } catch {
    return null;
  }
}

export default async function RequestsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const userId = await getUserIdFromCookies();
  if (!userId) redirect("/");

  const channelId = Number(id);
  if (!Number.isFinite(channelId)) notFound();

  // must be admin
  const me = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
    select: { role: true },
  });

  if (!me || me.role !== "admin") {
    return (
      <div className="p-6">
        <div className="max-w-xl bg-white border rounded-xl p-4">
          <h2 className="text-lg font-semibold">Forbidden</h2>
          <p className="text-sm text-gray-600 mt-1">Admin only.</p>
        </div>
      </div>
    );
  }

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true, name: true },
  });
  if (!channel) notFound();

  return <RequestsClient channelId={channelId} channelName={channel.name} />;
}
