export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.DJANGO_JWT_SECRET || "");

function cleanToken(token: string) {
  return token.trim().replace(/^Bearer\s+/i, "").replace(/^"+|"+$/g, "");
}

async function getUserId(req: NextRequest): Promise<number | null> {
  try {
    const raw = req.cookies.get("accessToken")?.value;
    if (!raw) return null;

    const { payload } = await jwtVerify(cleanToken(raw), SECRET, {
      algorithms: ["HS256"],
    });

    const uid = (payload as any).user_id;
    return uid ? Number(uid) : null;
  } catch {
    return null;
  }
}

/* ---------------- CREATE COMMENT (no GET here) ---------------- */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const postId = Number(id);
    if (Number.isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const content = body?.content?.trim();
    if (!content) {
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: { content, postId, authorId: userId },
      include: {
        author: { select: { id: true, username: true, profileImage: true } },
      },
    });

    return NextResponse.json({ comment });
  } catch (err) {
    console.error("CREATE COMMENT ERROR:", err);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
