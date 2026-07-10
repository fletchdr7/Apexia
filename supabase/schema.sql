-- Apexia database schema for Supabase (PostgreSQL)
-- Run this in the Supabase SQL editor, or via `supabase db push` with the CLI.
-- Every table is protected by Row Level Security so users only see their own data.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Athlete',
  sex text check (sex in ('male', 'female', 'other')),
  birth_year int,
  height_cm numeric,
  weight_kg numeric,
  target_weight_kg numeric,
  activity_level text,
  goal text check (goal in ('lose_fat', 'build_muscle', 'recomp', 'maintain', 'endurance')),
  weekly_workout_target int default 4,
  preferred_activities text[] default '{}',
  lifestyle text[] default '{}',
  dietary_preferences text[] default '{}',
  units text default 'imperial',
  targets jsonb,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Workouts
-- ---------------------------------------------------------------------------
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  performed_at timestamptz not null default now(),
  duration_min int not null default 0,
  intensity text,
  calories_burned int,
  distance_km numeric,
  notes text,
  exercises jsonb,
  source text default 'manual',
  created_at timestamptz not null default now()
);
create index if not exists workouts_user_perf_idx on public.workouts (user_id, performed_at desc);

-- ---------------------------------------------------------------------------
-- Food entries
-- ---------------------------------------------------------------------------
create table if not exists public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slot text check (slot in ('breakfast', 'lunch', 'dinner', 'snack')),
  logged_at timestamptz not null default now(),
  servings numeric not null default 1,
  nutrients jsonb not null,
  source text default 'manual',
  photo_url text,
  confidence numeric,
  created_at timestamptz not null default now()
);
create index if not exists food_user_logged_idx on public.food_entries (user_id, logged_at desc);

-- ---------------------------------------------------------------------------
-- Supplements (user's stack) + logs
-- ---------------------------------------------------------------------------
create table if not exists public.supplements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  brand text,
  form text,
  serving_size text,
  ingredients jsonb default '[]',
  purpose text,
  benefits text[] default '{}',
  cautions text[] default '{}',
  timing text,
  goal_fit numeric,
  created_at timestamptz not null default now()
);
create index if not exists supplements_user_idx on public.supplements (user_id);

create table if not exists public.supplement_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  supplement_id uuid references public.supplements (id) on delete set null,
  supplement_name text not null,
  taken_at timestamptz not null default now(),
  dose text
);
create index if not exists supplement_logs_user_idx on public.supplement_logs (user_id, taken_at desc);

-- ---------------------------------------------------------------------------
-- Coach chat history (optional)
-- ---------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_user_idx on public.chat_messages (user_id, created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.food_entries enable row level security;
alter table public.supplements enable row level security;
alter table public.supplement_logs enable row level security;
alter table public.chat_messages enable row level security;

-- Profiles: a user can manage only their own row (id == auth.uid()).
drop policy if exists "profiles_self" on public.profiles;
create policy "profiles_self" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Helper: identical owner policy for user_id-based tables.
do $$
declare t text;
begin
  foreach t in array array['workouts', 'food_entries', 'supplements', 'supplement_logs', 'chat_messages']
  loop
    execute format('drop policy if exists "%s_owner" on public.%I;', t, t);
    execute format(
      'create policy "%s_owner" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', 'Athlete'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Keep updated_at fresh on profiles
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();
