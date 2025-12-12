import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const SECRET = new TextEncoder().encode(
  "Z~}.bR_=f;bkx9c$k!at}rHRz6=!(xb3.=rY,E3K=StJh2A6mL;"
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get("accessToken")?.value;

  if (pathname === "/") {
    if (accessToken) {
      try {
        await jwtVerify(accessToken, SECRET);
        return NextResponse.redirect(new URL("/dashboard", req.url));
      } catch {
        return NextResponse.next();
      }
    }
    return NextResponse.next();
  }3

  if (pathname.startsWith("/api/auth/login")) {
    return NextResponse.next();
  }

  if (!accessToken) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  try {
    await jwtVerify(accessToken, SECRET);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/", req.url));
  }
}

export const config = {
  matcher: [
    "/", 
    "/dashboard", 
    "/api/:path*", 
  ],
};
