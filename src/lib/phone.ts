import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { searchKey } from "./seller";

export type { CountryCode };

export const DEFAULT_COUNTRY: CountryCode = "PE";

/** Shown first, in this order, before the alphabetical list. */
export const PRIORITY_COUNTRIES: CountryCode[] = [
  "PE", "FR", "CL", "AR", "CO", "EC", "BO", "VE", "MX", "US", "ES", "IT",
];

export type CountryOption = {
  code: CountryCode;
  name: string;
  dialCode: string; // "+51"
  flag: string;
  key: string; // search key
};

let regionNames: Intl.DisplayNames | null = null;
function countryName(code: CountryCode): string {
  try {
    regionNames ??= new Intl.DisplayNames(["es"], { type: "region" });
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export function flagEmoji(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

let cache: { priority: CountryOption[]; others: CountryOption[] } | null = null;

export function countryOptions(): { priority: CountryOption[]; others: CountryOption[] } {
  if (cache) return cache;
  const build = (code: CountryCode): CountryOption => {
    const name = countryName(code);
    const dialCode = `+${getCountryCallingCode(code)}`;
    return { code, name, dialCode, flag: flagEmoji(code), key: `${searchKey(name)} ${dialCode} ${code.toLowerCase()}` };
  };
  const priority = PRIORITY_COUNTRIES.map(build);
  const others = getCountries()
    .filter((c) => !PRIORITY_COUNTRIES.includes(c))
    .map(build)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  cache = { priority, others };
  return cache;
}

export function findCountry(code: CountryCode): CountryOption {
  const { priority, others } = countryOptions();
  return [...priority, ...others].find((c) => c.code === code) ?? priority[0];
}

export type PhoneParseResult =
  | { ok: true; e164: string; country: CountryCode | undefined; international: string }
  | { ok: false; reason: "empty" | "invalid" };

/**
 * Parse what the user typed. Numbers starting with "+" are parsed as international
 * (the country is detected); anything else uses the selected country's local format.
 */
export function parsePhone(input: string, country: CountryCode): PhoneParseResult {
  const raw = input.trim();
  if (!raw) return { ok: false, reason: "empty" };
  const cleaned = raw.startsWith("00") ? `+${raw.slice(2)}` : raw;
  const parsed = cleaned.startsWith("+")
    ? parsePhoneNumberFromString(cleaned)
    : parsePhoneNumberFromString(cleaned, country);
  if (!parsed || !parsed.isValid()) return { ok: false, reason: "invalid" };
  return {
    ok: true,
    e164: parsed.number,
    country: parsed.country,
    international: parsed.formatInternational(),
  };
}

/** Detect the country of a number typed with "+" (returns undefined if unknown yet). */
export function detectCountry(input: string): CountryCode | undefined {
  const raw = input.trim();
  if (!raw.startsWith("+")) return undefined;
  const typer = new AsYouType();
  typer.input(raw);
  return typer.getCountry();
}

/** Server-side validation of an E.164 number. Returns the normalized E.164 or null. */
export function validateE164(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\+[1-9][0-9]{6,14}$/.test(trimmed)) return null;
  const parsed = parsePhoneNumberFromString(trimmed);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

/** "+51955838525" -> "+51 955 838 525" */
export function formatInternational(e164: string | null | undefined): string {
  if (!e164) return "";
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatInternational() : e164;
}

/** E.164 -> national digits for the edit form, plus its country. */
export function splitForEdit(e164: string): { country: CountryCode; national: string } {
  const parsed = parsePhoneNumberFromString(e164);
  if (parsed?.country) return { country: parsed.country, national: parsed.formatNational() };
  return { country: DEFAULT_COUNTRY, national: e164 };
}
