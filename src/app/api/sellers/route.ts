import { NextResponse } from "next/server";
import { copy } from "@/lib/copy";
import { requireSession } from "@/lib/server/auth";
import { getSellerNames } from "@/lib/server/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  try {
    const sellers = await getSellerNames();
    return NextResponse.json({ sellers }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: copy.errors.generic }, { status: 500 });
  }
}
