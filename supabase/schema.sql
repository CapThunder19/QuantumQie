create table if not exists inventory (
  save_id text primary key,
  money bigint not null default 0,
  food bigint not null default 0,
  wheat bigint not null default 0,
  potato bigint not null default 0,
  rice bigint not null default 0,
  iron_ore bigint not null default 0,
  copper_ore bigint not null default 0,
  diamond bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists workers (
  save_id text not null,
  id text not null,
  type text not null,
  assigned_building_id text,
  updated_at timestamptz not null default now(),
  primary key (save_id, id)
);

create table if not exists buildings (
  save_id text not null,
  id text not null,
  def_id text not null,
  col integer not null,
  row integer not null,
  direction text not null,
  assigned_worker_id text,
  production_progress numeric not null default 0,
  ready_to_harvest boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (save_id, id)
);

create index if not exists buildings_save_id_idx on buildings (save_id);
create index if not exists workers_save_id_idx on workers (save_id);

create table if not exists market_listings (
  id text primary key,
  seller_address text not null,
  item_key text not null,
  quantity integer not null,
  unit_price_wei text not null,
  total_price_wei text not null,
  status text not null default 'open',
  buyer_address text,
  tx_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sold_at timestamptz
);

create index if not exists market_listings_status_idx on market_listings (status);
create index if not exists market_listings_seller_idx on market_listings (seller_address);
