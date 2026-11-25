# Rifa Navideña (Yoli Manualidades)

A mobile-first web app where sellers record, in real time, which raffle numbers (001 to 250) are sold, to whom and by whom. Built with Next.js (App Router), TypeScript, Tailwind CSS v4 and Supabase (Postgres + Realtime). Deployed on Vercel.

All code is in English. Every user-facing string is in Spanish (Peru) and lives in `src/lib/copy.ts`. Raffle details (prizes, price, draw date, contact) live in `src/lib/raffle-config.ts`.

## Features

- **Login**: one shared account (`APP_USERNAME` + 4-digit PIN, bcrypt hash in `APP_PIN_HASH`). Signed httpOnly session cookie, valid for 30 days. Failed attempts are rate limited per IP (10 per 15 minutes). The account itself is never locked.
- **Board**: 250 numbers, live updates through Supabase Realtime, plus a re-sync 2 s after connecting and every 30 s while the tab is visible. Filters (Todos, Libres, Vendidos) and jump-to-number search.
- **Sale**: seller name (combobox that reuses existing spellings), buyer name and phone (country picker, auto-detects `+` prefixes, validated with `libphonenumber-js` on client and server, stored as E.164). Sales are atomic in the database.
- **Sold number**: "1. Abrir chat" (wa.me link with the message), "2. Compartir ticket" (PNG from `/api/ticket/[number]`, shared with `navigator.share` or downloaded), "Editar datos", "Liberar número" (with a confirmation dialog).
- **Resumen**: sales per seller, sortable list of all sales, "Exportar CSV" (250 rows, Spanish headers, UTF-8 with BOM, formula injection neutralized).
- **Historial**: read-only activity log of every sale, edit, release and draw-link change.
- **Avisar sorteo**: shared live-stream link stored in the database, buyers grouped by phone and filterable by seller, "Enviar aviso" WhatsApp buttons with per-device "Enviado ✓" marks.

## Project layout

```
supabase/migrations/        SQL migrations (apply in filename order)
scripts/hash-pin.mjs        Generates APP_PIN_HASH
src/proxy.ts                Redirects to /login when there is no valid session
src/app/login/              Login screen
src/app/(app)/              Authenticated screens: board, resumen, historial, aviso
src/app/api/                Route handlers (login, numbers, ticket, export, draw-link, ...)
src/components/             UI components
src/lib/                    copy.ts, raffle-config.ts, phone, session, validation, helpers
src/lib/server/             Server-only code (service-role Supabase client, data access)
src/assets/fonts/           Fonts bundled for the ticket image (Lobster, Nunito)
```

## Security model

- The browser uses the **anon key** only to read `raffle_numbers` (number, seller name, sold date) and to subscribe to Realtime. Buyer names and phones are in a separate `buyers` table that anon cannot read, so they never travel over Realtime.
- All writes go through the RPC functions `sell_number`, `update_sale`, `release_number` and `set_draw_link`. Each runs in one transaction and writes to `activity_log`. Only `service_role` may execute them. The Next.js server calls them with `SUPABASE_SERVICE_ROLE_KEY` after checking the session cookie.
- `sell_number` uses a conditional `UPDATE ... WHERE sold_at IS NULL`. If two people sell the same number at the same time, the second one gets `already_sold` and the name of the seller who won.
- Seller names are normalized (trimmed, internal spaces collapsed) and matched case-insensitively against existing names, both in the UI and in the database (`canonical_seller_name`), so "ana " becomes "Ana".
- `release_number` accepts the `sold_at` the user saw, so a number that was released and sold again by someone else while the dialog was open is not released by mistake.

## Supabase setup

1. Create a **new** Supabase project.
2. Apply the migrations **in this order** (SQL Editor, or `supabase db push` with the Supabase CLI):
   1. `supabase/migrations/20261125000001_tables.sql`: tables (`raffle_numbers`, `buyers`, `activity_log`, `app_settings`, `login_failures`).
   2. `supabase/migrations/20261125000002_seed.sql`: 250 free numbers.
   3. `supabase/migrations/20261125000003_rpc_functions.sql`: RPC functions and their permissions.
   4. `supabase/migrations/20261125000004_rls_realtime.sql`: RLS, grants and the `supabase_realtime` publication.
   The migrations can be re-run safely.
3. In **Project Settings > API**, copy the project URL, the `anon` key and the `service_role` key.
4. Check that **Database > Publications > supabase_realtime** includes `raffle_numbers` (migration 4 adds it).

Differences from the suggested data model in the spec:
- `activity_log.number` is nullable and `action` also allows `draw_link`, because `set_draw_link` writes to the log as well.
- `login_failures` stores failed logins per hashed IP for rate limiting (the raw IP is never stored).
- `raffle_numbers` has a check that `seller_name` and `sold_at` are both set or both empty.

## Local development

```bash
npm install
cp .env.example .env.local
npm run hash-pin -- 1111      # copy the escaped line into .env.local
openssl rand -base64 48       # use as SESSION_SECRET
npm run dev
```

Open http://localhost:3000 and log in with `Usuario` / `1111`.

Other scripts: `npm run build`, `npm run lint`, `npm run typecheck`.

### Environment variables

| Name | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | Read-only access to `raffle_numbers` and Realtime |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Calls the RPC functions. Never expose it. |
| `SESSION_SECRET` | server only | At least 32 random characters. Changing it logs everyone out. |
| `APP_USERNAME` | server only | `Usuario` (compared case-insensitively) |
| `APP_PIN_HASH` | server only | bcrypt hash from `npm run hash-pin` |

**About `$` in `APP_PIN_HASH`:** bcrypt hashes contain `$`, which Next.js expands in `.env*` files. In `.env.local`, use the escaped line printed by the script (`\$2b\$12\$...`). In the Vercel dashboard, paste the raw hash without backslashes.

To change the PIN later: run `npm run hash-pin -- <new PIN>`, update `APP_PIN_HASH` in Vercel and redeploy. Existing sessions stay valid until they expire; rotate `SESSION_SECRET` too if you want to log everyone out.

## Deploying to Vercel

1. Push the project to a **new** GitHub repository.
2. In Vercel, **Add New > Project** and import the repository (framework preset: Next.js, default build settings).
3. Add the six environment variables above for Production (and Preview if you use it).
4. Deploy. Log in with `Usuario` / `1111` and sell a test number, then release it.

## Customizing

- **Raffle details** (prizes, price, draw date, contact): `src/lib/raffle-config.ts`.
- **Texts** (UI, WhatsApp messages, ticket, CSV headers): `src/lib/copy.ts`.
- **Logo**: add `public/logo-yoli.png` and redeploy. It is detected at build time and shown in the header; otherwise the text "Yoli Manualidades" is shown.
- **Colors and fonts**: `src/app/globals.css` (`@theme` tokens) and `src/app/layout.tsx`. The ticket image has its own palette in `src/app/api/ticket/[number]/route.tsx`.

## Notes

- The ticket route runs on the Node.js runtime and reads the TTF fonts from `src/assets/fonts` (included in the deployment through `outputFileTracingIncludes` in `next.config.ts`). Responses are `private, no-store`.
- "Enviado ✓" marks and the last seller name are stored in each phone's `localStorage`. They are per device by design.
- In the CSV, cells that start with `=`, `+`, `-` or `@` get a leading apostrophe to prevent formula injection. Phone numbers start with `+`, so they appear as `'+51 955 838 525` in Excel.
