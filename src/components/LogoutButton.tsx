"use client";

import { copy } from "@/lib/copy";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/logout", { method: "POST" }).catch(() => undefined);
    window.location.replace("/login");
  }
  return (
    <button
      type="button"
      onClick={logout}
      className="rounded-full border border-cream-100/30 px-3 py-1 text-xs font-bold text-cream-100/90 hover:bg-white/10"
    >
      {copy.nav.logout}
    </button>
  );
}
