// lib/auth.ts
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { DJANGO_JWT_SECRET as SECRET } from "@/lib/jwtSecret";

export type Viewer = {
  user_id: number;
  username: string | null;
  email: string | null;
  role: string | null;
};

export function cleanToken(t: string) {
  return t.trim().replace(/^Bearer\s+/i, "").replace(/^"+|"+$/g, "");
}

// ------------------------------
// Existing: keep (still usable)
// ------------------------------
export async function getUserIdFromRequest(
  req: NextRequest
): Promise<number | null> {
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

// ------------------------------
// Existing: keep, but typed
// ------------------------------
export async function getUserFromRequest(req: NextRequest): Promise<Viewer | null> {
  try {
    const raw = req.cookies.get("accessToken")?.value;
    if (!raw) return null;

    const token = cleanToken(raw);
    const result = await jwtVerify(token, SECRET, { algorithms: ["HS256"] });

    const payload = result.payload as any;
    const user_id = payload.user_id ? Number(payload.user_id) : null;
    if (!user_id) return null;

    return {
      user_id,
      username: payload.username || null,
      email: payload.email || null,
      role: payload.role || null,
    };
  } catch {
    return null;
  }
}

// ------------------------------
// ✅ FIXED: server components/pages (Next.js 16 cookies() is async)
// ------------------------------
export async function getUserFromCookies(): Promise<Viewer | null> {
  try {
    const cookieStore = await cookies(); // ✅ THIS is the fix
    const raw = cookieStore.get("accessToken")?.value;
    if (!raw) return null;

    const token = cleanToken(raw);
    const result = await jwtVerify(token, SECRET, { algorithms: ["HS256"] });

    const payload = result.payload as any;
    const user_id = payload.user_id ? Number(payload.user_id) : null;
    if (!user_id) return null;

    return {
      user_id,
      username: payload.username || null,
      email: payload.email || null,
      role: payload.role || null,
    };
  } catch {
    return null;
  }
}

// ------------------------------
// NEW: fetch target user from corporate auth
// (used to check target role = branch_manager?)
// ------------------------------
export async function fetchCorporateUserById(token: string, userId: number) {
  const res = await fetch("https://corporate.techminds.com.np/auth/api/users/", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = await res.json();
  const list = data?.data || data?.results || data || [];
  return list.find((u: any) => Number(u.id) === Number(userId)) || null;
}

// ------------------------------
// NEW: single source of truth for permissions
// ------------------------------
export function canViewDailyReports(opts: {
  viewerRole: string | null;
  viewerId: number;
  targetUserId: number;
  targetUserRole: string | null;
}) {
  const { viewerRole, viewerId, targetUserId, targetUserRole } = opts;

  // branch_manager => only self
  if (viewerRole === "branch_manager") {
    return viewerId === targetUserId;
  }

  // admin => only if target is branch_manager
  if (viewerRole === "admin") {
    return targetUserRole === "branch_manager";
  }

  return false;
}