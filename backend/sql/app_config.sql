create table if not exists public.app_config (
  id integer primary key,
  openai_enabled boolean not null default false,
  openai_model text not null default 'gpt-4o-mini',
  openai_api_key text not null default '',
  ai_provider text not null default 'openai',
  local_api_url text not null default 'http://127.0.0.1:11434',
  local_api_key text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.app_config add column if not exists ai_provider text not null default 'openai';
alter table public.app_config add column if not exists local_api_url text not null default 'http://127.0.0.1:11434';
alter table public.app_config add column if not exists local_api_key text not null default '';

insert into public.app_config (id, openai_enabled, openai_model, openai_api_key, ai_provider, local_api_url, local_api_key)
values (1, false, 'gpt-4o-mini', '', 'openai', 'http://127.0.0.1:11434', '')
on conflict (id) do nothing;
