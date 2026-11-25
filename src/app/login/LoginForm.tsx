"use client";

import { useState } from "react";
import { copy } from "@/lib/copy";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !pin) return setError(copy.login.errorMissing);
    if (!/^\d{4}$/.test(pin)) return setError(copy.login.errorPinFormat);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, pin }),
      });
      if (res.ok) {
        window.location.replace("/");
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? copy.login.errorServer);
      setPin("");
    } catch {
      setError(copy.errors.network);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="username" className="mb-1 block text-sm font-extrabold text-ink">
          {copy.login.username}
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          placeholder={copy.login.usernamePlaceholder}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-xl border-2 border-cream-200 bg-white px-4 py-3 text-lg font-bold outline-none focus:border-pine-700"
        />
      </div>
      <div>
        <label htmlFor="pin" className="mb-1 block text-sm font-extrabold text-ink">
          {copy.login.pin}
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          autoComplete="current-password"
          placeholder={copy.login.pinPlaceholder}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className="w-full rounded-xl border-2 border-cream-200 bg-white px-4 py-3 text-center text-2xl font-extrabold tracking-[0.6em] outline-none placeholder:text-base placeholder:tracking-normal focus:border-pine-700"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-berry-600/10 px-3 py-2 text-sm font-bold text-berry-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-berry-600 py-3.5 text-lg font-extrabold text-cream-100 shadow-[0_4px_0_var(--color-berry-700)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-70"
      >
        {loading ? copy.login.submitting : copy.login.submit}
      </button>
    </form>
  );
}
