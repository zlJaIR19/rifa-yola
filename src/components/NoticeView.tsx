"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { copy } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import { formatInternational } from "@/lib/phone";
import { padNumber } from "@/lib/raffle-config";
import { storageGet, storageRemove, storageSet, STORAGE_KEYS } from "@/lib/storage";
import type { DrawLinkSetting } from "@/lib/types";
import { isValidHttpsUrl } from "@/lib/validation";
import { drawNoticeLink } from "@/lib/whatsapp";
import { SectionTitle } from "./SectionTitle";
import { useToast } from "./Toast";

export type NoticeBuyer = { phone: string; buyerName: string; numbers: number[]; sellers: string[] };

const ALL = "__all__";

function readSent(): Set<string> {
  try {
    const raw = storageGet(STORAGE_KEYS.noticeSent);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function NoticeView({ buyers, initialLink }: { buyers: NoticeBuyer[]; initialLink: DrawLinkSetting }) {
  const toast = useToast();
  const [link, setLink] = useState<DrawLinkSetting>(initialLink);
  const [draft, setDraft] = useState(initialLink.url ?? "");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seller, setSeller] = useState(ALL);
  const [sent, setSent] = useState<Set<string>>(new Set());

  // Read per-device marks after hydration (localStorage is not available on the server).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSent(readSent());
    const saved = storageGet(STORAGE_KEYS.noticeSeller);
    if (saved && buyers.some((b) => b.sellers.includes(saved))) setSeller(saved);
  }, [buyers]);

  // Keep the link fresh for every device (it can be saved from another phone).
  const refreshLink = useCallback(async () => {
    try {
      const res = await fetch("/api/draw-link", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as DrawLinkSetting;
      setLink((prev) => {
        if (prev.url !== data.url) setDraft((d) => (d === (prev.url ?? "") ? data.url ?? "" : d));
        return data;
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => document.visibilityState === "visible" && refreshLink(), 30_000);
    const onVisible = () => document.visibilityState === "visible" && refreshLink();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshLink]);

  async function saveLink(e: React.FormEvent) {
    e.preventDefault();
    setLinkError(null);
    const url = draft.trim();
    if (!isValidHttpsUrl(url)) return setLinkError(copy.errors.urlInvalid);
    setSaving(true);
    try {
      const res = await fetch("/api/draw-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) return window.location.replace("/login");
      if (!res.ok) return setLinkError(data.error ?? copy.errors.generic);
      setLink({ url: data.url, updated_at: data.updated_at });
      setDraft(data.url);
      toast(copy.notice.saved, "success");
    } catch {
      setLinkError(copy.errors.network);
    } finally {
      setSaving(false);
    }
  }

  const sellerNames = useMemo(
    () => [...new Set(buyers.flatMap((b) => b.sellers))].sort((a, b) => a.localeCompare(b, "es")),
    [buyers],
  );
  const visible = useMemo(
    () => (seller === ALL ? buyers : buyers.filter((b) => b.sellers.includes(seller))),
    [buyers, seller],
  );
  const sentCount = visible.filter((b) => sent.has(b.phone)).length;

  function markSent(phone: string) {
    setSent((prev) => {
      const next = new Set(prev).add(phone);
      storageSet(STORAGE_KEYS.noticeSent, JSON.stringify([...next]));
      return next;
    });
  }

  function resetMarks() {
    if (!window.confirm(copy.notice.resetConfirm)) return;
    storageRemove(STORAGE_KEYS.noticeSent);
    setSent(new Set());
  }

  const hasLink = !!link.url;

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle>{copy.notice.title}</SectionTitle>
        <form onSubmit={saveLink} className="card space-y-2 p-4" noValidate>
          <label htmlFor="draw-link" className="block text-sm font-extrabold">
            {copy.notice.linkLabel}
          </label>
          <div className="flex gap-2">
            <input
              id="draw-link"
              type="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder={copy.notice.linkPlaceholder}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-invalid={!!linkError}
              className={`min-w-0 flex-1 rounded-xl border-2 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-pine-700 ${
                linkError ? "border-berry-600" : "border-cream-200"
              }`}
            />
            <button
              type="submit"
              disabled={saving}
              className="shrink-0 rounded-xl bg-berry-600 px-4 font-extrabold text-cream-100 shadow-[0_3px_0_var(--color-berry-700)] disabled:opacity-60"
            >
              {saving ? copy.notice.saving : copy.notice.save}
            </button>
          </div>
          {linkError && <p className="text-sm font-bold text-berry-700">{linkError}</p>}
          <p className="text-xs font-semibold text-ink-soft">
            {link.updated_at ? copy.notice.lastSaved(formatDateTime(link.updated_at)) : copy.notice.notSavedYet}
          </p>
        </form>
      </section>

      <section>
        <div className="card mb-3 space-y-2 p-3">
          <label htmlFor="seller-filter" className="block text-sm font-extrabold">
            {copy.notice.filterSeller}
          </label>
          <select
            id="seller-filter"
            value={seller}
            onChange={(e) => {
              setSeller(e.target.value);
              storageSet(STORAGE_KEYS.noticeSeller, e.target.value);
            }}
            className="w-full rounded-xl border-2 border-cream-200 bg-white px-3 py-2.5 font-bold outline-none focus:border-pine-700"
          >
            <option value={ALL}>{copy.notice.allSellers}</option>
            {sellerNames.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="flex items-center justify-between pt-1">
            <span className="font-black text-pine-800">{copy.notice.progress(sentCount, visible.length)}</span>
            <button type="button" onClick={resetMarks} className="text-sm font-bold text-berry-700 underline">
              {copy.notice.resetMarks}
            </button>
          </div>
          {!hasLink && (
            <p role="status" className="rounded-lg bg-gold-400/30 px-3 py-2 text-sm font-bold text-ink">
              {copy.notice.needLink}
            </p>
          )}
        </div>

        {visible.length === 0 ? (
          <p className="card p-6 text-center font-bold text-ink-soft">{copy.notice.empty}</p>
        ) : (
          <ul className="space-y-2">
            {visible.map((b) => {
              const nums = b.numbers.map(padNumber);
              const isSent = sent.has(b.phone);
              return (
                <li key={b.phone} className={`card flex items-center gap-3 px-3 py-2.5 ${isSent ? "opacity-80" : ""}`}>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-extrabold">{b.buyerName}</p>
                    <p className="font-semibold text-ink-soft">{formatInternational(b.phone)}</p>
                    <p className="font-bold">
                      <span className="text-ink-soft">{copy.notice.numbersLabel(nums.length)}: </span>
                      <span className="text-berry-700">{nums.join(", ")}</span>
                    </p>
                    <p className="truncate text-xs font-semibold text-pine-800">{b.sellers.join(", ")}</p>
                  </div>
                  {hasLink ? (
                    <a
                      href={drawNoticeLink({ phone: b.phone, buyerName: b.buyerName, numbers: nums, drawLink: link.url! })}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => markSent(b.phone)}
                      className={`shrink-0 rounded-xl px-3 py-2.5 text-center text-sm font-extrabold ${
                        isSent
                          ? "border-2 border-wa bg-white text-wa-dark"
                          : "bg-wa text-white shadow-[0_3px_0_var(--color-wa-dark)]"
                      }`}
                    >
                      {isSent ? copy.notice.sent : copy.notice.send}
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title={copy.notice.needLink}
                      className="shrink-0 cursor-not-allowed rounded-xl bg-wa/40 px-3 py-2.5 text-sm font-extrabold text-white"
                    >
                      {copy.notice.send}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
