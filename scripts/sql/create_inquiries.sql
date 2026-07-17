-- お問い合わせテーブル
-- Supabase ダッシュボードの SQL Editor で実行する

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('bug', 'feature', 'privacy', 'other')),
  message text not null check (char_length(message) between 1 and 2000),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.inquiries enable row level security;

-- 本人のみ作成できる
create policy "Users can insert own inquiries"
  on public.inquiries for insert
  with check (auth.uid() = user_id);

-- 本人のみ自分の問い合わせを閲覧できる（将来の履歴表示用）
create policy "Users can view own inquiries"
  on public.inquiries for select
  using (auth.uid() = user_id);

-- 更新・削除のポリシーは作らない（ユーザーからは不可、運営はダッシュボードから操作）

create index inquiries_user_id_created_at_idx on public.inquiries (user_id, created_at desc);
