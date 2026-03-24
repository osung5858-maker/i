-- 리뷰 테이블
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  place_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  content text not null,
  tags text[] default null,
  child_age_months integer default null,
  created_at timestamptz default now(),
  unique(place_id, user_id)
);

-- RLS
alter table public.reviews enable row level security;

-- 누구나 조회 가능
create policy "reviews_select" on public.reviews
  for select using (true);

-- 본인만 작성
create policy "reviews_insert" on public.reviews
  for insert with check (auth.uid() = user_id);

-- 본인만 삭제
create policy "reviews_delete" on public.reviews
  for delete using (auth.uid() = user_id);

-- 인덱스
create index if not exists idx_reviews_place on public.reviews(place_id);
create index if not exists idx_reviews_user on public.reviews(user_id);
