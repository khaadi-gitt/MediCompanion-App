create table if not exists users (
  id char(36) primary key,
  full_name varchar(120) not null,
  email varchar(190) not null unique,
  password_hash varchar(255) not null,
  photo_url text null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp
);

create table if not exists otp_codes (
  id bigint auto_increment primary key,
  email varchar(190) not null,
  purpose enum('signup','reset') not null,
  otp_hash char(64) not null,
  payload_json text null,
  used tinyint(1) not null default 0,
  expires_at datetime not null,
  created_at timestamp not null default current_timestamp,
  index idx_otp_lookup (email, purpose, used, expires_at)
);
