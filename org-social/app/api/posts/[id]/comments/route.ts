import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";

export const runtime = "nodejs";

const SECRET = new TextEncoder().encode(
  process.env.DJANGO_JWT_SECRET || ""
);

/* ---------------- AUTH HELPERS ---------------- */
async function getUserId(req: NextRequest): Promise<number | null> {
  try {
    const raw = req.cookies.get("accessToken")?.value;
    if (!raw) return null;

    const token = raw.replace(/^Bearer\s+/i, "").replace(/^"+|"+$/g, "");
    const { payload } = await jwtVerify(token, SECRET, { algorithms: ["HS256"] });
    return (payload as any).user_id ?? null;
  } catch {
    return null;
  }
}

/* ---------------- GET COMMENTS ---------------- */
export async function GET(
  _req: NextRequest,
  ctx: { params: any }
) {
  try {
    const params = await ctx.params; // unwrap promise
    const postId = Number(params.id);
    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
    }

    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profileImage: true,
          },
        },
      },
    });

    return NextResponse.json({ comments });
  } catch (err) {
    console.error("GET COMMENTS ERROR:", err);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

/* ---------------- CREATE COMMENT ---------------- */
export async function POST(
  req: NextRequest,
  ctx: { params: any }
) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await ctx.params;
    const postId = Number(params.id);
    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.content?.trim()) {
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        content: body.content,
        postId,
        authorId: userId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profileImage: true,
          },
        },
      },
    });

    return NextResponse.json({ comment });
  } catch (err) {
    console.error("CREATE COMMENT ERROR:", err);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
