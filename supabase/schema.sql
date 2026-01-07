create extension if not exists "pgcrypto";

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  is_group_admin boolean not null default false,
  is_program_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  title text not null,
  amount_cents integer not null check (amount_cents > 0),
  payer_member_id uuid not null references members(id),
  created_at timestamptz not null default now()
);

create table if not exists expense_shares (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  weight integer not null,
  share_cents integer not null check (share_cents >= 0),
  created_at timestamptz not null default now(),
  unique (expense_id, member_id)
);

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  from_member_id uuid not null references members(id),
  to_member_id uuid not null references members(id),
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_members_group on members(group_id);
create index if not exists idx_expenses_group on expenses(group_id);
create index if not exists idx_expense_shares_expense on expense_shares(expense_id);
create index if not exists idx_settlements_group on settlements(group_id);
