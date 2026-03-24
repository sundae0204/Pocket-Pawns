-- 《口袋棋兵》Supabase 資料表
-- 在 Supabase SQL Editor 執行後，於 Project Settings → API 複製 URL 與 anon key，
-- 填到 index.html 的 window.POCKET_PAWNS_SUPABASE_URL / window.POCKET_PAWNS_SUPABASE_ANON_KEY

create table if not exists public.character_stats (
  character_id text primary key,
  use_count int not null default 0,
  seven77_total int not null default 0,
  max_combo int not null default 0,
  combo_holder text not null default ''
);

create table if not exists public.battle_results (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  character_id text not null,
  character_name text not null,
  outcome text not null check (outcome in ('win', 'lose')),
  kills int not null default 0,
  used_777 boolean not null default false,
  seven77_draws int not null default 0,
  max_combo int not null default 0,
  broke_record boolean not null default false
);

-- 開發用：匿名金鑰可讀寫（上線請改為較嚴格 RLS 或改走 Edge Function）
alter table public.character_stats enable row level security;
alter table public.battle_results enable row level security;

create policy "character_stats_select" on public.character_stats for select using (true);
create policy "character_stats_insert" on public.character_stats for insert with check (true);
create policy "character_stats_update" on public.character_stats for update using (true);

create policy "battle_results_select" on public.battle_results for select using (true);
create policy "battle_results_insert" on public.battle_results for insert with check (true);
