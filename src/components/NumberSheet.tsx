"use client";

import { useCallback, useEffect, useState } from "react";
import { copy } from "@/lib/copy";
import { formatDateTime, parseTimestamp } from "@/lib/format";
import { formatInternational, splitForEdit } from "@/lib/phone";
import { padNumber } from "@/lib/raffle-config";
import { storageSet, STORAGE_KEYS } from "@/lib/storage";
import type { BoardNumber, SaleDetail } from "@/lib/types";
import { SaleForm, type SaleFormError, type SaleFormValues } from "./SaleForm";
import { TicketActions } from "./TicketActions";
import { useToast } from "./Toast";

type Mode = "sell" | "detail" | "edit" | "release";

/** Timestamps arrive in slightly different string formats (RPC, REST, Realtime). */
function sameTime(a: string | null, b: string | null): boolean {
  if (!a || !b) return a === b;
  return parseTimestamp(a) === parseTimestamp(b);
}

type Props = {
  entry: BoardNumber;
  sellers: string[];
  defaultSeller: string;
  onClose: () => void;
  /** Apply a change locally right away (Realtime will confirm it). */
  onBoardChange: (entry: BoardNumber) => void;
  onSellersChanged: () => void;
};

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; error: string; field?: string; code?: string; status: number }> {
  try {
    const res = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...init?.headers } });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      window.location.replace("/login");
      return { ok: false, error: copy.errors.unauthorized, status: 401 };
    }
    if (!res.ok) return { ok: false, error: data.error ?? copy.errors.generic, field: data.field, code: data.code, status: res.status };
    return { ok: true, data };
  } catch {
    return { ok: false, error: copy.errors.network, status: 0 };
  }
}

