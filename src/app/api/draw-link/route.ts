import { NextResponse, type NextRequest } from "next/server";
import { copy } from "@/lib/copy";
import { requireSession } from "@/lib/server/auth";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { getDrawLink, rpcErrorResponse } from "@/lib/server/data";
import { isValidHttpsUrl } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  try {
    return NextResponse.json(await getDrawLink(), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: copy.errors.generic }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireSession();
  if (denied) return denied;
  let url = "";
  try {
    const body = await req.json();
    url = typeof body?.url === "string" ? body.url.trim() : "";
  } catch {
    // fall through to validation
  }
  if (!isValidHttpsUrl(url)) {
    return NextResponse.json({ error: copy.errors.urlInvalid }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin().rpc("set_draw_link", { p_url: url });
  if (error) {
    console.error("set_draw_link", error);
    return NextResponse.json({ error: copy.errors.generic }, { status: 500 });
  }
  const result = data as { ok: boolean; error?: string; draw_link?: string; updated_at?: string };
  if (!result.ok) {
    const e = rpcErrorResponse(result);
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  return NextResponse.json({ url: result.draw_link, updated_at: result.updated_at });
}
