import { copy } from "./copy";
import { normalizeName } from "./seller";
import { validateE164 } from "./phone";

export type SaleInput = { sellerName: string; buyerName: string; phone: string };

export type ValidationResult =
  | { ok: true; value: SaleInput }
  | { ok: false; error: string; field: "sellerName" | "buyerName" | "phone" };

/** Shared by client and server. phone must already be E.164. */
export function validateSaleInput(body: unknown): ValidationResult {
  const b = (body ?? {}) as Record<string, unknown>;
  const sellerName = normalizeName(typeof b.sellerName === "string" ? b.sellerName : "");
  const buyerName = normalizeName(typeof b.buyerName === "string" ? b.buyerName : "");
  const rawPhone = typeof b.phone === "string" ? b.phone : "";

  if (!sellerName) return { ok: false, error: copy.errors.sellerRequired, field: "sellerName" };
  if (sellerName.length < 2 || sellerName.length > 40)
    return { ok: false, error: copy.errors.sellerLength, field: "sellerName" };
  if (!buyerName) return { ok: false, error: copy.errors.buyerRequired, field: "buyerName" };
  if (buyerName.length < 2 || buyerName.length > 80)
    return { ok: false, error: copy.errors.buyerLength, field: "buyerName" };
  if (!rawPhone.trim()) return { ok: false, error: copy.errors.phoneRequired, field: "phone" };
  const phone = validateE164(rawPhone);
  if (!phone) return { ok: false, error: copy.errors.phoneInvalid, field: "phone" };

  return { ok: true, value: { sellerName, buyerName, phone } };
}

export function parseNumberParam(value: string): number | null {
  if (!/^\d{1,3}$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 && n <= 250 ? n : null;
}

export function isValidHttpsUrl(value: string): boolean {
  const v = value.trim();
  if (v.length > 500) return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !!u.hostname && u.hostname.includes(".");
  } catch {
    return false;
  }
}
