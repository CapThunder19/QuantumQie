create table if not exists inventory (
  save_id text primary key,
  money bigint not null default 0,
  food bigint not null default 0,
  iron_ore bigint not null default 0,
  copper_ore bigint not null default 0,
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
