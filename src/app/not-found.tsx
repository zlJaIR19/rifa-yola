import Link from "next/link";
import { Brand } from "@/components/Brand";
import { copy } from "@/lib/copy";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <Brand size="lg" />
      <div className="card mt-6 p-5 text-center">
        <p className="text-lg font-black text-berry-700">{copy.notFound.title}</p>
        <Link href="/" className="mt-4 inline-block rounded-xl bg-pine-800 px-4 py-2.5 font-extrabold text-cream-100">
          {copy.notFound.back}
        </Link>
      </div>
    </main>
  );
}
