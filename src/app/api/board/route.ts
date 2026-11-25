import { NextResponse } from "next/server";
import { copy } from "@/lib/copy";
import { requireSession } from "@/lib/server/auth";
import { getBoard } from "@/lib/server/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fallback board snapshot (the browser normally reads raffle_numbers with the anon key). */
export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  try {
    const numbers = await getBoard();
    return NextResponse.json({ numbers }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: copy.board.loadError }, { status: 500 });
  }
}
