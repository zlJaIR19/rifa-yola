"use client";

import { useState } from "react";
import { copy } from "@/lib/copy";
import { DEFAULT_COUNTRY, parsePhone, type CountryCode } from "@/lib/phone";
import { canonicalSellerName } from "@/lib/seller";
import { validateSaleInput } from "@/lib/validation";
import { PhoneInput } from "./PhoneInput";
import { SellerCombobox } from "./SellerCombobox";

export type SaleFormValues = { sellerName: string; buyerName: string; phone: string };
export type SaleFormError = { message: string; field?: string } | null;

type Props = {
  initial?: { sellerName: string; buyerName: string; phoneNational: string; country: CountryCode };
  sellers: string[];
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (values: SaleFormValues) => Promise<SaleFormError>;
  onCancel: () => void;
  disabled?: boolean;
};

export function SaleForm({ initial, sellers, submitLabel, submittingLabel, onSubmit, onCancel, disabled }: Props) {
  const [sellerName, setSellerName] = useState(initial?.sellerName ?? "");
  const [buyerName, setBuyerName] = useState(initial?.buyerName ?? "");
  const [phone, setPhone] = useState(initial?.phoneNational ?? "");
  const [country, setCountry] = useState<CountryCode>(initial?.country ?? DEFAULT_COUNTRY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);

    const parsed = parsePhone(phone, country);
    const seller = canonicalSellerName(sellerName, sellers);
    const check = validateSaleInput({
      sellerName: seller,
      buyerName,
      phone: parsed.ok ? parsed.e164 : phone.trim() ? "invalid" : "",
    });
    if (!check.ok) {
      setErrors({ [check.field]: check.error });
      return;
    }
    setSellerName(check.value.sellerName);

    setSubmitting(true);
    const result = await onSubmit(check.value);
    setSubmitting(false);
    if (result) {
      if (result.field) setErrors({ [result.field]: result.message });
      else setFormError(result.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <SellerCombobox
        value={sellerName}
        onChange={setSellerName}
        sellers={sellers}
        error={errors.sellerName}
      />
      <div>
        <label htmlFor="buyer-name" className="mb-1 block text-sm font-extrabold">
          {copy.sale.buyerLabel}
        </label>
        <input
          id="buyer-name"
          autoComplete="off"
          autoCapitalize="words"
          maxLength={80}
          placeholder={copy.sale.buyerPlaceholder}
          aria-invalid={!!errors.buyerName}
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          className={`w-full rounded-xl border-2 bg-white px-3 py-2.5 text-base font-bold outline-none focus:border-pine-700 ${
            errors.buyerName ? "border-berry-600" : "border-cream-200"
          }`}
        />
        {errors.buyerName && <p className="mt-1 text-sm font-bold text-berry-700">{errors.buyerName}</p>}
      </div>
      <PhoneInput
        value={phone}
        country={country}
        onChange={setPhone}
        onCountryChange={setCountry}
        error={errors.phone}
      />
      {formError && (
        <p role="alert" className="rounded-xl bg-berry-600 px-3 py-2.5 text-center font-extrabold text-cream-100">
          {formError}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border-2 border-cream-200 bg-white py-3 font-extrabold text-ink-soft"
        >
          {copy.sale.cancel}
        </button>
        <button
          type="submit"
          disabled={submitting || disabled}
          className="flex-[2] rounded-xl bg-berry-600 py-3 text-lg font-extrabold text-cream-100 shadow-[0_4px_0_var(--color-berry-700)] active:translate-y-0.5 active:shadow-none disabled:opacity-60"
        >
          {submitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
