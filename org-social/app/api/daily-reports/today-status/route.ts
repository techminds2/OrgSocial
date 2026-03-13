import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { cleanToken, getUserFromCookies } from "@/lib/auth";
import { todayNepalYmd } from "@/lib/dailyReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(body: any, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

type CorporateUser = {
  id: number;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role?: string | null;
  organization_unit?: number | null;
  department?: number | null;
  job_title?: string | null;
  profile_photo?: string | null;
  staff_since?: string | null;
  supervisors?: number[];
};

function fullName(u: CorporateUser) {
  return `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username;
}

async function fetchCorporateUsers(token: string): Promise<CorporateUser[]> {
  const res = await fetch(
    "https://corporate.techminds.com.np/auth/api/users/",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error(`Corporate users fetch failed: ${res.status}`);
  }

  const data = await res.json();
  return data?.data || data?.results || [];
}

export async function GET() {
  try {
    const viewer = await getUserFromCookies();

    if (!viewer?.user_id) {
      return noStoreJson({ error: "Unauthorized" }, 401);
    }

    if (viewer.role !== "admin") {
      return noStoreJson({ error: "Forbidden" }, 403);
    }

    const cookieStore = await cookies();
    const raw = cookieStore.get("accessToken")?.value;
    if (!raw) {
      return noStoreJson({ error: "Missing access token" }, 401);
    }

    const token = cleanToken(raw);
    const corporateUsers = await fetchCorporateUsers(token);

    const branchManagers = corporateUsers.filter(
      (u) => String(u.role || "").toLowerCase() === "branch_manager",
    );

    const reportYmd = todayNepalYmd();

    const reports = await prisma.dailyReport.findMany({
      where: {
        reportYmd,
        authorId: {
          in: branchManagers.map((u) => Number(u.id)),
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const reportMap = new Map(reports.map((r) => [r.authorId, r]));

    const items = branchManagers.map((u) => {
      const report = reportMap.get(Number(u.id)) ?? null;

      return {
        id: Number(u.id),
        username: u.username,
        name: fullName(u),
        email: u.email ?? null,
        role: u.role ?? null,
        organizationUnit: u.organization_unit ?? null,
        department: u.department ?? null,
        submittedToday: !!report,
        report,
      };
    });

    return noStoreJson({
      reportYmd,
      count: items.length,
      items,
    });
  } catch (e) {
    console.error("TODAY STATUS ERROR:", e);
    return noStoreJson({ error: "Server error" }, 500);
  }
}
