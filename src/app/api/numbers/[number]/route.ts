import { NextResponse, type NextRequest } from "next/server";
import { copy } from "@/lib/copy";
import { requireSession } from "@/lib/server/auth";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { getSale, rpcErrorResponse } from "@/lib/server/data";
import { parseNumberParam, validateSaleInput } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ number: string }> };

const noStore = { "Cache-Control": "no-store" };

async function resolveNumber(ctx: Ctx): Promise<number | null> {
  const { number } = await ctx.params;
  return parseNumberParam(number);
}

/** Sale detail (buyer data). */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const denied = await requireSession();
  if (denied) return denied;
  const n = await resolveNumber(ctx);
  if (!n) return NextResponse.json({ error: copy.errors.invalidNumber }, { status: 400 });
  try {
    const sale = await getSale(n);
    return NextResponse.json({ sale }, { headers: noStore });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: copy.sale.detailError }, { status: 500 });
  }
}

type RpcResult = { ok: boolean; error?: string; seller_name?: string | null; [k: string]: unknown };

async function callSaleRpc(fn: "sell_number" | "update_sale", n: number, body: unknown) {
  const v = validateSaleInput(body);
  if (!v.ok) return NextResponse.json({ error: v.error, field: v.field }, { status: 400 });

  const { data, error } = await supabaseAdmin().rpc(fn, {
    p_number: n,
    p_seller_name: v.value.sellerName,
    p_buyer_name: v.value.buyerName,
    p_phone: v.value.phone,
  });
  if (error) {
    console.error(fn, error);
    return NextResponse.json({ error: copy.errors.generic }, { status: 500 });
  }
  const result = data as RpcResult;
  if (!result.ok) {
    const e = rpcErrorResponse(result);
    return NextResponse.json({ error: e.message, field: e.field, code: result.error }, { status: e.status });
  }
  return NextResponse.json(
    {
      sale: {
        number: n,
        seller_name: result.seller_name,
        buyer_name: result.buyer_name,
        phone: result.phone,
        sold_at: result.sold_at,
      },
      changed: result.changed,
    },
    { headers: noStore },
  );
}

async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

/** Sell a free number. */
export async function POST(req: NextRequest, ctx: Ctx) {
  const denied = await requireSession();
  if (denied) return denied;
  const n = await resolveNumber(ctx);
  if (!n) return NextResponse.json({ error: copy.errors.invalidNumber }, { status: 400 });
  return callSaleRpc("sell_number", n, await readJson(req));
}

/** Edit a sold number. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const denied = await requireSession();
  if (denied) return denied;
  const n = await resolveNumber(ctx);
  if (!n) return NextResponse.json({ error: copy.errors.invalidNumber }, { status: 400 });
  return callSaleRpc("update_sale", n, await readJson(req));
}

/** Release a sold number. Optional ?soldAt= guards against releasing a re-sold number. */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const denied = await requireSession();
  if (denied) return denied;
  const n = await resolveNumber(ctx);
  if (!n) return NextResponse.json({ error: copy.errors.invalidNumber }, { status: 400 });

  const soldAt = req.nextUrl.searchParams.get("soldAt");
  const { data, error } = await supabaseAdmin().rpc("release_number", {
    p_number: n,
    p_expected_sold_at: soldAt && !Number.isNaN(Date.parse(soldAt)) ? soldAt : null,
  });
  if (error) {
    console.error("release_number", error);
    return NextResponse.json({ error: copy.errors.generic }, { status: 500 });
  }
  const result = data as RpcResult;
  if (!result.ok) {
    const e = rpcErrorResponse(result);
    return NextResponse.json({ error: e.message, code: result.error }, { status: e.status });
  }
  return NextResponse.json({ ok: true }, { headers: noStore });
}
