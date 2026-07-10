# Supabase

Database schema and security policies for Apexia.

## Apply the schema

**Option A — SQL editor (simplest):**
Open your project at https://app.supabase.com → **SQL Editor** → paste the
contents of [`schema.sql`](schema.sql) → **Run**.

**Option B — Supabase CLI:**

```bash
supabase link --project-ref <your-ref>
supabase db push        # or: psql "$DATABASE_URL" -f supabase/schema.sql
```

## What it creates

- `profiles` (1:1 with `auth.users`), `workouts`, `food_entries`,
  `supplements`, `supplement_logs`, `chat_messages`.
- **Row Level Security** on every table so a user can only read/write their own
  rows (`auth.uid() = user_id`).
- A trigger (`on_auth_user_created`) that inserts a `profiles` row automatically
  when a user signs up.

## Connecting the app

Put your project URL and anon key into `mobile/.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

The column names mirror `mobile/src/types` (camelCase in TS ↔ snake_case in SQL),
which makes wiring the on‑device store to Supabase CRUD straightforward.
