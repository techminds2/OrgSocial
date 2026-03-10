import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";
import { DJANGO_JWT_SECRET as SECRET } from "@/lib/jwtSecret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function cleanToken(t: string) {
  return t
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^"+|"+$/g, "");
}

async function getViewerFromToken(raw: string) {
  try {
    const token = cleanToken(raw);
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: ["HS256"],
    });

    return {
      user_id: Number((payload as any).user_id) || null,
      username: (payload as any).username || null,
      email: (payload as any).email || null,
      role: (payload as any).role || null,
      token,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const raw = req.cookies.get("accessToken")?.value;

  if (!raw) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const viewer = await getViewerFromToken(raw);

  if (!viewer?.token) {
    return NextResponse.json(
      { error: "Invalid token" },
      { status: 401 }
    );
  }

  try {
    const res = await fetch(
      "https://corporate.techminds.com.np/auth/api/users/",
      {
        headers: {
          Authorization: `Bearer ${viewer.token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (res.ok) {
      const data = await res.json();

      return NextResponse.json({
        data: Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
          ? data.results
          : [],
        source: "corporate",
      });
    }

    // If upstream denies non-admin users, fallback to local users
    if (res.status === 403) {
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

      const normalizedUsers = localUsers.map((u) => ({
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

      return NextResponse.json({
        data: normalizedUsers,
        source: "local",
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: res.status }
    );
  } catch (error) {
    console.error("TEAM DIRECTORY API ERROR:", error);

    // Final fallback to local users on unexpected failure
    try {
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

      const normalizedUsers = localUsers.map((u) => ({
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

      return NextResponse.json({
        data: normalizedUsers,
        source: "local",
      });
    } catch (fallbackError) {
      console.error("TEAM DIRECTORY FALLBACK ERROR:", fallbackError);

      return NextResponse.json(
        { error: "Server error" },
        { status: 500 }
      );
    }
  }
}