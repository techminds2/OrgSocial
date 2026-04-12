import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireViewer } from "@/lib/requireAuth";
import { todayNepalYmd } from "@/lib/dailyReport";
import { jwtVerify } from "jose";
import { DJANGO_JWT_SECRET as SECRET } from "@/lib/jwtSecret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(body: any, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function cleanToken(t: string) {
  return t
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^"+|"+$/g, "");
}

async function getViewerToken(req: NextRequest) {
  const raw = req.cookies.get("accessToken")?.value;
  if (!raw) return null;

  try {
    const token = cleanToken(raw);
    await jwtVerify(token, SECRET, { algorithms: ["HS256"] });
    return token;
  } catch {
    return null;
  }
}

async function fetchUsersFromCorporate(token: string) {
  const res = await fetch("https://corporate.techminds.com.np/auth/api/users/", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Corporate users fetch failed: ${res.status}`);
  }

  const data = await res.json();

  return Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
      ? data
      : Array.isArray(data?.results)
        ? data.results
        : [];
}

async function fetchUsersLocal() {
  const localUsers = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      profileImage: true,
    },
    orderBy: {
      username: "asc",
    },
  });

  return localUsers.map((u) => ({
    id: u.id,
    username: u.username ?? "",
    first_name: "",
    last_name: "",
    email: u.email ?? "",
    role: u.role ?? "",
    organization_unit: null,
    department: null,
    job_title: null,
    profile_photo: u.profileImage ?? null,
    staff_since: null,
    supervisors: [],
  }));
}

function normalizeName(u: any) {
  const full = `${u?.first_name ?? ""} ${u?.last_name ?? ""}`.trim();
  return full || u?.username || `User ${u?.id ?? ""}`;
}

export async function GET(req: NextRequest) {
  try {
    const viewer = await requireViewer(req);
    if (!viewer) return noStoreJson({ error: "Unauthorized" }, 401);

    if (String(viewer.role || "").toLowerCase() !== "admin") {
      return noStoreJson({ error: "Forbidden" }, 403);
    }

    const type = String(req.nextUrl.searchParams.get("type") || "branch").toLowerCase();
    const date = todayNepalYmd();

    const targetRole = type === "regional" ? "manager" : "branch_manager";

    let users: any[] = [];
    const token = await getViewerToken(req);

    if (token) {
      try {
        users = await fetchUsersFromCorporate(token);
      } catch (e) {
        console.error("TODAY STATUS CORPORATE FETCH FAILED:", e);
        users = await fetchUsersLocal();
      }
    } else {
      users = await fetchUsersLocal();
    }

    const filteredUsers = users.filter((u) => {
      const role = String(u?.role || "").toLowerCase();
      return role === targetRole;
    });

    const userIds = filteredUsers
      .map((u) => Number(u?.id))
      .filter((id) => Number.isFinite(id));

    if (type === "regional") {
      const reports = await prisma.regionalDailyReport.findMany({
        where: {
          authorId: { in: userIds },
          reportYmd: date,
        },
        orderBy: { updatedAt: "desc" },
      });

      const reportMap = new Map<number, any>();
      for (const r of reports) {
        if (!reportMap.has(r.authorId)) {
          reportMap.set(r.authorId, r);
        }
      }

      const items = filteredUsers.map((u) => {
        const id = Number(u.id);
        const report = reportMap.get(id) || null;

        return {
          id,
          name: normalizeName(u),
          username: u?.username ?? "",
          email: u?.email ?? null,
          role: u?.role ?? null,
          organizationUnit: u?.organization_unit ?? null,
          department: u?.department ?? null,
          submittedToday: !!report,
          report,
        };
      });

      return noStoreJson({
        type: "regional",
        date,
        items,
      });
    }

    const reports = await prisma.dailyReport.findMany({
      where: {
        authorId: { in: userIds },
        reportYmd: date,
      },
      orderBy: { updatedAt: "desc" },
    });

    const reportMap = new Map<number, any>();
    for (const r of reports) {
      if (!reportMap.has(r.authorId)) {
        reportMap.set(r.authorId, r);
      }
    }

    const items = filteredUsers.map((u) => {
      const id = Number(u.id);
      const report = reportMap.get(id) || null;

      return {
        id,
        name: normalizeName(u),
        username: u?.username ?? "",
        email: u?.email ?? null,
        role: u?.role ?? null,
        organizationUnit: u?.organization_unit ?? null,
        department: u?.department ?? null,
        submittedToday: !!report,
        report,
      };
    });

    return noStoreJson({
      type: "branch",
      date,
      items,
    });
  } catch (error) {
    console.error("TODAY STATUS API ERROR:", error);
    return noStoreJson({ error: "Server error" }, 500);
  }
}