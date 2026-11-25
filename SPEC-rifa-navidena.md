# Christmas Raffle Tracking System (Rifa Navideña Yoli Manualidades)

## 1. Goal

A mobile-first web app where the sellers of a Christmas raffle register, in real time, which numbers (1 to 250) are sold, to whom, and by which seller, so nobody offers a number that is already taken.

This project is a new, independent version of a previous raffle app. It reuses the same proven patterns (atomic sales in the database, Supabase Realtime, WhatsApp ticket sharing, draw notice), with the differences listed in section 3.

## 2. Language rules (IMPORTANT)

- **All code, identifiers, database objects, comments, commits and docs: English.**
- **All user-facing text: Spanish (Peru).** Users do not speak English. This includes labels, buttons, placeholders, validation and error messages, toasts, dialogs, empty states, page titles, CSV headers, the WhatsApp messages and the ticket image.
- Keep all UI strings in `src/lib/copy.ts`.
- `<html lang="es">`. Dates in `es-PE` format, time zone `America/Lima`.
- No em dashes in any UI text.

## 3. Differences from the previous raffle app

1. **250 numbers** (1 to 250), shown padded to 3 digits (001 to 250).
2. **One shared account** instead of one account per seller. Username `Usuario`, PIN `1111`.
3. **Seller name is entered on each sale**, together with the buyer name and buyer phone.
4. **No ownership rules**: since everyone uses the same account, any user can edit or release any number. This is protected with confirmations and an activity log (section 6).
5. **No per-seller goal.** The summary shows how many numbers each seller name has sold, without a target.
6. **Christmas look and feel** based on the raffle flyer (section 9).

## 4. Raffle details (put them in `src/lib/raffle-config.ts`)

```ts
organizer: "Yoli Manualidades"
raffleName: "Rifa Navideña"
totalNumbers: 250
priceText: "1 por S/ 8 | 2 por S/ 15"
drawDate: "Domingo 13 de diciembre de 2026"
drawPlace: "Se realizará virtualmente en el Facebook de Yoli Manualidades"
contactWhatsApp: "+51931436288"   // shown formatted as 931 436 288
payment: "Pago vía Yape"
prizes: [
  "1er Premio: Papá Noel navideño hecho a mano",
  "2do Premio: Muñeco de nieve navideño (no incluye panetón)",
  "3er Premio: Adorno navideño de galletas de jengibre",
]
```

The prize names are a description of the flyer photos; keep them easy to edit.

## 5. Access

- Single login screen: username + 4-digit PIN.
- Credentials are NOT hardcoded in the source. Store them as env vars (`APP_USERNAME`, `APP_PIN_HASH`, bcrypt hash) and provide a small script to generate the hash. Initial values: `Usuario` / `1111`.
- Session in a signed httpOnly cookie valid for 30 days.
- Brute force protection: since the account is shared, do NOT lock the account (that would lock out every seller). Instead rate limit failed attempts per IP (e.g. 10 per 15 minutes).

## 6. Business rules

1. A number is either **free** or **sold**.
2. When selling, all three fields are required:
   - **Seller name** (2 to 40 characters).
   - **Buyer name** (2 to 80 characters).
   - **Buyer phone** (international support, see section 7).
3. **Seller name consistency:** the field is a combobox that suggests seller names already used (from previous sales), so "Ana", "ana" and "Ana " don't become three sellers. Trim spaces, collapse double spaces, compare case-insensitively, and reuse the existing spelling when it matches. The device remembers the last seller name used (localStorage, wrapped in try/catch) and pre-fills it.
4. **Atomic sale:** if two people try to sell the same number at the same time, only the first succeeds; the second sees "Este número ya fue vendido por {seller}". Enforced in the database.
5. **Release:** any user can release any number, with a confirmation dialog that shows the number, buyer and seller. Releasing deletes the buyer data.
6. **Edit:** any user can edit buyer name, phone and seller name of a sold number.
7. **Activity log:** every sale, edit and release is recorded with the number, action, seller name entered, previous and new values, and timestamp. Visible in a read-only "Historial" section, useful if there is a dispute.