export function NumberSheet({ entry, sellers, defaultSeller, onClose, onBoardChange, onSellersChanged }: Props) {
  const toast = useToast();
  const num = padNumber(entry.number);
  const isSold = !!entry.sold_at;
  const [mode, setMode] = useState<Mode>(isSold ? "detail" : "sell");
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(isSold);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [justSold, setJustSold] = useState(false);
  const [releasing, setReleasing] = useState(false);

  // No synchronous setState before the first await (safe to call from effects).
  const loadDetail = useCallback(async () => {
    const r = await api<{ sale: SaleDetail | null }>(`/api/numbers/${entry.number}`);
    setLoading(false);
    if (!r.ok) return setLoadError(r.error);
    setLoadError(null);
    if (!r.data.sale) {
      // Released by someone else in the meantime.
      setSale(null);
      setMode("sell");
      onBoardChange({ number: entry.number, seller_name: null, sold_at: null });
      return;
    }
    setSale(r.data.sale);
  }, [entry.number, onBoardChange]);

  function retryLoad() {
    setLoading(true);
    setLoadError(null);
    loadDetail();
  }

  // Someone else released this number while its detail is open: switch to the sale form.
  const [seenSoldAt, setSeenSoldAt] = useState(entry.sold_at);
  if (entry.sold_at !== seenSoldAt) {
    setSeenSoldAt(entry.sold_at);
    if (!entry.sold_at && mode === "detail") {
      setSale(null);
      setMode("sell");
      setJustSold(false);
    }
  }

  // Load the detail on open, and reload it when someone else re-sold or edited the number.
  const needsLoad =
    mode === "detail" &&
    !!entry.sold_at &&
    (!sale || !sameTime(entry.sold_at, sale.sold_at) || entry.seller_name !== sale.seller_name);
  useEffect(() => {
    // Async fetch: state is only set after the response arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (needsLoad) loadDetail();
  }, [needsLoad, entry.sold_at, entry.seller_name, loadDetail]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function sell(values: SaleFormValues): Promise<SaleFormError> {
    const r = await api<{ sale: SaleDetail }>(`/api/numbers/${entry.number}`, {
      method: "POST",
      body: JSON.stringify(values),
    });
    if (!r.ok) {
      // On "already_sold" the message names the winning seller; Realtime paints the board.
      return { message: r.error, field: r.field };
    }
    const s = r.data.sale;
    storageSet(STORAGE_KEYS.lastSeller, s.seller_name);
    setSale(s);
    setJustSold(true);
    setMode("detail");
    onBoardChange({ number: s.number, seller_name: s.seller_name, sold_at: s.sold_at });
    onSellersChanged();
    toast(copy.sale.success(num), "success");
    return null;
  }

  async function edit(values: SaleFormValues): Promise<SaleFormError> {
    const r = await api<{ sale: SaleDetail; changed: boolean }>(`/api/numbers/${entry.number}`, {
      method: "PATCH",
      body: JSON.stringify(values),
    });
    if (!r.ok) {
      if (r.code === "not_sold") {
        setSale(null);
        setMode("sell");
        onBoardChange({ number: entry.number, seller_name: null, sold_at: null });
      }
      return { message: r.error, field: r.field };
    }
    setSale(r.data.sale);
    setMode("detail");
    onBoardChange({ number: entry.number, seller_name: r.data.sale.seller_name, sold_at: r.data.sale.sold_at });
    onSellersChanged();
    toast(r.data.changed ? copy.sale.editSaved : copy.sale.editNoChanges, "success");
    return null;
  }

  async function release() {
    if (!sale) return;
    setReleasing(true);
    const r = await api<{ ok: true }>(
      `/api/numbers/${entry.number}?soldAt=${encodeURIComponent(sale.sold_at)}`,
      { method: "DELETE" },
    );
    setReleasing(false);
    if (!r.ok) {
      toast(r.error, "error");
      setMode("detail");
      if (r.code === "changed") retryLoad();
      return;
    }
    onBoardChange({ number: entry.number, seller_name: null, sold_at: null });
    toast(copy.sale.released(num), "success");
    onClose();
  }

  const editInitial = sale
    ? (() => {
        const { country, national } = splitForEdit(sale.phone);
        return { sellerName: sale.seller_name, buyerName: sale.buyer_name, phoneNational: national, country };
      })()
    : undefined;

  const sold = mode !== "sell";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t-4 border-gold-400 bg-cream-100 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:border-4"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black shadow-inner ${
                sold ? "bg-berry-600 text-cream-100" : "border-2 border-dashed border-berry-600 bg-white text-berry-600"
              }`}
            >
              {num}
            </div>
            <div>
              <h2 id="sheet-title" className="font-script text-2xl leading-tight text-pine-800">
                {mode === "edit" ? copy.sale.editTitle(num) : copy.sale.titleFree(num)}
              </h2>
              <span
                className={`mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                  sold ? "bg-berry-600/15 text-berry-700" : "bg-pine-700/15 text-pine-800"
                }`}
              >
                {sold ? copy.sale.soldBadge : copy.sale.freeBadge}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.sale.close}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl font-bold text-ink-soft shadow"
          >
            ×
          </button>
        </div>

        {mode === "sell" && (
          <SaleForm
            key={`sell-${entry.number}`}
            initial={{ sellerName: defaultSeller, buyerName: "", phoneNational: "", country: "PE" }}
            sellers={sellers}
            submitLabel={copy.sale.confirm}
            submittingLabel={copy.sale.confirming}
            onSubmit={sell}
            onCancel={onClose}
          />
        )}

        {mode === "detail" && (
          <div>
            {loading && <p className="py-8 text-center font-bold text-ink-soft">{copy.sale.loadingDetail}</p>}
            {loadError && (
              <div className="py-6 text-center">
                <p className="font-bold text-berry-700">{loadError}</p>
                <button type="button" onClick={retryLoad} className="mt-3 rounded-xl bg-white px-4 py-2 font-bold shadow">
                  {copy.common.retry}
                </button>
              </div>
            )}
            {sale && !loading && (
              <div className="space-y-4">
                {justSold && (
                  <div className="rounded-xl bg-pine-800 px-3 py-2.5 text-center text-cream-100">
                    <p className="font-extrabold">🎉 {copy.sale.success(num)}</p>
                    <p className="text-sm">{copy.sale.successHint}</p>
                  </div>
                )}
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-2xl bg-white p-3 text-sm shadow-sm">
                  <dt className="font-extrabold text-ink-soft">{copy.sale.buyer}</dt>
                  <dd className="font-bold break-words">{sale.buyer_name}</dd>
                  <dt className="font-extrabold text-ink-soft">{copy.sale.phone}</dt>
                  <dd className="font-bold">{formatInternational(sale.phone)}</dd>
                  <dt className="font-extrabold text-ink-soft">{copy.sale.seller}</dt>
                  <dd className="font-bold break-words">{sale.seller_name}</dd>
                  <dt className="font-extrabold text-ink-soft">{copy.sale.date}</dt>
                  <dd className="font-bold">{formatDateTime(sale.sold_at)}</dd>
                </dl>
                <TicketActions sale={sale} />
                <div className="flex gap-2 border-t border-cream-200 pt-3">
                  <button
                    type="button"
                    onClick={() => setMode("edit")}
                    className="flex-1 rounded-xl border-2 border-pine-700 bg-white py-2.5 font-extrabold text-pine-800"
                  >
                    {copy.sale.edit}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("release")}
                    className="flex-1 rounded-xl border-2 border-berry-600 bg-white py-2.5 font-extrabold text-berry-700"
                  >
                    {copy.sale.release}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === "edit" && sale && (
          <SaleForm
            key={`edit-${entry.number}-${sale.sold_at}`}
            initial={editInitial}
            sellers={sellers}
            submitLabel={copy.sale.saveEdit}
            submittingLabel={copy.sale.saving}
            onSubmit={edit}
            onCancel={() => setMode("detail")}
          />
        )}

        {mode === "release" && sale && (
          <div role="alertdialog" aria-labelledby="release-title" className="space-y-4">
            <h3 id="release-title" className="text-xl font-black text-berry-700">
              {copy.sale.releaseTitle(num)}
            </h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-2xl bg-white p-3 text-sm shadow-sm">
              <dt className="font-extrabold text-ink-soft">{copy.sale.buyer}</dt>
              <dd className="font-bold break-words">{sale.buyer_name}</dd>
              <dt className="font-extrabold text-ink-soft">{copy.sale.phone}</dt>
              <dd className="font-bold">{formatInternational(sale.phone)}</dd>
              <dt className="font-extrabold text-ink-soft">{copy.sale.seller}</dt>
              <dd className="font-bold break-words">{sale.seller_name}</dd>
            </dl>
            <p className="text-sm font-semibold text-ink-soft">{copy.sale.releaseBody}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("detail")}
                className="flex-1 rounded-xl border-2 border-cream-200 bg-white py-3 font-extrabold text-ink-soft"
              >
                {copy.sale.cancel}
              </button>
              <button
                type="button"
                onClick={release}
                disabled={releasing}
                className="flex-1 rounded-xl bg-berry-600 py-3 font-extrabold text-cream-100 shadow-[0_4px_0_var(--color-berry-700)] disabled:opacity-60"
              >
                {releasing ? copy.sale.releasing : copy.sale.releaseConfirm}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
