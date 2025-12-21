import { jwtVerify, decodeProtectedHeader } from "jose";
import { NextRequest, NextResponse } from "next/server";

const SECRET_STR = process.env.DJANGO_JWT_SECRET || "";
const SECRET = new TextEncoder().encode(SECRET_STR);

// console.log("ENV secret length:", SECRET_STR.length);
// console.log("ENV secret preview:", JSON.stringify(SECRET_STR));
// console.log("ENV secret chars:", [...SECRET_STR].map((c) => c.charCodeAt(0)));
// console.log("SECRET bytes:", [...SECRET]);

function cleanToken(t: string) {
  return t
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^"+|"+$/g, "");
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessTokenRaw = req.cookies.get("accessToken")?.value;
  const accessToken = accessTokenRaw ? cleanToken(accessTokenRaw) : undefined;

  // console.log("=== Proxy Start ===");
  // console.log("Pathname:", pathname);
  // console.log("Access token:", accessToken ? "[FOUND]" : "[NOT FOUND]");

  if (pathname === "/") {
    if (accessToken) {
      console.log(typeof accessToken);
      try {
        const hdr = decodeProtectedHeader(accessToken);
        // console.log("JWT header alg:", hdr.alg);

        const verified = await jwtVerify(accessToken, SECRET, {
          algorithms: ["HS256"],
        });

        // console.log("✅ JWT verified for / → redirect to /dashboard");
        // console.log("JWT payload:", verified.payload);
        return NextResponse.redirect(new URL("/dashboard", req.url));
      } catch (err) {
        // console.error("❌ JWT verification failed on /:", err);
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
    // console.log("JWT header alg:", hdr.alg);

    const verified = await jwtVerify(accessToken, SECRET, {
      algorithms: ["HS256"],
    });

    // console.log("✅ JWT verified for protected route → allow next()");
    // console.log("JWT payload:", verified.payload);
    return NextResponse.next();
  } catch (err) {
    console.error("❌ JWT verification failed for protected route:", err);
    return NextResponse.redirect(new URL("/", req.url));
  }
}

export const config = {
  matcher: ["/", "/dashboard", "/api/:path*"],
};
