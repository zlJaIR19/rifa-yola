"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { copy } from "@/lib/copy";
import {
  countryOptions,
  detectCountry,
  findCountry,
  parsePhone,
  type CountryCode,
  type CountryOption,
} from "@/lib/phone";
import { searchKey } from "@/lib/seller";

type Props = {
  value: string;
  country: CountryCode;
  onChange: (value: string) => void;
  onCountryChange: (country: CountryCode) => void;
  error?: string | null;
};

export function PhoneInput({ value, country, onChange, onCountryChange, error }: Props) {
  const id = useId();
  const [pickerOpen, setPickerOpen] = useState(false);
  const selected = findCountry(country);

  const parsed = useMemo(() => parsePhone(value, country), [value, country]);

  function handleInput(next: string) {
    onChange(next);
    const detected = detectCountry(next);
    if (detected && detected !== country) onCountryChange(detected);
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-extrabold">
        {copy.sale.phoneLabel}
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label={`${copy.phone.countryLabel}: ${selected.name} (${selected.dialCode})`}
          className="flex shrink-0 items-center gap-1 rounded-xl border-2 border-cream-200 bg-white px-2.5 font-bold"
        >
          <span aria-hidden="true" className="text-xl">{selected.flag}</span>
          <span className="text-sm">{selected.dialCode}</span>
          <span aria-hidden="true" className="text-xs text-ink-soft">▾</span>
        </button>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          aria-invalid={!!error}
          placeholder={copy.sale.phonePlaceholder}
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          className={`min-w-0 flex-1 rounded-xl border-2 bg-white px-3 py-2.5 text-base font-bold outline-none focus:border-pine-700 ${
            error ? "border-berry-600" : "border-cream-200"
          }`}
        />
      </div>
      {error ? (
        <p className="mt-1 text-sm font-bold text-berry-700">{error}</p>
      ) : parsed.ok ? (
        <p className="mt-1 text-xs font-bold text-pine-700">✓ {parsed.international}</p>
      ) : null}
      {pickerOpen && (
        <CountryPicker
          selected={country}
          onClose={() => setPickerOpen(false)}
          onPick={(c) => {
            onCountryChange(c);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

function CountryPicker({
  selected,
  onPick,
  onClose,
}: {
  selected: CountryCode;
  onPick: (c: CountryCode) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { priority, others } = countryOptions();

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const q = searchKey(query.trim());
  const filter = (list: CountryOption[]) => (q ? list.filter((c) => c.key.includes(q)) : list);
  const top = filter(priority);
  const rest = filter(others);

  const row = (c: CountryOption) => (
    <li key={c.code}>
      <button
        type="button"
        onClick={() => onPick(c.code)}
        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left font-bold hover:bg-cream-100 ${
          c.code === selected ? "bg-cream-200" : ""
        }`}
      >
        <span aria-hidden="true" className="text-xl">{c.flag}</span>
        <span className="flex-1">{c.name}</span>
        <span className="text-sm text-ink-soft">{c.dialCode}</span>
      </button>
    </li>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.phone.countryLabel}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl"
      >
        <div className="flex items-center gap-2 border-b border-cream-200 p-3">
          <input
            ref={inputRef}
            type="search"
            placeholder={copy.phone.searchCountry}
            aria-label={copy.phone.searchCountry}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 rounded-xl border-2 border-cream-200 px-3 py-2 font-bold outline-none focus:border-pine-700"
          />
          <button type="button" onClick={onClose} className="px-2 py-2 text-sm font-bold text-ink-soft">
            {copy.sale.close}
          </button>
        </div>
        <ul className="flex-1 overflow-auto pb-[env(safe-area-inset-bottom)]">
          {top.map(row)}
          {top.length > 0 && rest.length > 0 && (
            <li role="separator" className="bg-cream-100 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide text-ink-soft">
              {copy.phone.otherCountries}
            </li>
          )}
          {rest.map(row)}
          {top.length === 0 && rest.length === 0 && (
            <li className="px-4 py-6 text-center text-ink-soft">{copy.phone.noCountries}</li>
          )}
        </ul>
      </div>
    </div>
  );
}
