import type { Metadata } from "next";
import { NoticeView, type NoticeBuyer } from "@/components/NoticeView";
import { copy } from "@/lib/copy";
import { parseTimestamp } from "@/lib/format";
import { getDrawLink, getSales } from "@/lib/server/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `${copy.notice.title} | ${copy.meta.title}` };

export default async function NoticePage() {
  const [sales, drawLink] = await Promise.all([getSales(), getDrawLink()]);

  // One row per buyer phone, with all their numbers.
  const groups = new Map<string, NoticeBuyer>();
  const latest = new Map<string, number>();
  for (const s of sales) {
    const t = parseTimestamp(s.sold_at);
    const g = groups.get(s.phone);
    if (!g) {
      groups.set(s.phone, { phone: s.phone, buyerName: s.buyer_name, numbers: [s.number], sellers: [s.seller_name] });
      latest.set(s.phone, t);
    } else {
      g.numbers.push(s.number);
      if (!g.sellers.includes(s.seller_name)) g.sellers.push(s.seller_name);
      if (t > (latest.get(s.phone) ?? 0)) {
        latest.set(s.phone, t);
        g.buyerName = s.buyer_name;
      }
    }
  }
  const buyers: NoticeBuyer[] = [...groups.values()]
    .map((b) => ({ ...b, numbers: b.numbers.sort((x, y) => x - y) }))
    .sort((a, b) => a.buyerName.localeCompare(b.buyerName, "es"));

  return <NoticeView buyers={buyers} initialLink={drawLink} />;
}
