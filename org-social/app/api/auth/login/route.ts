import { NextResponse } from "next/server";
import cookie from "cookie";

export async function POST(req: Request) {
  const { username, password } = await req.json();


  const response = await fetch("https://callminds.techminds.com.np/auth/api/token/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const data = await response.json(); //user info

 
  const res = NextResponse.json({ user: data });
  res.headers.set(
    "Set-Cookie",
    cookie.serialize("accessToken", data.access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "development",
      maxAge: 60 * 60, //1 hour
      path: "/",
      sameSite: "lax",
    })
  );
  res.headers.append(
    "Set-Cookie",
    cookie.serialize("refreshToken", data.refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "development",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
      sameSite: "lax",
    })
  );

  return res;
}
