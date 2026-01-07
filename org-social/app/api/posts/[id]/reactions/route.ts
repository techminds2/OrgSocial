import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";
import { DJANGO_JWT_SECRET as SECRET } from "@/lib/jwtSecret";

export const runtime = "nodejs";

// const SECRET = new TextEncoder().encode(
//   process.env.DJANGO_JWT_SECRET || ""
// );

function cleanToken(token: string) {
  return token
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^"+|"+$/g, "");
}

/* -------------------- TOGGLE LIKE -------------------- */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const postId = Number(id);

    if (Number.isNaN(postId)) {
      return NextResponse.json(
        { error: "Invalid post id" },
        { status: 400 }
      );
    }

    const rawToken = req.cookies.get("accessToken")?.value;
    if (!rawToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = cleanToken(rawToken);

    const verifyResult = await jwtVerify(token, SECRET, {
      algorithms: ["HS256"],
    });

    const userId = (verifyResult.payload as any).user_id as number;

    if (!userId) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const existing = await prisma.reaction.findUnique({
      where: {
        postId_userId_type: {
          postId,
          userId,
          type: "LIKE",
        },
      },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ liked: false });
    }

    await prisma.reaction.create({
      data: {
        postId,
        userId,
        type: "LIKE",
      },
    });

    return NextResponse.json({ liked: true });
  } catch (err) {
    console.error("REACTION ERROR:", err);
    return NextResponse.json(
      { error: "Reaction failed" },
      { status: 500 }
    );
  }
}
