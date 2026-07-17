-- いいねテーブル
-- Supabase ダッシュボードの SQL Editor で実行する

create table public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  study_log_id uuid not null references public.study_logs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, study_log_id)
);

alter table public.likes enable row level security;

-- ログインユーザーは誰のいいねでも閲覧できる（件数表示のため）
create policy "Authenticated users can view likes"
  on public.likes for select
  to authenticated
  using (true);

-- 本人のみ、いいねを付けられる
create policy "Users can insert own likes"
  on public.likes for insert
  with check (auth.uid() = user_id);

-- 本人のみ、自分のいいねを取り消せる
create policy "Users can delete own likes"
  on public.likes for delete
  using (auth.uid() = user_id);

create index likes_study_log_id_idx on public.likes (study_log_id);
