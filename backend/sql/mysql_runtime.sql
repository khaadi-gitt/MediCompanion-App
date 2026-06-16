create table if not exists app_config (
  id int primary key,
  openai_enabled tinyint(1) not null default 0,
  openai_model varchar(120) not null default 'gpt-4o-mini',
  openai_api_key text not null,
  ai_provider enum('openai','local') not null default 'openai',
  local_api_url varchar(255) not null default 'http://127.0.0.1:11434',
  local_api_key text null,
  updated_at timestamp not null default current_timestamp on update current_timestamp
);

insert into app_config (id, openai_enabled, openai_model, openai_api_key, ai_provider, local_api_url, local_api_key)
values (1, 0, 'gpt-4o-mini', '', 'openai', 'http://127.0.0.1:11434', '')
on duplicate key update id = values(id);

create table if not exists chat_messages (
  id bigint auto_increment primary key,
  session_id char(36) not null,
  user_id char(36) null,
  role enum('user','assistant') not null,
  content text not null,
  created_at timestamp not null default current_timestamp,
  index idx_chat_session_created (session_id, created_at),
  index idx_chat_user_created (user_id, created_at)
);

create table if not exists training_examples (
  id bigint auto_increment primary key,
  enabled tinyint(1) not null default 1,
  system_prompt text null,
  user_input text not null,
  assistant_output text not null,
  created_at timestamp not null default current_timestamp
);
