// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";
import { DJANGO_JWT_SECRET as SECRET } from "@/lib/jwtSecret";
import DashboardClient from "./DashboardClient";

function cleanToken(t: string) {
  return t.trim().replace(/^Bearer\s+/i, "").replace(/^"+|"+$/g, "");
}

async function getUserIdFromCookie(): Promise<number | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("accessToken")?.value;
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

export default async function DashboardPage() {
  const userId = await getUserIdFromCookie();
  if (!userId) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pinnedChannelId: true },
  });

  if (user?.pinnedChannelId) {
    redirect(`/channels/${user.pinnedChannelId}`);
  }

  // ✅ Nothing pinned => show normal dashboard feed
  return <DashboardClient />;
}
