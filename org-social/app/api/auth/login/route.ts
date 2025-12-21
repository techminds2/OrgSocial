/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Logs in the user and returns access and refresh tokens.
 *     tags:
 *       - Auth
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
 *                 example: sworiya
 *               password:
 *                 type: string
 *                 example: sworiya#123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: JWT access token
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     isStaff:
 *                       type: boolean
 *                     profileImage:
 *                       type: string
 *                       description: URL of user's profile image
 *       401:
 *         description: Invalid credentials
 */

import { NextResponse } from "next/server";
import cookie from "cookie";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const { username, password } = await req.json();

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

  const userViewRes = await fetch(
    `https://callminds.techminds.com.np/auth/api/user-view/${userId}/`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const userView = await userViewRes.json();

  console.log("userview: ",userView.data.profile_photo);

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
