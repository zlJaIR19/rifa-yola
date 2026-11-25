"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { copy } from "@/lib/copy";

const tabs = [
  { href: "/", label: copy.nav.board, icon: "🎟️" },
  { href: "/resumen", label: copy.nav.summary, icon: "📊" },
  { href: "/historial", label: copy.nav.history, icon: "📜" },
  { href: "/aviso", label: copy.nav.notice, icon: "📣" },
];

export function NavTabs() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t-4 border-gold-400 bg-pine-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-3xl grid-cols-4">
        {tabs.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-extrabold leading-tight ${
                  active ? "text-gold-400" : "text-cream-100/80"
                }`}
              >
                <span aria-hidden="true" className={`text-xl ${active ? "" : "opacity-80"}`}>
                  {t.icon}
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
