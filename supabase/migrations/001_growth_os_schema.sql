-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  VEE URBAN VOGUE — GROWTH OS DATABASE SCHEMA
--  Migration: 001_growth_os_schema.sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── CLIENT PIPELINE ──────────────────────────────────────────────

create table if not exists clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  event_type  text,
  stage       text not null default 'lead'
                check (stage in ('lead','conversation','quoted','deposit','production','delivered')),
  price       integer default 0,
  notes       text default '',
  created_at  timestamp with time zone default now()
);

-- ── PIPELINE HISTORY ─────────────────────────────────────────────

create table if not exists pipeline (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references clients(id) on delete cascade,
  stage       text not null,
  notes       text default '',
  created_at  timestamp with time zone default now()
);

-- ── REVENUE ──────────────────────────────────────────────────────

create table if not exists revenue (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references clients(id) on delete set null,
  amount      integer not null default 0,
  source      text default 'direct',
  created_at  timestamp with time zone default now()
);

-- ── TREND SIGNALS ────────────────────────────────────────────────

create table if not exists trend_signals (
  id               uuid primary key default gen_random_uuid(),
  platform         text not null,
  hashtag          text not null,
  engagement_score integer default 0,
  sample_post      text default '',
  created_at       timestamp with time zone default now()
);

-- ── POTENTIAL CLIENTS ────────────────────────────────────────────

create table if not exists potential_clients (
  id            uuid primary key default gen_random_uuid(),
  username      text not null,
  platform      text not null,
  profile_url   text default '',
  event_type    text default '',
  post_link     text default '',
  discovered_at timestamp with time zone default now()
);

-- ── EVENT SIGNALS ────────────────────────────────────────────────

create table if not exists event_signals (
  id               uuid primary key default gen_random_uuid(),
  username         text not null,
  platform         text not null,
  post_link        text default '',
  signal_type      text not null,
  engagement_score integer default 0,
  created_at       timestamp with time zone default now()
);

-- ── OUTREACH LOGS ────────────────────────────────────────────────

create table if not exists outreach_logs (
  id               uuid primary key default gen_random_uuid(),
  client_username  text not null,
  platform         text not null,
  message          text default '',
  status           text default 'sent',
  sent_at          timestamp with time zone default now()
);

-- ── AI DECISIONS ─────────────────────────────────────────────────

create table if not exists growth_decisions (
  id              uuid primary key default gen_random_uuid(),
  action          text not null,
  reason          text default '',
  expected_impact text default '',
  created_at      timestamp with time zone default now()
);

-- ── DAILY BRIEFINGS ──────────────────────────────────────────────

create table if not exists daily_briefings (
  id         uuid primary key default gen_random_uuid(),
  summary    text not null,
  created_at timestamp with time zone default now()
);

-- ── AUTOMATION LOGS ──────────────────────────────────────────────

create table if not exists automation_logs (
  id          uuid primary key default gen_random_uuid(),
  task_name   text not null,
  status      text not null default 'success',
  details     text default '',
  executed_at timestamp with time zone default now()
);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────
-- Enable RLS on all tables (auth.uid() scoping can be added per policy)

alter table clients          enable row level security;
alter table pipeline         enable row level security;
alter table revenue          enable row level security;
alter table trend_signals    enable row level security;
alter table potential_clients enable row level security;
alter table event_signals    enable row level security;
alter table outreach_logs    enable row level security;
alter table growth_decisions enable row level security;
alter table daily_briefings  enable row level security;
alter table automation_logs  enable row level security;

-- Open read/write policies for authenticated users
-- (Tighten these per-user with auth.uid() when multi-tenant support is needed)

create policy "auth read clients"           on clients          for all to authenticated using (true) with check (true);
create policy "auth read pipeline"          on pipeline         for all to authenticated using (true) with check (true);
create policy "auth read revenue"           on revenue          for all to authenticated using (true) with check (true);
create policy "auth read trend_signals"     on trend_signals    for all to authenticated using (true) with check (true);
create policy "auth read potential_clients" on potential_clients for all to authenticated using (true) with check (true);
create policy "auth read event_signals"     on event_signals    for all to authenticated using (true) with check (true);
create policy "auth read outreach_logs"     on outreach_logs    for all to authenticated using (true) with check (true);
create policy "auth read growth_decisions"  on growth_decisions for all to authenticated using (true) with check (true);
create policy "auth read daily_briefings"   on daily_briefings  for all to authenticated using (true) with check (true);
create policy "auth read automation_logs"   on automation_logs  for all to authenticated using (true) with check (true);
