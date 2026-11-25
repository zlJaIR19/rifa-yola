import type { Metadata, Viewport } from "next";
import { Lobster, Nunito } from "next/font/google";
import { copy } from "@/lib/copy";
import "./globals.css";

const lobster = Lobster({ weight: "400", subsets: ["latin"], variable: "--font-lobster", display: "swap" });
const nunito = Nunito({ weight: ["400", "600", "700", "800", "900"], subsets: ["latin"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  title: copy.meta.title,
  description: copy.meta.description,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F5A2E",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${lobster.variable} ${nunito.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
