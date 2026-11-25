import type { Metadata } from "next";
import { SummaryView } from "@/components/SummaryView";
import { copy } from "@/lib/copy";
import { getSales } from "@/lib/server/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `${copy.summary.title} | ${copy.meta.title}` };

export default async function SummaryPage() {
  const sales = await getSales();
  return <SummaryView sales={sales} />;
}
