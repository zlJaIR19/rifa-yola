import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { copy } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import { formatInternational } from "@/lib/phone";
import { formatContactWhatsApp, padNumber, raffleConfig } from "@/lib/raffle-config";
import { requireSession } from "@/lib/server/auth";
import { getSale } from "@/lib/server/data";
import { parseNumberParam } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WIDTH = 1080;
const HEIGHT = 1350;

const C = {
  green: "#0F5A2E",
  greenLight: "#1B7A3E",
  red: "#C8102E",
  redDark: "#9E0B23",
  gold: "#F2C14E",
  goldDark: "#B8860B",
  cream: "#FFF6E5",
  ink: "#2B2118",
  muted: "#6B5B4B",
};

// Fonts are bundled in the repo so accents, ñ, ¡ and ° always render.
const fontDir = join(process.cwd(), "src/assets/fonts");
const fontsPromise = Promise.all([
  readFile(join(fontDir, "Lobster-Regular.ttf")),
  readFile(join(fontDir, "Nunito-Regular.ttf")),
  readFile(join(fontDir, "Nunito-Bold.ttf")),
  readFile(join(fontDir, "Nunito-Black.ttf")),
]);

function Snowflake({ x, y, size, opacity }: { x: number; y: number; size: number; opacity: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ position: "absolute", left: x, top: y, opacity }}
    >
      <g stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M12 2v20M3.3 7l17.4 10M3.3 17l17.4-10" />
        <path d="M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5" />
      </g>
    </svg>
  );
}

function Star({ size = 30, color = C.gold }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z"
        fill={color}
      />
    </svg>
  );
}

function Holly() {
  return (
    <svg width="120" height="70" viewBox="0 0 120 70">
      <path d="M58 36 C40 10, 14 14, 4 26 C16 28, 18 40, 10 50 C26 46, 40 54, 58 36 Z" fill="#1B7A3E" />
      <path d="M62 36 C80 10, 106 14, 116 26 C104 28, 102 40, 110 50 C94 46, 80 54, 62 36 Z" fill="#146B34" />
      <circle cx="52" cy="40" r="9" fill={C.red} />
      <circle cx="68" cy="40" r="9" fill={C.red} />
      <circle cx="60" cy="28" r="9" fill={C.redDark} />
    </svg>
  );
}

function Field({ label, value, size = 40 }: { label: string; value: string; size?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: 14 }}>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: size, fontWeight: 800, color: C.ink, lineHeight: 1.15 }}>{value}</div>
    </div>
  );
}

