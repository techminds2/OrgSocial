import { NextResponse } from "next/server";
import cookie from "cookie";

export async function POST() {
  const res = NextResponse.json({ message: "Logged out successfully" });

  res.headers.set(
    "Set-Cookie",
    cookie.serialize("accessToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/",
      sameSite: "lax",
    })
  );

  res.headers.append(
    "Set-Cookie",
    cookie.serialize("refreshToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/",
      sameSite: "lax",
    })
  );

  return res;
}
