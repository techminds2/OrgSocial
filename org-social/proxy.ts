import { jwtVerify, decodeProtectedHeader } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { DJANGO_JWT_SECRET as SECRET } from "@/lib/jwtSecret";

function cleanToken(t: string) {
  return t
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^"+|"+$/g, "");
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessTokenRaw = req.cookies.get("accessToken")?.value;
  const accessToken = accessTokenRaw ? cleanToken(accessTokenRaw) : undefined;

  if (pathname === "/") {
    if (accessToken) {
      console.log(typeof accessToken);
      try {
        const hdr = decodeProtectedHeader(accessToken);

        const verified = await jwtVerify(accessToken, SECRET, {
          algorithms: ["HS256"],
        });

        return NextResponse.redirect(new URL("/dashboard", req.url));
      } catch (err) {
        return NextResponse.next();
      }
    }
    console.log("No token on / → allow next()");
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth/login")) {
    console.log("Login route → allow next()");
    return NextResponse.next();
  }

  if (!accessToken) {
    console.log("No token for protected route → redirect to /");
    return NextResponse.redirect(new URL("/", req.url));
  }

  try {
    const hdr = decodeProtectedHeader(accessToken);
    const verified = await jwtVerify(accessToken, SECRET, {
      algorithms: ["HS256"],
    });

    return NextResponse.next();
  } catch (err) {
    console.error("❌ JWT verification failed for protected route:", err);
    return NextResponse.redirect(new URL("/", req.url));
  }
}

export const config = {
  matcher: ["/", "/dashboard", "/api/:path*"],
};
