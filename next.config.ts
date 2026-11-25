import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import { join } from "node:path";

// Show the logo in the header only if public/logo-yoli.png exists (checked at build time).
const hasLogo = existsSync(join(process.cwd(), "public", "logo-yoli.png"));

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_HAS_LOGO: hasLogo ? "1" : "",
  },
  // Make sure the bundled ticket fonts are deployed with the ticket function.
  outputFileTracingIncludes: {
    "/api/ticket/[number]": ["./src/assets/fonts/**/*"],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
