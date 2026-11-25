import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { copy } from "@/lib/copy";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { clearFailures, ipKey, isRateLimited, recordFailure } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { username?: unknown; pin?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: copy.login.errorMissing }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const pin = typeof body.pin === "string" ? body.pin.trim() : "";
  if (!username || !pin) {
    return NextResponse.json({ error: copy.login.errorMissing }, { status: 400 });
  }
  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: copy.login.errorPinFormat }, { status: 400 });
  }

  const expectedUser = process.env.APP_USERNAME;
  const pinHash = process.env.APP_PIN_HASH;
  if (!expectedUser || !pinHash) {
    console.error("APP_USERNAME or APP_PIN_HASH is not set");
    return NextResponse.json({ error: copy.login.errorServer }, { status: 500 });
  }

  const key = ipKey(request.headers);
  try {
    if (await isRateLimited(key)) {
      return NextResponse.json({ error: copy.login.errorRateLimited }, { status: 429 });
    }
  } catch (err) {
    console.error("rate limit check failed", err);
    return NextResponse.json({ error: copy.login.errorServer }, { status: 500 });
  }

  // Always run bcrypt so a wrong username takes as long as a wrong PIN.
  const pinOk = await bcrypt.compare(pin, pinHash);
  const userOk = username.toLocaleLowerCase("es") === expectedUser.toLocaleLowerCase("es");

  if (!pinOk || !userOk) {
    try {
      await recordFailure(key);
    } catch (err) {
      console.error("record failure failed", err);
    }
    return NextResponse.json({ error: copy.login.errorInvalid }, { status: 401 });
  }

  await clearFailures(key).catch(() => undefined);
  const token = await createSessionToken(expectedUser);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
