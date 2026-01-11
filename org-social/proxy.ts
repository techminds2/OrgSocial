import { jwtVerify, decodeProtectedHeader } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { DJANGO_JWT_SECRET as SECRET } from "@/lib/jwtSecret";

function cleanToken(t: string) {
  return t.trim().replace(/^Bearer\s+/i, "").replace(/^"+|"+$/g, "");
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow Next.js internals + common public assets (served from /public as root paths)
const PUBLIC_FILE = /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|xml|woff|woff2|ttf|eot|mp4|webm|mp3|wav)$/i;

if (
  pathname.startsWith("/_next/") ||
  pathname.startsWith("/favicon.ico") ||
  pathname.startsWith("/robots.txt") ||
  pathname.startsWith("/sitemap.xml") ||
  pathname.startsWith("/manifest.json") ||
  pathname.startsWith("/uploads/") || 
  PUBLIC_FILE.test(pathname)        
) {
  return NextResponse.next();
}


  const accessTokenRaw = req.cookies.get("accessToken")?.value;
  const accessToken = accessTokenRaw ? cleanToken(accessTokenRaw) : undefined;

  // Public landing page
  if (pathname === "/") {
    if (accessToken) {
      try {
        decodeProtectedHeader(accessToken);
        await jwtVerify(accessToken, SECRET, { algorithms: ["HS256"] });
        return NextResponse.redirect(new URL("/dashboard", req.url));
      } catch {
        return NextResponse.next();
      }
    }
    return NextResponse.next();
  }

  // Always allow auth routes
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // API routes (except auth) → JSON 401 if no token / invalid
  if (pathname.startsWith("/api/")) {
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized (no token)" }, { status: 401 });
    }
    try {
      decodeProtectedHeader(accessToken);
      await jwtVerify(accessToken, SECRET, { algorithms: ["HS256"] });
      return NextResponse.next();
    } catch (err: any) {
      return NextResponse.json(
        { error: "Invalid or expired token", code: err?.code, message: err?.message },
        { status: 401 }
      );
    }
  }

  // All other pages → redirect to / if no token / invalid
  if (!accessToken) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  try {
    decodeProtectedHeader(accessToken);
    await jwtVerify(accessToken, SECRET, { algorithms: ["HS256"] });
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/", req.url));
  }
}

// Apply middleware to all pages and API routes
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)",
  ],
};