function fitSize(text: string, base: number, maxChars: number): number {
  if (text.length <= maxChars) return base;
  return Math.max(26, Math.floor((base * maxChars) / text.length));
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ number: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;

  const { number } = await ctx.params;
  const n = parseNumberParam(number);
  if (!n) return NextResponse.json({ error: copy.errors.invalidNumber }, { status: 400 });

  const sale = await getSale(n);
  if (!sale) return NextResponse.json({ error: copy.ticket.notFound }, { status: 404 });

  const [lobster, nunito400, nunito700, nunito900] = await fontsPromise;
  const num = padNumber(sale.number);
  const phone = formatInternational(sale.phone);
  const soldAt = formatDateTime(sale.sold_at);

  const flakes = [
    { x: 40, y: 40, size: 46, opacity: 0.35 },
    { x: 980, y: 60, size: 40, opacity: 0.3 },
    { x: 150, y: 180, size: 26, opacity: 0.25 },
    { x: 900, y: 200, size: 30, opacity: 0.25 },
    { x: 20, y: 700, size: 34, opacity: 0.2 },
    { x: 1030, y: 760, size: 30, opacity: 0.2 },
    { x: 60, y: 1270, size: 40, opacity: 0.3 },
    { x: 980, y: 1260, size: 46, opacity: 0.3 },
  ];

  const notch = (side: "left" | "right") => (
    <div
      style={{
        position: "absolute",
        [side]: -28,
        top: -28,
        width: 56,
        height: 56,
        borderRadius: 28,
        background: C.green,
      }}
    />
  );

  const image = new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
          background: `radial-gradient(circle at 50% 0%, ${C.greenLight} 0%, ${C.green} 60%)`,
          fontFamily: "Nunito",
          color: C.ink,
        }}
      >
        {flakes.map((f, i) => (
          <Snowflake key={i} {...f} />
        ))}

        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 38 }}>
          <div
            style={{
              fontFamily: "Lobster",
              fontSize: 112,
              color: C.gold,
              lineHeight: 1,
              textShadow: "0 4px 0 rgba(0,0,0,0.25)",
            }}
          >
            {copy.ticket.title}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 14,
              padding: "8px 40px",
              background: C.red,
              color: C.cream,
              fontSize: 38,
              fontWeight: 800,
              borderRadius: 8,
              border: `3px solid ${C.gold}`,
            }}
          >
            {copy.ticket.organizer}
          </div>
        </div>

        {/* Ticket card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 960,
            marginTop: 30,
            background: C.cream,
            borderRadius: 36,
            border: `6px solid ${C.gold}`,
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
            overflow: "hidden",
          }}
        >
          {/* Main part */}
          <div style={{ display: "flex", padding: "30px 44px 22px 44px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: 380,
                marginRight: 36,
                padding: "18px 0 10px 0",
                background: "#FFFFFF",
                borderRadius: 28,
                border: `4px dashed ${C.red}`,
              }}
            >
              <Holly />
              <div style={{ fontSize: 30, fontWeight: 800, color: C.muted, marginTop: 4 }}>
                {copy.ticket.numberLabel}
              </div>
              <div style={{ fontSize: 190, fontWeight: 900, color: C.red, lineHeight: 1, letterSpacing: -4 }}>
                {num}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
              <Field label={copy.ticket.buyer} value={sale.buyer_name} size={fitSize(sale.buyer_name, 44, 18)} />
              <Field label={copy.ticket.phone} value={phone} size={38} />
              <Field label={copy.ticket.seller} value={sale.seller_name} size={fitSize(sale.seller_name, 38, 20)} />
              <Field label={copy.ticket.date} value={soldAt} size={30} />
            </div>
          </div>

          {/* Perforation */}
          <div style={{ display: "flex", position: "relative", height: 0, marginTop: 10 }}>
            {notch("left")}
            {notch("right")}
            <div
              style={{
                position: "absolute",
                left: 40,
                right: 40,
                top: -2,
                borderTop: `5px dashed ${C.goldDark}`,
              }}
            />
          </div>

          {/* Stub: prizes and draw info */}
          <div style={{ display: "flex", flexDirection: "column", padding: "36px 48px 30px 48px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
              <div
                style={{
                  display: "flex",
                  background: C.red,
                  color: C.cream,
                  fontFamily: "Lobster",
                  fontSize: 44,
                  padding: "4px 46px 10px 46px",
                  borderRadius: 10,
                }}
              >
                {copy.ticket.prizes}
              </div>
            </div>
            {raffleConfig.prizes.map((prize) => (
              <div key={prize} style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                <Star size={32} color={C.goldDark} />
                <div style={{ fontSize: 30, fontWeight: 700, marginLeft: 14, color: C.ink, flex: 1 }}>{prize}</div>
              </div>
            ))}

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 16,
                fontSize: 36,
                fontWeight: 900,
                color: C.red,
              }}
            >
              {raffleConfig.priceText}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 8,
                fontSize: 32,
                fontWeight: 800,
                color: C.green,
              }}
            >
              {copy.ticket.draw(raffleConfig.drawDate)}
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 4, fontSize: 28, fontWeight: 700, color: C.muted }}>
              {copy.ticket.facebook}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 26,
            fontSize: 34,
            fontWeight: 800,
            color: C.cream,
          }}
        >
          <Star size={30} />
          <div style={{ display: "flex", margin: "0 16px" }}>
            {copy.ticket.contact(formatContactWhatsApp())}
          </div>
          <Star size={30} />
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: "Lobster", data: lobster, weight: 400, style: "normal" },
        { name: "Nunito", data: nunito400, weight: 400, style: "normal" },
        { name: "Nunito", data: nunito700, weight: 700, style: "normal" },
        { name: "Nunito", data: nunito900, weight: 800, style: "normal" },
        { name: "Nunito", data: nunito900, weight: 900, style: "normal" },
      ],
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": `inline; filename="ticket-${num}.png"`,
      },
    },
  );
  return image;
}
