import { copy } from "./copy";

/** Build a wa.me link. The message is a UTF-8 string with "\n" breaks, encoded exactly once. */
export function whatsappLink(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/^\+/, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function saleChatLink(p: { phone: string; buyerName: string; number: string }): string {
  return whatsappLink(p.phone, copy.whatsapp.saleMessage({ buyerName: p.buyerName, number: p.number }));
}

export function drawNoticeLink(p: {
  phone: string;
  buyerName: string;
  numbers: string[];
  drawLink: string;
}): string {
  return whatsappLink(
    p.phone,
    copy.whatsapp.drawNotice({ buyerName: p.buyerName, numbers: p.numbers, drawLink: p.drawLink }),
  );
}
