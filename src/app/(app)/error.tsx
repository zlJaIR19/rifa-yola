"use client";

import { copy } from "@/lib/copy";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mt-4 p-5 text-center">
      <p className="text-lg font-black text-berry-700">{copy.errorPage.title}</p>
      <p className="mt-1 text-sm font-semibold text-ink-soft">{copy.errorPage.body}</p>
      <button type="button" onClick={reset} className="mt-4 rounded-xl bg-pine-800 px-4 py-2.5 font-extrabold text-cream-100">
        {copy.common.retry}
      </button>
    </div>
  );
}
