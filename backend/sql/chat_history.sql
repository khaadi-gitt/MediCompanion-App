create extension if not exists pgcrypto;

create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_user_created_idx
  on public.chat_messages (user_id, created_at desc);

create index if not exists chat_messages_session_created_idx
  on public.chat_messages (session_id, created_at desc);

alter table public.chat_messages enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'chat_messages'
      and policyname = 'chat_messages_select_own'
  ) then
    create policy chat_messages_select_own
      on public.chat_messages
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'chat_messages'
      and policyname = 'chat_messages_delete_own'
  ) then
    create policy chat_messages_delete_own
      on public.chat_messages
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;
