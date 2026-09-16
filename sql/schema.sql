-- Cuppilo database schema.
-- Run this once against a fresh Supabase project (SQL editor or `supabase db push`).
-- No ORM, no migrations framework — this file IS the schema. Edit it and re-run
-- statements manually when it changes; that's the whole workflow for this project's size.

-- ============================================================
-- 1. FOUNDERS — one row per person who completed all 6 questions.
--    A row is only created on flow completion, never on partial progress.
-- ============================================================
create table if not exists founders (
  id              uuid primary key default gen_random_uuid(),
  founder_number  serial unique,       -- sequential display number, e.g. shown as #42
  name            text not null,
  phone_number    text,                -- filled in later via the number-capture modal, optional
  cuppilo_id      text unique not null,-- short public code on the founder card, e.g. CPL-8F3K2
  qr_payload      text not null,       -- URL encoded into the QR image
  created_at      timestamptz not null default now()
);

-- cuppilo_id / qr_payload are generated server-side so the client can never spoof them.
create or replace function generate_cuppilo_id()
returns trigger as $$
begin
  new.cuppilo_id := 'CPL-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  new.qr_payload := 'https://cuppilo.app/wall?id=' || new.cuppilo_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_generate_cuppilo_id on founders;
create trigger trg_generate_cuppilo_id
  before insert on founders
  for each row execute function generate_cuppilo_id();

-- ============================================================
-- 2. QUESTIONS — editable content, so copy changes don't need a redeploy.
-- ============================================================
create table if not exists questions (
  id           int primary key,
  order_index  int not null,
  prompt       text not null,
  prompt_ml    text
);

create table if not exists question_options (
  id             serial primary key,
  question_id    int not null references questions(id) on delete cascade,
  option_text    text not null,
  option_text_ml text,
  order_index    int not null,
  branch_target  int  -- only meaningful for Q1: which branch of Q2-Q6 this option leads to
);

-- ============================================================
-- 3. ANSWERS — written in ONE batch insert when the flow completes.
--    Never written per-question, so an abandoned flow leaves zero rows.
-- ============================================================
create table if not exists answers (
  id           uuid primary key default gen_random_uuid(),
  founder_id   uuid not null references founders(id) on delete cascade,
  question_id  int not null references questions(id),
  option_id    int not null references question_options(id),
  created_at   timestamptz not null default now()
);

-- ============================================================
-- 4. SUPPORT PAYMENTS — "buy me a coffee". v1 is self-reported (see TRD §7,
--    Option A). founder_id is nullable because support can be anonymous.
-- ============================================================
create table if not exists support_payments (
  id          uuid primary key default gen_random_uuid(),
  founder_id  uuid references founders(id),
  amount      numeric not null check (amount > 0),
  provider    text not null default 'manual', -- 'manual' | 'upi' | 'razorpay'
  status      text not null default 'confirmed', -- 'confirmed' | 'pending'
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 5. CONTACT LEADS — phone numbers from the passive popup.
--    Decoupled from founders: someone can leave a number even if they never
--    finish the question flow.
-- ============================================================
create table if not exists contact_leads (
  id          uuid primary key default gen_random_uuid(),
  phone_number text not null,
  founder_id  uuid references founders(id),
  created_at  timestamptz not null default now()
);

-- ============================================================
-- VIEWS — the only things the client ever SELECTs from directly.
-- ============================================================

-- Public founding wall: name + id only, never phone_number.
create or replace view founding_wall as
  select founder_number, name, cuppilo_id, created_at
  from founders
  order by created_at asc;

-- Live "most selected" per question, used on the results screen at the end
-- of the question flow.
create or replace view most_selected_options as
  select
    q.id as question_id,
    o.id as option_id,
    o.option_text,
    count(a.id) as votes
  from question_options o
  join questions q on q.id = o.question_id
  left join answers a on a.option_id = o.id
  group by q.id, o.id, o.option_text
  order by q.id, votes desc;

-- Live support stats for the support page.
create or replace view support_stats as
  select
    count(*) as total_coffees,
    coalesce(sum(amount), 0) as total_raised
  from support_payments
  where status = 'confirmed';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table founders enable row level security;
alter table answers enable row level security;
alter table support_payments enable row level security;
alter table contact_leads enable row level security;

-- Anyone can create a founder / answer / support entry / lead — this is a
-- public campaign page, not a logged-in app. Nobody can update or delete
-- from the client; that only happens via the Supabase dashboard.
create policy "public can insert founders"        on founders          for insert with check (true);
create policy "public can insert answers"         on answers           for insert with check (true);
create policy "public can insert support_payments" on support_payments for insert with check (true);
create policy "public can insert contact_leads"    on contact_leads    for insert with check (true);

-- Read access to founders is only ever needed for the wall, which goes
-- through the founding_wall view below — never grant select on the raw
-- founders table's phone_number column to the anon role.
create policy "public can read founders for wall" on founders for select using (true);
revoke select (phone_number) on founders from anon;

-- Views inherit the querying role's table permissions in Postgres, so no
-- separate policy is needed for founding_wall / most_selected_options /
-- support_stats as long as the underlying table grants above are correct.
