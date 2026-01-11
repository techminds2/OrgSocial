import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { DJANGO_JWT_SECRET as SECRET_KEY } from "@/lib/jwtSecret";

function cleanToken(t: string) {
  return t.trim().replace(/^Bearer\s+/i, "").replace(/^"+|"+$/g, "");
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ allow ALL auth routes (login, me, logout, refresh, etc.)
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const accessTokenRaw = req.cookies.get("accessToken")?.value;
  const accessToken = accessTokenRaw ? cleanToken(accessTokenRaw) : null;

  // Home: redirect to dashboard if valid token
  if (pathname === "/") {
    if (!accessToken) return NextResponse.next();
    try {
      await jwtVerify(accessToken, SECRET_KEY, { algorithms: ["HS256"] });
      return NextResponse.redirect(new URL("/dashboard", req.url));
    } catch {
      return NextResponse.next();
    }
  }

  // ✅ API routes: JSON 401 (no redirect)
  if (pathname.startsWith("/api/")) {
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized (no token)" }, { status: 401 });
    }
    try {
      await jwtVerify(accessToken, SECRET_KEY, { algorithms: ["HS256"] });
      return NextResponse.next();
    } catch (err: any) {
      return NextResponse.json(
        { error: "Invalid or expired token", code: err?.code, message: err?.message },
        { status: 401 }
      );
    }
  }

  // Pages: redirect to /
  if (!accessToken) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  try {
    await jwtVerify(accessToken, SECRET_KEY, { algorithms: ["HS256"] });
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/", req.url));
  }
}

export const config = {
  matcher: ["/", "/dashboard", "/api/:path*"],
};
