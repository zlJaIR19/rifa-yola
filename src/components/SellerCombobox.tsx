"use client";

import { useId, useMemo, useState } from "react";
import { copy } from "@/lib/copy";
import { canonicalSellerName, normalizeName, searchKey } from "@/lib/seller";

type Props = {
  value: string;
  onChange: (value: string) => void;
  sellers: string[];
  error?: string | null;
  autoFocus?: boolean;
};

/** Text input that suggests seller names already used and reuses their exact spelling. */
export function SellerCombobox({ value, onChange, sellers, error, autoFocus }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const id = useId();
  const listId = `${id}-list`;

  const matches = useMemo(() => {
    const q = searchKey(normalizeName(value));
    const list = q ? sellers.filter((s) => searchKey(s).includes(q)) : sellers;
    return list.slice(0, 8);
  }, [value, sellers]);

  const exact = sellers.some(
    (s) => s.toLocaleLowerCase("es") === normalizeName(value).toLocaleLowerCase("es"),
  );
  const showNew = normalizeName(value).length >= 2 && !exact;

  function pick(name: string) {
    onChange(name);
    setOpen(false);
    setActive(-1);
  }

  function onBlur() {
    // Delay so a tap on a suggestion is not lost.
    setTimeout(() => {
      setOpen(false);
      if (value) onChange(canonicalSellerName(value, sellers));
    }, 150);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? matches.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(matches[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1 block text-sm font-extrabold">
        {copy.sale.sellerLabel}
      </label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={!!error}
        autoComplete="off"
        autoCapitalize="words"
        autoFocus={autoFocus}
        maxLength={40}
        placeholder={copy.sale.sellerPlaceholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={`w-full rounded-xl border-2 bg-white px-3 py-2.5 text-base font-bold outline-none focus:border-pine-700 ${
          error ? "border-berry-600" : "border-cream-200"
        }`}
      />
      {open && (matches.length > 0 || showNew) && (
        <ul
          id={listId}
          role="listbox"
          aria-label={copy.combobox.suggestions}
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border-2 border-gold-400 bg-white py-1 shadow-xl"
        >
          {matches.map((s, i) => (
            <li
              key={s}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s)}
              className={`cursor-pointer px-3 py-2 font-bold ${i === active ? "bg-cream-100" : ""}`}
            >
              {s}
            </li>
          ))}
          {showNew && (
            <li
              role="option"
              aria-selected={false}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(normalizeName(value))}
              className="cursor-pointer border-t border-cream-200 px-3 py-2 text-sm font-semibold text-ink-soft"
            >
              {copy.combobox.useNew(normalizeName(value))}
            </li>
          )}
        </ul>
      )}
      {error ? (
        <p className="mt-1 text-sm font-bold text-berry-700">{error}</p>
      ) : (
        <p className="mt-1 text-xs text-ink-soft">{copy.sale.sellerHint}</p>
      )}
    </div>
  );
}
