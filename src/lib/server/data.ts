import "server-only";
import { supabaseAdmin } from "./supabase-admin";
import { copy } from "../copy";
import type { ActivityEntry, BoardNumber, DrawLinkSetting, SaleDetail, SaleRow } from "../types";

type BuyerEmbed = { name: string; phone: string } | { name: string; phone: string }[] | null;

function firstBuyer(b: BuyerEmbed): { name: string; phone: string } | null {
  if (!b) return null;
  return Array.isArray(b) ? (b[0] ?? null) : b;
}

export async function getBoard(): Promise<BoardNumber[]> {
  const { data, error } = await supabaseAdmin()
    .from("raffle_numbers")
    .select("number, seller_name, sold_at")
    .order("number");
  if (error) throw error;
  return data ?? [];
}

/** Distinct seller names already used (current sales plus the activity log). */
export async function getSellerNames(): Promise<string[]> {
  const db = supabaseAdmin();
  const [current, logged] = await Promise.all([
    db.from("raffle_numbers").select("seller_name, sold_at").not("seller_name", "is", null),
    db
      .from("activity_log")
      .select("seller_name, created_at")
      .in("action", ["sell", "edit"])
      .not("seller_name", "is", null)
      .order("created_at", { ascending: true })
      .limit(5000),
  ]);
  if (current.error) throw current.error;
  if (logged.error) throw logged.error;

  const byKey = new Map<string, string>();
  const add = (name: string | null) => {
    if (!name) return;
    const key = name.toLocaleLowerCase("es");
    if (!byKey.has(key)) byKey.set(key, name);
  };
  // Current sales win (that is the spelling the database will reuse first).
  [...(current.data ?? [])]
    .sort((a, b) => String(a.sold_at).localeCompare(String(b.sold_at)))
    .forEach((r) => add(r.seller_name));
  (logged.data ?? []).forEach((r) => add(r.seller_name));
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, "es"));
}

export async function getSale(number: number): Promise<SaleDetail | null> {
  const { data, error } = await supabaseAdmin()
    .from("raffle_numbers")
    .select("number, seller_name, sold_at, buyers(name, phone)")
    .eq("number", number)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.sold_at || !data.seller_name) return null;
  const buyer = firstBuyer(data.buyers as BuyerEmbed);
  if (!buyer) return null;
  return {
    number: data.number,
    seller_name: data.seller_name,
    sold_at: data.sold_at,
    buyer_name: buyer.name,
    phone: buyer.phone,
  };
}

/** All 250 numbers with buyer data when sold (for the summary, CSV and draw notice). */
export async function getAllNumbersWithBuyers(): Promise<
  (BoardNumber & { buyer_name: string | null; phone: string | null })[]
> {
  const { data, error } = await supabaseAdmin()
    .from("raffle_numbers")
    .select("number, seller_name, sold_at, buyers(name, phone)")
    .order("number");
  if (error) throw error;
  return (data ?? []).map((r) => {
    const buyer = firstBuyer(r.buyers as BuyerEmbed);
    return {
      number: r.number,
      seller_name: r.seller_name,
      sold_at: r.sold_at,
      buyer_name: buyer?.name ?? null,
      phone: buyer?.phone ?? null,
    };
  });
}

export async function getSales(): Promise<SaleRow[]> {
  const all = await getAllNumbersWithBuyers();
  return all
    .filter((r) => r.sold_at && r.seller_name && r.buyer_name && r.phone)
    .map((r) => ({
      number: r.number,
      seller_name: r.seller_name!,
      sold_at: r.sold_at!,
      buyer_name: r.buyer_name!,
      phone: r.phone!,
    }));
}

export async function getHistory(limit = 500): Promise<ActivityEntry[]> {
  const { data, error } = await supabaseAdmin()
    .from("activity_log")
    .select("id, number, action, seller_name, old_values, new_values, created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ActivityEntry[];
}

export async function getDrawLink(): Promise<DrawLinkSetting> {
  const { data, error } = await supabaseAdmin()
    .from("app_settings")
    .select("value, updated_at")
    .eq("key", "draw_link")
    .maybeSingle();
  if (error) throw error;
  return { url: data?.value ?? null, updated_at: data?.updated_at ?? null };
}

/** Map RPC error codes to Spanish messages and HTTP status. */
export function rpcErrorResponse(result: { error?: string; seller_name?: string | null }): {
  message: string;
  status: number;
  field?: string;
} {
  switch (result.error) {
    case "already_sold":
      return {
        message: result.seller_name
          ? copy.errors.alreadySold(result.seller_name)
          : copy.errors.alreadySoldUnknown,
        status: 409,
      };
    case "not_sold":
      return { message: copy.errors.notSold, status: 409 };
    case "changed":
      return { message: copy.errors.changed, status: 409 };
    case "invalid_number":
      return { message: copy.errors.invalidNumber, status: 400 };
    case "invalid_seller":
      return { message: copy.errors.sellerLength, status: 400, field: "sellerName" };
    case "invalid_buyer":
      return { message: copy.errors.buyerLength, status: 400, field: "buyerName" };
    case "invalid_phone":
      return { message: copy.errors.phoneInvalid, status: 400, field: "phone" };
    case "invalid_url":
      return { message: copy.errors.urlInvalid, status: 400 };
    default:
      return { message: copy.errors.generic, status: 500 };
  }
}
