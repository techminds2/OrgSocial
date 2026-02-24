import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

export async function requireViewer(req: NextRequest) {
  const u = await getUserFromRequest(req);
  const userId = u?.user_id ? Number(u.user_id) : null;
  if (!userId) return null;

  return {
    userId,
    role: u?.role ?? null,
    username: u?.username ?? null,
    email: u?.email ?? null,
  };
}

export function canViewDailyReports(
  targetUserId: number,
  viewer: { userId: number; role: string | null }
) {
  if (viewer.role === "admin") return true;
  return viewer.userId === targetUserId;
}

export function isOwner(
  targetUserId: number,
  viewer: { userId: number; role: string | null }
) {
  return viewer.userId === targetUserId;
}