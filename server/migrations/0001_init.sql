create table if not exists products (
  id bigserial primary key,
  product_code varchar(64) not null unique,
  name varchar(128) not null,
  status varchar(32) not null default 'active',
  description text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists plans (
  id bigserial primary key,
  product_id bigint not null references products(id),
  plan_code varchar(64) not null,
  name varchar(128) not null,
  status varchar(32) not null default 'active',
  duration_days int not null,
  max_devices int not null,
  max_concurrency int not null default 1,
  grace_hours int not null default 24,
  feature_flags jsonb not null default '{}',
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  unique(product_id, plan_code)
);

create table if not exists licenses (
  id bigserial primary key,
  license_key varchar(128) not null unique,
  product_id bigint not null references products(id),
  plan_id bigint not null references plans(id),
  status varchar(32) not null default 'active',
  customer_id bigint,
  channel_id bigint,
  issued_at timestamp not null default now(),
  activate_at timestamp,
  expire_at timestamp,
  max_devices_override int,
  max_concurrency_override int,
  feature_flags_override jsonb,
  notes text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index if not exists idx_licenses_product_status on licenses(product_id, status);

create table if not exists devices (
  id bigserial primary key,
  license_id bigint not null references licenses(id),
  device_code varchar(64) not null unique,
  fingerprint_hash varchar(128) not null,
  device_name varchar(128) not null,
  os_type varchar(32) not null,
  os_version varchar(64) not null,
  app_version varchar(64) not null,
  hardware_summary jsonb not null default '{}',
  status varchar(32) not null default 'active',
  first_activate_at timestamp not null default now(),
  last_seen_at timestamp not null default now(),
  last_ip varchar(64),
  unbind_count int not null default 0,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index if not exists idx_devices_license_status on devices(license_id, status);
create index if not exists idx_devices_last_seen_at on devices(last_seen_at);

create table if not exists leases (
  id bigserial primary key,
  license_id bigint not null references licenses(id),
  device_id bigint not null references devices(id),
  lease_token_id varchar(64) not null unique,
  issued_at timestamp not null default now(),
  expire_at timestamp not null,
  nonce varchar(64) not null,
  status varchar(32) not null default 'active',
  client_version varchar(64) not null,
  signature text not null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index if not exists idx_leases_license_device on leases(license_id, device_id);
create index if not exists idx_leases_expire_at on leases(expire_at);

create table if not exists activation_logs (
  id bigserial primary key,
  license_id bigint references licenses(id),
  device_id bigint references devices(id),
  result_code varchar(64) not null,
  message varchar(255) not null,
  ip varchar(64),
  user_agent varchar(255),
  request_payload jsonb not null default '{}',
  created_at timestamp not null default now()
);
create index if not exists idx_activation_logs_license_created on activation_logs(license_id, created_at);
create index if not exists idx_activation_logs_result_code on activation_logs(result_code);

create table if not exists heartbeat_logs (
  id bigserial primary key,
  license_id bigint references licenses(id),
  device_id bigint references devices(id),
  lease_id bigint references leases(id),
  action_type varchar(32) not null,
  result_code varchar(64) not null,
  ip varchar(64),
  payload jsonb not null default '{}',
  created_at timestamp not null default now()
);
create index if not exists idx_heartbeat_logs_license_created on heartbeat_logs(license_id, created_at);
create index if not exists idx_heartbeat_logs_device_created on heartbeat_logs(device_id, created_at);

create table if not exists audit_logs (
  id bigserial primary key,
  actor_type varchar(32) not null,
  actor_id bigint,
  target_type varchar(32) not null,
  target_id bigint,
  action varchar(64) not null,
  before_data jsonb,
  after_data jsonb,
  ip varchar(64),
  created_at timestamp not null default now()
);
create index if not exists idx_audit_logs_actor on audit_logs(actor_type, actor_id);
create index if not exists idx_audit_logs_target on audit_logs(target_type, target_id);

create table if not exists version_policies (
  id bigserial primary key,
  product_id bigint not null references products(id),
  min_supported_version varchar(64) not null,
  latest_version varchar(64) not null,
  force_upgrade boolean not null default false,
  download_url text,
  notice text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists admins (
  id bigserial primary key,
  username varchar(64) not null unique,
  password_hash varchar(255) not null,
  role_code varchar(64) not null,
  status varchar(32) not null default 'active',
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
