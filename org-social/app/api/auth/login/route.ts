/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */

import { NextResponse } from "next/server";
import cookie from "cookie";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const { username, password } = await req.json();

  // 1️⃣ Login via Django
  const response = await fetch(
    "https://callminds.techminds.com.np/auth/api/token/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const data = await response.json();
  const accessToken = data.access;
  const userId = data.user_id;

  // 2️⃣ Fetch full user details including profile_photo
  const userViewRes = await fetch(
    `https://callminds.techminds.com.np/auth/api/user-view/${userId}/`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const userView = await userViewRes.json();

  // 3️⃣ Upsert user in Prisma
  const user = await prisma.user.upsert({
  where: { id: data.user_id }, 
  update: {
    username: data.username,
    email: userView.data.email || null,
    role: userView.data.role || "user",
    isStaff: true,
    profileImage: userView.data.profile_photo || null,
  },
  create: {
    id: data.user_id, 
    username: data.username,
    email: userView.data.email || null,
    role: userView.data.role || "user",
    isStaff: true,
    profileImage: userView.data.profile_photo || null,
  },
});

  // 4️⃣ Set cookies
  const res = NextResponse.json({ user });
  res.headers.set(
    "Set-Cookie",
    cookie.serialize("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60,
      path: "/",
      sameSite: "lax",
    })
  );
  res.headers.append(
    "Set-Cookie",
    cookie.serialize("refreshToken", data.refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
    })
  );

  return res;
}