## 7. Phone numbers

- Country selector next to the phone input, default "Perú (+51)".
- Top of the list: Perú, Francia, Chile, Argentina, Colombia, Ecuador, Bolivia, Venezuela, México, Estados Unidos, España, Italia. Then a separator and all other countries alphabetically, with Spanish names and flag emojis. Searchable.
- If a number is typed or pasted with "+", detect the country automatically. Accept local formats for the selected country (e.g. "06 12 34 56 78" with Francia).
- Validate with `libphonenumber-js` on client and server. Store in E.164 (`+51955838525`). Display in international format (`+51 955 838 525`).

## 8. Screens

### 8.1 Login
Username, PIN (numeric, 4 digits), "Entrar" button. Festive header with the raffle name.

### 8.2 Main board
- Grid of 250 numbers (5 to 6 columns on a phone).
- Free: cream/white. Sold: red with the seller's initials.
- Header: "Vendidos: X/250" and "Libres: Y".
- Filters: Todos, Libres, Vendidos. Search to jump to a number.
- Real-time updates without reload, plus a safety re-sync 2 s after connecting and every 30 s while visible.

### 8.3 Tapping a number
- **Free:** form with seller name (combobox), buyer name, buyer phone, "Confirmar venta".
- **Sold:** buyer, phone, seller and date, with:
  - "1. Abrir chat" (green, WhatsApp link with short text)
  - "2. Compartir ticket" (ticket image)
  - Helper text: "Primero abre el chat y luego comparte el ticket. El comprador aparecerá entre tus chats recientes."
  - "Editar datos" and "Liberar número".
- After a successful sale, show the WhatsApp buttons immediately.

### 8.4 Resumen
- Sales per seller name (count, sorted descending).
- List of all sales: number, seller, buyer, phone, date. Sortable by number and by seller.
- "Exportar CSV": all 250 numbers, Spanish headers (Número, Estado, Vendedor, Comprador, Celular, Fecha), UTF-8 with BOM so Excel shows accents, formula injection neutralized.

### 8.5 Historial
Read-only activity log, newest first.

### 8.6 Avisar sorteo
- Field "Link de la transmisión" + "Guardar", stored in the database so it updates for everyone without a redeploy. Validate https URL. Show when it was last saved.
- List of all buyers grouped by phone (one row per buyer with all their numbers), filterable by seller name, so each seller can notify only their own buyers.
- Each row: green "Enviar aviso" button opening WhatsApp with the message. Disabled until a link is saved ("Primero guarda el link de la transmisión").
- Mark rows "Enviado ✓" after tapping (localStorage, still tappable to resend), "Reiniciar marcas" link, progress "Avisados: X de Y".

## 9. Look and feel (based on the flyer)

