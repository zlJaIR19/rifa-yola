import type { Metadata } from "next";
import { SectionTitle } from "@/components/SectionTitle";
import { copy } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import { formatInternational } from "@/lib/phone";
import { padNumber } from "@/lib/raffle-config";
import { getHistory } from "@/lib/server/data";
import type { ActivityEntry } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `${copy.history.title} | ${copy.meta.title}` };

const LIMIT = 500;

const actionStyle: Record<ActivityEntry["action"], string> = {
  sell: "bg-pine-700 text-cream-100",
  edit: "bg-gold-400 text-ink",
  release: "bg-berry-600 text-cream-100",
  draw_link: "bg-ink text-cream-100",
};

const FIELD_ORDER = ["seller_name", "buyer_name", "phone", "sold_at", "draw_link"];

function display(field: string, value: unknown): string {
  if (value == null || value === "") return "";
  const s = String(value);
  if (field === "phone") return formatInternational(s);
  if (field === "sold_at") return formatDateTime(s);
  return s;
}

function Changes({ entry }: { entry: ActivityEntry }) {
  const oldV = entry.old_values ?? {};
  const newV = entry.new_values ?? {};
  const fields = FIELD_ORDER.filter((f) => f in oldV || f in newV);
  if (fields.length === 0) return null;
  return (
    <dl className="mt-2 space-y-1 text-sm">
      {fields.map((f) => {
        const before = display(f, oldV[f]);
        const after = display(f, newV[f]);
        const wrap = f === "phone" ? "whitespace-nowrap" : f === "draw_link" ? "break-all" : "";
        return (
          <div key={f} className="grid grid-cols-[6.5rem_1fr] gap-2">
            <dt className="font-extrabold text-ink-soft">{copy.history.fields[f] ?? f}</dt>
            <dd className="min-w-0 break-words font-semibold">
              {entry.action === "edit" || (entry.action === "draw_link" && before) ? (
                <>
                  <span className={`${wrap} text-ink-soft line-through decoration-berry-600/60`}>{before || "-"}</span>
                  <span aria-hidden="true" className="mx-1 text-gold-600">→</span>
                  <span className="sr-only">{copy.history.after}: </span>
                  <span className={wrap}>{after || "-"}</span>
                </>
              ) : (
                <span className={`${wrap} ${entry.action === "release" ? "text-ink-soft" : ""}`}>{after || before}</span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export default async function HistoryPage() {
  const entries = await getHistory(LIMIT);
  return (
    <div>
      <SectionTitle as="h2">{copy.history.title}</SectionTitle>
      <p className="mb-3 text-center text-sm font-semibold text-cream-100/90">{copy.history.subtitle}</p>
      {entries.length === 0 ? (
        <p className="card p-6 text-center font-bold text-ink-soft">{copy.history.empty}</p>
      ) : (
        <ol className="space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="card px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${actionStyle[e.action]}`}>
                  {copy.history.actions[e.action] ?? e.action}
                </span>
                {e.number != null && (
                  <span className="font-black text-berry-700">{copy.history.number(padNumber(e.number))}</span>
                )}
                <time dateTime={e.created_at} className="ml-auto text-xs font-bold text-ink-soft">
                  {formatDateTime(e.created_at)}
                </time>
              </div>
              <Changes entry={e} />
            </li>
          ))}
        </ol>
      )}
      {entries.length >= LIMIT && (
        <p className="mt-3 text-center text-xs font-semibold text-cream-100/80">{copy.history.showingLast(LIMIT)}</p>
      )}
    </div>
  );
}
