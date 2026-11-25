"use client";

import { useMemo, useState } from "react";
import { copy } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import { formatInternational } from "@/lib/phone";
import { padNumber, TOTAL_NUMBERS } from "@/lib/raffle-config";
import type { SaleRow } from "@/lib/types";
import { SectionTitle } from "./SectionTitle";

type Sort = "number" | "seller";

export function SummaryView({ sales }: { sales: SaleRow[] }) {
  const [sort, setSort] = useState<Sort>("number");

  const bySeller = useMemo(() => {
    const counts = new Map<string, number>();
    sales.forEach((s) => counts.set(s.seller_name, (counts.get(s.seller_name) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
  }, [sales]);

  const sorted = useMemo(() => {
    const list = sales.slice();
    if (sort === "number") list.sort((a, b) => a.number - b.number);
    else list.sort((a, b) => a.seller_name.localeCompare(b.seller_name, "es") || a.number - b.number);
    return list;
  }, [sales, sort]);

  const max = bySeller[0]?.[1] ?? 1;

  return (
    <div className="space-y-6">
      <div className="card p-4 text-center">
        <p className="font-script text-3xl text-pine-800">{copy.summary.totals(sales.length, TOTAL_NUMBERS)}</p>
        <a
          href="/api/export"
          download={copy.csv.fileName}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-pine-800 px-4 py-2.5 font-extrabold text-cream-100 shadow-[0_4px_0_var(--color-pine-950)] active:translate-y-0.5 active:shadow-none"
        >
          <span aria-hidden="true">⬇️</span>
          {copy.summary.exportCsv}
        </a>
      </div>

      <section>
        <SectionTitle>{copy.summary.bySeller}</SectionTitle>
        <div className="card p-3">
          {bySeller.length === 0 ? (
            <p className="py-4 text-center font-bold text-ink-soft">{copy.summary.noSales}</p>
          ) : (
            <ol className="space-y-2">
              {bySeller.map(([name, count], i) => (
                <li key={name} className="rounded-xl bg-white px-3 py-2 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 font-extrabold">
                      <span aria-hidden="true" className="w-5 shrink-0 text-center">
                        {i === 0 ? "⭐" : i + 1}
                      </span>
                      <span className="truncate">{name}</span>
                    </span>
                    <span className="shrink-0 font-black text-berry-700">{copy.summary.numbersCount(count)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream-200" aria-hidden="true">
                    <div className="h-full rounded-full bg-berry-600" style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <section>
        <SectionTitle>{copy.summary.allSales}</SectionTitle>
        <div className="card overflow-hidden">
          <div className="flex items-center justify-end gap-2 border-b border-cream-200 px-3 py-2 text-sm">
            <span className="font-bold text-ink-soft">{copy.summary.sortBy}</span>
            {(["number", "seller"] as Sort[]).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={sort === s}
                onClick={() => setSort(s)}
                className={`rounded-lg px-2.5 py-1 font-extrabold ${
                  sort === s ? "bg-pine-800 text-cream-100" : "bg-white text-ink-soft"
                }`}
              >
                {s === "number" ? copy.summary.sortNumber : copy.summary.sortSeller}
              </button>
            ))}
          </div>
          {sorted.length === 0 ? (
            <p className="p-6 text-center font-bold text-ink-soft">{copy.summary.noSales}</p>
          ) : (
            <ul className="divide-y divide-cream-200">
              {sorted.map((s) => (
                <li key={s.number} className="flex gap-3 px-3 py-2.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-berry-600 text-sm font-black text-cream-100">
                    {padNumber(s.number)}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-extrabold">{s.buyer_name}</p>
                    <p className="font-semibold text-ink-soft">{formatInternational(s.phone)}</p>
                    <p className="text-xs font-semibold text-ink-soft">
                      <span className="font-extrabold text-pine-800">{s.seller_name}</span>
                      {" · "}
                      {formatDateTime(s.sold_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
