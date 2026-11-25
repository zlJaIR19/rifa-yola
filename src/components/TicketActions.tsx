"use client";

import { useEffect, useRef, useState } from "react";
import { copy } from "@/lib/copy";
import { padNumber } from "@/lib/raffle-config";
import type { SaleDetail } from "@/lib/types";
import { saleChatLink } from "@/lib/whatsapp";
import { useToast } from "./Toast";

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z" />
    </svg>
  );
}

/** "1. Abrir chat" and "2. Compartir ticket" for a sold number. */
export function TicketActions({ sale }: { sale: SaleDetail }) {
  const toast = useToast();
  const num = padNumber(sale.number);
  const fileName = `ticket-${num}.png`;
  const [busy, setBusy] = useState(false);
  // Prefetch the ticket so navigator.share runs right inside the tap (iOS needs that).
  const blobRef = useRef<Blob | null>(null);
  const version = `${sale.number}|${sale.sold_at}|${sale.buyer_name}|${sale.phone}|${sale.seller_name}`;

  useEffect(() => {
    blobRef.current = null;
    const ctrl = new AbortController();
    fetch(`/api/ticket/${sale.number}?v=${encodeURIComponent(version)}`, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (b) blobRef.current = b;
      })
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [sale.number, version]);

  function download(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    toast(copy.sale.ticketDownloaded, "success");
  }

  async function share() {
    setBusy(true);
    try {
      let blob = blobRef.current;
      if (!blob) {
        const res = await fetch(`/api/ticket/${sale.number}?v=${encodeURIComponent(version)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("ticket");
        blob = await res.blob();
        blobRef.current = blob;
      }
      const file = new File([blob], fileName, { type: "image/png" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
        } catch (err) {
          if ((err as DOMException)?.name === "AbortError") return; // user closed the share sheet
          download(blob);
        }
      } else {
        download(blob);
      }
    } catch {
      toast(copy.sale.ticketError, "error");
    } finally {
      setBusy(false);
    }
  }

  const chatHref = saleChatLink({ phone: sale.phone, buyerName: sale.buyer_name, number: num });

  return (
    <div className="space-y-2">
      <a
        href={chatHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-wa py-3.5 text-lg font-extrabold text-white shadow-[0_4px_0_var(--color-wa-dark)] active:translate-y-0.5 active:shadow-none"
      >
        <WhatsAppIcon />
        {copy.sale.openChat}
      </a>
      <button
        type="button"
        onClick={share}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-400 py-3.5 text-lg font-extrabold text-ink shadow-[0_4px_0_var(--color-gold-600)] active:translate-y-0.5 active:shadow-none disabled:opacity-70"
      >
        <span aria-hidden="true">🎟️</span>
        {busy ? copy.sale.preparingTicket : copy.sale.shareTicket}
      </button>
      <p className="px-1 text-center text-xs font-semibold text-ink-soft">{copy.sale.helper}</p>
    </div>
  );
}
