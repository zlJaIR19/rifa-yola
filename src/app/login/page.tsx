import type { Metadata } from "next";
import { Brand } from "@/components/Brand";
import { LoginForm } from "./LoginForm";
import { copy } from "@/lib/copy";
import { raffleConfig } from "@/lib/raffle-config";

export const metadata: Metadata = { title: `${copy.login.submit} | ${copy.meta.title}` };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
      <Brand size="lg" />
      <p className="mt-2 text-center text-sm font-bold text-cream-100/90">{raffleConfig.drawDate}</p>
      <div className="card mt-6 p-5">
        <div className="mb-4 text-center">
          <span className="ribbon text-xl">{copy.login.title}</span>
        </div>
        <LoginForm />
      </div>
      <p aria-hidden="true" className="mt-6 text-center text-2xl tracking-[0.4em]">⭐🎁⭐</p>
    </main>
  );
}
