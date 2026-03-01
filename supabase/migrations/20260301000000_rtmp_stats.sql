-- Single-row table that the stats-pusher container upserts every 5 seconds.
-- Row id=1 is always the current relay state.
create table if not exists public.rtmp_stats (
  id           integer primary key default 1,
  live         boolean  not null default false,
  bw_in        integer  not null default 0,   -- bytes/sec incoming from Mevo
  width        integer  not null default 0,
  height       integer  not null default 0,
  push_count   integer  not null default 0,   -- number of active push destinations
  src_connected boolean not null default false,
  updated_at   timestamptz not null default now()
);

-- Seed the single row so upserts never fail on a cold start
insert into public.rtmp_stats (id) values (1) on conflict (id) do nothing;

-- Allow the anon key (used by the stats-pusher) to read and write
alter table public.rtmp_stats enable row level security;

create policy "public read"
  on public.rtmp_stats for select using (true);

create policy "service write"
  on public.rtmp_stats for all using (true) with check (true);