- Christmas theme: deep green background (#0F5A2E to #1B7A3E range) with subtle snowflake and pine pattern, festive red (#C8102E range) for primary actions and sold numbers, warm gold (#F2C14E range) accents, cream panels (#FFF6E5 range).
- Fonts (Google Fonts): a bold festive script for headings like "Rifa Navideña" (e.g. Lobster or Pacifico), and a rounded sans for body and numbers (e.g. Nunito or Poppins, bold).
- Ribbon-style banners for section titles (like "1er Premio" on the flyer), rounded cards with soft shadows, small decorative touches (candy cane, holly, stars) as inline SVG or emoji, used sparingly so the board stays readable.
- Free numbers must stay clearly distinguishable from sold ones; readability beats decoration.
- If `public/logo-yoli.png` exists, show it in the header; otherwise show the text "Yoli Manualidades".
- Mobile first, comfortable at 360 px. Good contrast on the green background.

## 10. WhatsApp messages (Spanish, in copy.ts)

Short text when opening the chat:

```
🎄 *Rifa Navideña Yoli Manualidades*

Hola {buyerName}, ¡gracias por tu compra!

*Tu número:* {number}
*Sorteo:* {drawDate}, en el Facebook de Yoli Manualidades

Te envío tu ticket a continuación. ¡Mucha suerte! 🍀
```

Draw notice (use "Tu número" or "Tus números"):

```
🎄 *Rifa Navideña Yoli Manualidades*

Hola {buyerName}, ¡el sorteo ya comenzó!

*{Tu número / Tus números}:* {numbers}

Míralo en vivo aquí:
{drawLink}

¡Mucha suerte! 🍀
```

- Build the message as a UTF-8 string with "\n" line breaks, pass it once through encodeURIComponent, and open `https://wa.me/{E.164 without +}?text=...`.

## 11. Ticket image

- PNG 1080x1350 generated with next/og ImageResponse in an authenticated route (`/api/ticket/[number]`), never cached publicly.
- Real raffle ticket look in the flyer's Christmas style: green background, cream ticket card with a perforated stub edge, red and gold accents, festive script header.
- Content by priority: "Rifa Navideña" + "Yoli Manualidades"; the number, very large; Comprador; Celular (international format); Vendedor; Fecha de venta; the 3 prizes; price text; "Sorteo: {drawDate}"; "Facebook de Yoli Manualidades"; contact WhatsApp 931 436 288.
- Bundle the fonts so accents, ñ, ¡ and ° render correctly.
- "Compartir ticket" uses navigator.share with the file when supported; otherwise downloads `ticket-{number}.png`.

## 12. Tech stack

- Next.js (App Router), TypeScript, Tailwind CSS.
- Supabase (Postgres + Realtime). New, separate Supabase project.
- Vercel (free tier). New, separate Vercel project and GitHub repo.

## 13. Data model (suggested)

```sql
create table raffle_numbers (
  number int primary key check (number between 1 and 250),
  seller_name text,
  sold_at timestamptz
);

create table buyers (
  number int primary key references raffle_numbers(number) on delete cascade,
  name text not null,
  phone text not null check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  updated_at timestamptz not null default now()
);

create table activity_log (
  id bigint generated always as identity primary key,
  number int not null,
  action text not null check (action in ('sell','edit','release')),
  seller_name text,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create table app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);
```

- Seed 250 free rows in `raffle_numbers`.
- Add `raffle_numbers` to the `supabase_realtime` publication. Realtime payloads must never include buyer data (that's why buyers are a separate table).
- All writes go through transactional RPC functions (`sell_number`, `update_sale`, `release_number`, `set_draw_link`), called only from the Next.js server with the service role key, each writing to `activity_log` in the same transaction.
- RLS: anon can read `raffle_numbers` only (needed for Realtime). No anon access to `buyers`, `activity_log` or `app_settings`. Anon cannot call the RPC functions.

## 14. Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SESSION_SECRET=
APP_USERNAME=Usuario
APP_PIN_HASH=
```

## 15. Acceptance criteria

- [ ] Login works with Usuario / 1111; wrong PIN shows a Spanish error; repeated failures from one IP are rate limited without locking other devices.
- [ ] Two simultaneous sales of the same number: only one succeeds, the other sees who sold it.
- [ ] A sale requires seller name, buyer name and a valid phone; "ana " reuses the existing seller "Ana".
- [ ] A sale on one phone appears on another in under 2 seconds without reloading.
- [ ] Peruvian, French, Chilean and US numbers are accepted and their wa.me links are correct; invalid numbers are rejected on the server.
- [ ] Ticket image and WhatsApp messages render emojis, accents, ñ, ¡ and ° correctly.
- [ ] Every sale, edit and release appears in Historial.
- [ ] Saving the draw link updates it for every device; notice buttons are disabled until a link exists.
- [ ] CSV has 250 rows with Spanish headers and opens correctly in Excel.
- [ ] No English text anywhere in the UI.
- [ ] Looks festive and consistent with the flyer, and is readable at 360 px.

## 16. Deliverables

- Project code with an English README (setup, Supabase, Vercel deployment).
- Supabase SQL migrations (tables, seed of 250 numbers, RPC functions, RLS, Realtime publication). Do not apply them; tell me the order.
- Script to generate `APP_PIN_HASH`.
- `.env.example`.
