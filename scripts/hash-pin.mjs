#!/usr/bin/env node
// Generate APP_PIN_HASH (bcrypt) for the shared login PIN.
// Usage: npm run hash-pin -- 1111
import bcrypt from "bcryptjs";

const pin = process.argv[2];
if (!pin || !/^\d{4}$/.test(pin)) {
  console.error("Usage: npm run hash-pin -- <4-digit PIN>");
  process.exit(1);
}

const hash = bcrypt.hashSync(pin, 12);
console.log("\nRaw hash (paste this into Vercel > Settings > Environment Variables):\n");
console.log(hash);
console.log("\nLine for .env.local (\"$\" escaped so Next.js does not expand it):\n");
console.log(`APP_PIN_HASH=${hash.replace(/\$/g, "\\$")}`);
console.log();
