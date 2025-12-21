// app/api/swagger/route.ts
import { NextResponse } from "next/server";
import { swaggerSpec } from "@/lib/swaggerConfig";

export async function GET() {
  return NextResponse.json(swaggerSpec);
}
