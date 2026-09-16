# Cuppilo — Project Report

**What this is:** a pre-launch campaign website for a café concept that doesn't exist yet. Visitors answer 6 questions, become a "founding member" with a unique ID/QR, and land on a public founding wall. It exists to validate the concept and build an audience before any money or space is spent on the actual café.

This document is the single reference for anyone (including future-you) picking up the codebase. It replaces having to re-read the PRD/TRD separately — those still exist for deeper rationale, but this file answers "what is this and how does it work" end to end.

---

## 1. Concept, in one paragraph

Someone lands on the page, is asked their name and 6 questions about what they want from a café (drink, budget, vibe, what's missing from cafés today). Completing the flow makes them a "Cuppilo Founder" — they get a card with a founder number, a unique ID, and a QR code, and they appear on a live public wall. Support (donations) happens separately via a low-visibility footer link, self-reported for now. No physical product, no login, no payment processing inside the app.

## 2. Tech stack

- **Frontend:** plain HTML/CSS/JS. No framework, no bundler, no build step. `<script type="module">` gives native ES imports.
- **Backend:** Supabase (Postgres + Realtime + Row Level Security). There is no custom server — the browser talks to Supabase directly, and RLS policies are the only thing standing between "anyone can insert" and "anyone can read someone's phone number."
- **Third-party libraries used, and only these:**
  - `@supabase/supabase-js` (via esm.sh CDN import) — the Supabase client.
  - `qrcode` (via jsdelivr CDN script) — renders the founder QR code.

That's the entire dependency list. No AI agents, no automation frameworks, no invented tooling — this is a static site plus a Postgres database.

## 3. How to read the codebase (start here)

Open `src/main.js` first. It is the map of the whole app: it lists every route and which file renders it. Everything else follows from that file.

```
index.html              — the only HTML page. Loads styles.css and main.js.
styles.css               — all styling, one file, uses CSS variables for theming.

src/main.js              — entry point: wires routes + header controls. READ FIRST.
src/lib/
  supabaseClient.js       — the one Supabase connection, imported everywhere else.
  state.js                — app state for the home page's hero->questions->reveal flow.
  router.js               — tiny History-API router (no framework).
  qr.js                   — wraps the qrcode library.
  i18n.js                 — EN/ML string tables.
src/pages/
  home.js                 — "/" route: hero, question flow, and founder reveal.
  wall.js                 — "/wall" route: live founding wall.
  about.js                — "/about" route: static content.
  support.js               — "/support" route: buy-me-a-coffee.
src/partials/
  header.html, footer.html — shared chrome, fetched once and injected.
sql/
  schema.sql              — the entire database: tables, triggers, views, RLS.
  seed.sql                — the 6 questions and their options.
```

There is exactly one file per route, and each page file is self-contained: it fetches its own data and renders its own DOM. Nothing is spread across multiple files to find one flow.

## 4. The flow, step by step

```
1. Visitor lands on "/"
   -> src/pages/home.js renderHero()
   -> types their name, clicks "Get started"
   -> state.step becomes 'questions' (no page navigation, no reload)

2. Six questions, one at a time
   -> renderQuestions() reads from `questions` / `question_options` tables
   -> tapping an option auto-advances to the next question (no extra click)
   -> answers are held ONLY in memory/sessionStorage — nothing is written
      to the database yet, so an abandoned flow leaves zero DB rows

3. On the 6th answer, finalizeFlow() runs:
   -> INSERT into `founders` (name only) — a Postgres trigger generates the
      unique cuppilo_id and QR payload server-side, so the client can never
      fake or predict them
   -> ONE batched INSERT of all 6 answers into `answers`
   -> state.step becomes 'reveal'

4. renderReveal() shows the founder card + QR, with a Share button
   -> "Check your position" links to "/wall"

5. "/wall" (src/pages/wall.js)
   -> SELECTs from the `founding_wall` VIEW (never the raw founders table,
      so phone_number can never be exposed here)
   -> subscribes to Supabase Realtime so new founders appear live
   -> unsubscribes automatically when you navigate away (see main.js)

6. "/support" (src/pages/support.js), reached only via the footer link
   -> shows a UPI payment link (external, no gateway integration in v1)
   -> visitor can self-report an amount, which INSERTs into
      `support_payments` and immediately refreshes the live totals
```

No step in this list depends on anything not shown above. If a flow seems to be missing a piece, it's not implemented yet — not hidden somewhere else.

## 5. Database, in plain terms

Five tables, three views. All in `sql/schema.sql`, which is the single source of truth — there is no ORM or migration tool, so schema changes are made by editing that file and re-running the changed statements.

| Table | Written by | Purpose |
|---|---|---|
| `founders` | client, on flow completion | one row per person who finished all 6 questions |
| `questions` / `question_options` | you, manually (seed.sql) | the content of the 6-question flow |
| `answers` | client, batched at completion | one row per (founder, question, chosen option) |
| `support_payments` | client, self-reported | "buy me a coffee" log |
| `contact_leads` | not yet wired to a UI | phone numbers from the (currently unbuilt) number-capture modal |

Views (`founding_wall`, `most_selected_options`, `support_stats`) exist so the client only ever reads pre-shaped, safe columns — it never queries a base table directly for anything containing `phone_number`.

Row Level Security is on for every table: public `insert`, no public `update`/`delete`. Editing existing data only happens from the Supabase dashboard.

## 6. What is NOT built yet (explicitly, so nothing is assumed)

- The number-capture popup UI (the `contact_leads` table exists; there's no modal calling it yet).
- The 3-branch logic for Q1 is seeded in `question_options.branch_target`, but `home.js` currently shows the same Q2–Q6 regardless of branch — the branching *data model* is there, the *conditional question set* is not wired up. Confirm the intended branching behavior before building this (see open question below).
- Payment gateway / webhook confirmation for support (TRD documents this as a v2 upgrade — v1 ships self-reported only).
- Any admin UI — content edits (questions, wall moderation) happen directly in Supabase's dashboard for now.
- Real Supabase project credentials — `src/lib/supabaseClient.js` has placeholder URL/key that must be replaced before this runs against real data.

## 7. Before running this for real

1. Create a Supabase project, run `sql/schema.sql` then `sql/seed.sql` in the SQL editor.
2. Replace `SUPABASE_URL` / `SUPABASE_ANON_KEY` in `src/lib/supabaseClient.js`.
3. Replace the placeholder UPI ID in `src/pages/support.js`.
4. Serve `index.html` from any static host (or `npx serve` locally) — no build step required.

## 8. Open decision (carried over from the TRD, still unresolved)

Does selecting a branch in Q1 change *which questions* appear in Q2–Q6, or just *the wording/options* of the same 6 questions? This determines whether `home.js`'s question-loading logic needs a filter on `branch_target` or not. Resolve this before extending the question flow further.
