create extension if not exists pgcrypto;

create table if not exists public.study_items (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null default (auth.jwt() ->> 'sub'),
  kind text not null check (kind in ('file', 'text', 'link')),
  name text not null,
  meta text not null,
  content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists study_items_clerk_user_created_idx
  on public.study_items (clerk_user_id, created_at desc);

alter table public.study_items enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.study_items to authenticated;

drop policy if exists "study items are readable by owner" on public.study_items;
create policy "study items are readable by owner"
  on public.study_items
  for select
  to authenticated
  using ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "study items are insertable by owner" on public.study_items;
create policy "study items are insertable by owner"
  on public.study_items
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "study items are updateable by owner" on public.study_items;
create policy "study items are updateable by owner"
  on public.study_items
  for update
  to authenticated
  using ((auth.jwt() ->> 'sub') = clerk_user_id)
  with check ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "study items are deletable by owner" on public.study_items;
create policy "study items are deletable by owner"
  on public.study_items
  for delete
  to authenticated
  using ((auth.jwt() ->> 'sub') = clerk_user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.touch_updated_at() from public;

drop trigger if exists study_items_touch_updated_at on public.study_items;
create trigger study_items_touch_updated_at
  before update on public.study_items
  for each row
  execute function public.touch_updated_at();
