"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { copy } from "@/lib/copy";
import { padNumber, TOTAL_NUMBERS } from "@/lib/raffle-config";
import { sellerInitials } from "@/lib/seller";
import { storageGet, STORAGE_KEYS } from "@/lib/storage";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { BoardNumber } from "@/lib/types";
import { NumberSheet } from "./NumberSheet";

type Filter = "all" | "free" | "sold";
type LiveState = "connecting" | "live" | "offline";

const RESYNC_AFTER_CONNECT_MS = 2_000;
const RESYNC_INTERVAL_MS = 30_000;

/** Rows above TOTAL_NUMBERS (e.g. left over in the database) are ignored. */
function inRange(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= TOTAL_NUMBERS;
}

function emptyBoard(): BoardNumber[] {
  return Array.from({ length: TOTAL_NUMBERS }, (_, i) => ({ number: i + 1, seller_name: null, sold_at: null }));
}

async function fetchBoard(): Promise<BoardNumber[]> {
  // Read with the anon key (RLS allows reading raffle_numbers only).
  const { data, error } = await supabaseBrowser()
    .from("raffle_numbers")
    .select("number, seller_name, sold_at")
    .lte("number", TOTAL_NUMBERS)
    .order("number");
  if (!error && data) return data as BoardNumber[];
  // Fallback through the server.
  const res = await fetch("/api/board", { cache: "no-store" });
  if (res.status === 401) {
    window.location.replace("/login");
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error("board");
  return (await res.json()).numbers as BoardNumber[];
}

export function Board({ initial }: { initial: BoardNumber[] | null }) {
  const [numbers, setNumbers] = useState<BoardNumber[]>(() => {
    const base = emptyBoard();
    initial?.forEach((n) => {
      if (inRange(n.number)) base[n.number - 1] = n;
    });
    return base;
  });
  const [loaded, setLoaded] = useState(!!initial);
  const [loadError, setLoadError] = useState(false);
  const [live, setLive] = useState<LiveState>("connecting");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [openNumber, setOpenNumber] = useState<number | null>(null);
  const [sellers, setSellers] = useState<string[]>([]);
  const cellRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const applyRow = useCallback((row: BoardNumber) => {
    if (!row || !inRange(row.number)) return;
    setNumbers((prev) => {
      const next = prev.slice();
      next[row.number - 1] = { number: row.number, seller_name: row.seller_name, sold_at: row.sold_at };
      return next;
    });
  }, []);

  const resync = useCallback(async () => {
    try {
      const rows = await fetchBoard();
      const base = emptyBoard();
      rows.forEach((r) => {
        if (inRange(r.number)) base[r.number - 1] = r;
      });
      setNumbers(base);
      setLoaded(true);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  const loadSellers = useCallback(async () => {
    try {
      const res = await fetch("/api/sellers", { cache: "no-store" });
      if (res.ok) setSellers((await res.json()).sellers ?? []);
    } catch {
      // suggestions are optional
    }
  }, []);

  // Realtime subscription + safety re-syncs.
  useEffect(() => {
    let connectTimer: ReturnType<typeof setTimeout> | undefined;
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel("raffle-numbers")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "raffle_numbers" },
        (payload) => applyRow(payload.new as BoardNumber),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setLive("live");
          clearTimeout(connectTimer);
          connectTimer = setTimeout(resync, RESYNC_AFTER_CONNECT_MS);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setLive("offline");
        }
      });

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") resync();
    }, RESYNC_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") resync();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", resync);

    const firstLoad = initial ? undefined : setTimeout(resync, 0);

    return () => {
      clearTimeout(connectTimer);
      clearTimeout(firstLoad);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", resync);
      supabase.removeChannel(channel);
    };
  }, [applyRow, resync, initial]);

  useEffect(() => {
    // Async fetch: state is only set after the response arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSellers();
  }, [loadSellers]);

  const soldCount = useMemo(() => numbers.filter((n) => n.sold_at).length, [numbers]);
  const visible = useMemo(
    () =>
      numbers.filter((n) => (filter === "all" ? true : filter === "free" ? !n.sold_at : !!n.sold_at)),
    [numbers, filter],
  );

  function jumpTo(e?: React.FormEvent) {
    e?.preventDefault();
    const n = Number(search.trim());
    if (!Number.isInteger(n) || n < 1 || n > TOTAL_NUMBERS) {
      setSearchError(copy.board.searchNotFound);
      return;
    }
    setSearchError(null);
    const entry = numbers[n - 1];
    const fits = filter === "all" || (filter === "free" ? !entry.sold_at : !!entry.sold_at);
    if (!fits) setFilter("all");
    setHighlight(n);
    requestAnimationFrame(() => {
      cellRefs.current.get(n)?.scrollIntoView({ behavior: "smooth", block: "center" });
      cellRefs.current.get(n)?.focus({ preventScroll: true });
    });
    setTimeout(() => setHighlight((h) => (h === n ? null : h)), 2500);
  }

  const openEntry = openNumber ? numbers[openNumber - 1] : null;

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: copy.board.filterAll },
    { key: "free", label: copy.board.filterFree },
    { key: "sold", label: copy.board.filterSold },
  ];

  return (
    <div>
      {/* Counters */}
      <div className="card sticky top-0 z-20 -mx-1 mb-3 px-3 pt-3 pb-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 whitespace-nowrap">
            <span className="text-base font-black text-berry-700">{copy.board.sold(soldCount, TOTAL_NUMBERS)}</span>
            <span className="text-sm font-extrabold text-pine-800">{copy.board.free(TOTAL_NUMBERS - soldCount)}</span>
          </div>
          <span
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
              live === "live" ? "bg-pine-700/15 text-pine-800" : "bg-gold-400/30 text-ink-soft"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${live === "live" ? "animate-pulse bg-pine-600" : "bg-gold-600"}`}
            />
            {live === "live" ? copy.board.live : copy.board.reconnecting}
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cream-200" aria-hidden="true">
          <div
            className="h-full rounded-full bg-gradient-to-r from-berry-600 to-gold-400 transition-[width] duration-500"
            style={{ width: `${(soldCount / TOTAL_NUMBERS) * 100}%` }}
          />
        </div>

        <div className="mt-2.5 flex gap-2">
          <div role="radiogroup" aria-label={copy.board.filterAll} className="flex shrink-0 rounded-xl bg-cream-200 p-0.5">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-extrabold ${
                  filter === f.key ? "bg-pine-800 text-cream-100 shadow" : "text-ink-soft"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <form onSubmit={jumpTo} className="flex min-w-0 flex-1">
            <label htmlFor="jump" className="sr-only">
              {copy.board.searchLabel}
            </label>
            <input
              id="jump"
              type="search"
              inputMode="numeric"
              enterKeyHint="go"
              placeholder={copy.board.searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value.replace(/\D/g, "").slice(0, 3));
                setSearchError(null);
              }}
              className="w-full min-w-0 rounded-l-xl border-2 border-r-0 border-cream-200 bg-white px-2.5 py-1.5 text-sm font-bold outline-none focus:border-pine-700"
            />
            <button
              type="submit"
              aria-label={copy.board.searchLabel}
              className="rounded-r-xl bg-pine-800 px-3 text-cream-100"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[3]">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
            </button>
          </form>
        </div>
        {searchError && <p className="mt-1 text-xs font-bold text-berry-700">{searchError}</p>}
      </div>

      {/* Legend */}
      <div className="mb-2 flex items-center justify-center gap-4 text-xs font-bold text-cream-100">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3.5 w-3.5 rounded bg-cream-50 ring-1 ring-cream-200" />
          {copy.board.legendFree}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3.5 w-3.5 rounded bg-berry-600" />
          {copy.board.legendSold}
        </span>
      </div>

      {loadError && !loaded && (
        <div className="card p-4 text-center">
          <p className="font-bold text-berry-700">{copy.board.loadError}</p>
          <button type="button" onClick={resync} className="mt-2 rounded-xl bg-pine-800 px-4 py-2 font-bold text-cream-100">
            {copy.common.retry}
          </button>
        </div>
      )}
      {!loaded && !loadError && <p className="py-10 text-center font-bold text-cream-100">{copy.board.loading}</p>}

      {loaded && (
        <>
          {visible.length === 0 ? (
            <p className="card p-6 text-center font-bold text-ink-soft">{copy.board.emptyFilter}</p>
          ) : (
            <ul className="grid grid-cols-5 gap-1.5 min-[400px]:grid-cols-6 sm:grid-cols-8 md:grid-cols-10">
              {visible.map((n) => {
                const sold = !!n.sold_at;
                const label = padNumber(n.number);
                return (
                  <li key={n.number}>
                    <button
                      ref={(el) => {
                        if (el) cellRefs.current.set(n.number, el);
                        else cellRefs.current.delete(n.number);
                      }}
                      type="button"
                      onClick={() => setOpenNumber(n.number)}
                      aria-label={copy.board.numberAria(label, n.seller_name)}
                      className={`relative flex aspect-square w-full flex-col items-center justify-center rounded-xl leading-none transition active:scale-95 ${
                        sold
                          ? "bg-berry-600 text-cream-100 shadow-[inset_0_-3px_0_var(--color-berry-700)]"
                          : "bg-cream-50 text-pine-900 shadow-[inset_0_-3px_0_var(--color-cream-200)]"
                      } ${highlight === n.number ? "z-10 scale-110 ring-4 ring-gold-400" : ""}`}
                    >
                      <span className={`font-black ${sold ? "text-[13px] opacity-90" : "text-base"}`}>{label}</span>
                      {sold && (
                        <span className="mt-0.5 rounded bg-black/15 px-1 text-[11px] font-black tracking-wide text-gold-300">
                          {sellerInitials(n.seller_name)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {openEntry && (
        <NumberSheet
          key={openEntry.number}
          entry={openEntry}
          sellers={sellers}
          defaultSeller={storageGet(STORAGE_KEYS.lastSeller) ?? ""}
          onClose={() => setOpenNumber(null)}
          onBoardChange={applyRow}
          onSellersChanged={loadSellers}
        />
      )}
    </div>
  );
}
