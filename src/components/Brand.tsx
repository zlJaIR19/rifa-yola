import Image from "next/image";
import { copy } from "@/lib/copy";

const hasLogo = process.env.NEXT_PUBLIC_HAS_LOGO === "1";

/** Festive title. Shows public/logo-yoli.png if it exists, otherwise the organizer name. */
export function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  const big = size === "lg";
  return (
    <div className="flex flex-col items-center text-center">
      {hasLogo ? (
        <Image
          src="/logo-yoli.png"
          alt={copy.brand.organizer}
          width={big ? 140 : 72}
          height={big ? 140 : 72}
          className="h-auto object-contain drop-shadow"
          style={{ width: big ? 140 : 72 }}
          priority
        />
      ) : (
        <span
          className={`rounded-md border-2 border-gold-400 bg-berry-600 px-3 font-extrabold text-cream-100 shadow ${
            big ? "py-1 text-base" : "py-0.5 text-xs"
          }`}
        >
          {copy.brand.organizer}
        </span>
      )}
      <h1
        className={`font-script leading-none text-gold-400 drop-shadow-[0_3px_0_rgba(0,0,0,0.3)] ${
          big ? "mt-3 text-5xl" : "mt-1 text-3xl"
        }`}
      >
        <span aria-hidden="true" className="mr-1 text-[0.7em]">🎄</span>
        {copy.brand.raffleName}
      </h1>
    </div>
  );
}
