import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const SECRET = new TextEncoder().encode(
  "Z~}.bR_=f;bkx9c$k!at}rHRz6=!(xb3.=rY,E3K=StJh2A6mL;"
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get("accessToken")?.value;

  // --- Login page --- //
  if (pathname === "/") {
    if (accessToken) {
      try {
        await jwtVerify(accessToken, SECRET);
        // If user is already loggin in, then redirect to dashboard
        return NextResponse.redirect(new URL("/dashboard", req.url));
      } catch {
        // If token is not valid
        return NextResponse.next();
      }
    }
    return NextResponse.next();
  }

  //API routes
  if (pathname.startsWith("/api/auth/login")) {
    return NextResponse.next();
  }

  //Protected routed except login page
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
