import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const SECRET = new TextEncoder().encode(
  "Z~}.bR_=f;bkx9c$k!at}rHRz6=!(xb3.=rY,E3K=StJh2A6mL;"
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const publicPaths = ["/api/auth/login", "/"];

  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const accessToken = req.cookies.get("accessToken")?.value;
  if (!accessToken) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  try {
    await jwtVerify(accessToken, SECRET);
    return NextResponse.next();
  } catch (error) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: [    "/((?!api/auth/login|_next/static|_next/image|favicon.ico).*)",
],
};
