/** Trim and collapse internal whitespace ("  Ana   María " -> "Ana María"). */
export function normalizeName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Reuse the existing spelling of a seller name when it matches case-insensitively,
 * so "ana " becomes "Ana" if "Ana" already exists. The database applies the same rule.
 */
export function canonicalSellerName(value: string, existing: readonly string[]): string {
  const normalized = normalizeName(value);
  const key = normalized.toLocaleLowerCase("es");
  const match = existing.find((s) => normalizeName(s).toLocaleLowerCase("es") === key);
  return match ?? normalized;
}

/** "Ana María" -> "AM", "Luis" -> "LU" */
export function sellerInitials(name: string | null | undefined): string {
  if (!name) return "";
  const words = normalizeName(name).split(" ").filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toLocaleUpperCase("es");
  return (words[0][0] + words[1][0]).toLocaleUpperCase("es");
}

/** Accent-insensitive lowercase key for searching ("Perú" -> "peru"). */
export function searchKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("es");
}
