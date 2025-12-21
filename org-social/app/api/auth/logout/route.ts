/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Create post
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 */
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
