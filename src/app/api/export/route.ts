import { NextResponse } from "next/server";
import { copy } from "@/lib/copy";
import { toCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/format";
import { formatInternational } from "@/lib/phone";
import { padNumber } from "@/lib/raffle-config";
import { requireSession } from "@/lib/server/auth";
import { getAllNumbersWithBuyers } from "@/lib/server/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  try {
    const all = await getAllNumbersWithBuyers();
    const rows = all.map((r) => {
      const sold = !!r.sold_at;
      return [
        padNumber(r.number),
        sold ? copy.csv.statusSold : copy.csv.statusFree,
        sold ? r.seller_name : "",
        sold ? r.buyer_name : "",
        sold ? formatInternational(r.phone) : "",
        sold ? formatDateTime(r.sold_at) : "",
      ];
    });
    const body = toCsv([[...copy.csv.headers], ...rows]);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${copy.csv.fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: copy.errors.generic }, { status: 500 });
  }
}
