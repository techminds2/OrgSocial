import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { DJANGO_JWT_SECRET as SECRET } from "@/lib/jwtSecret";

function cleanToken(t: string) {
  return t
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^"+|"+$/g, "");
}

export async function getUserIdFromRequest(
  req: NextRequest
): Promise<number | null> {
  try {
    const raw = req.cookies.get("accessToken")?.value;
    if (!raw) return null;

    const token = cleanToken(raw);
    const result = await jwtVerify(token, SECRET, { algorithms: ["HS256"] });

    const uid = (result.payload as any).user_id;
    return uid ? Number(uid) : null;
  } catch {
    return null;
  }
}
