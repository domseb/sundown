# Connecting to Supabase

The calendar app stores time blocks in Supabase. To use your own project:

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Create a new project and wait for it to be ready.
3. In the dashboard, open **Project Settings** → **API** and copy:
   - **Project URL**
   - **anon public** key (under Project API keys)

## 2. Create the `blocks` table

In the Supabase dashboard, open **SQL Editor** and run:

```sql
create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  title text default '',
  color text default 'var(--crimson-4)',
  "columns" int[] not null default '{1, 2}',
  "rows" int[] not null default '{1, 2}',
  "widthType" text default 'fill',
  created_at timestamptz default now()
);

-- Optional: enable Row Level Security (RLS) and allow anonymous read/write for the demo.
-- For production, replace with proper auth policies.
alter table public.blocks enable row level security;

create policy "Allow anonymous read and write for blocks"
  on public.blocks for all
  using (true)
  with check (true);
```

If you prefer not to use RLS, you can leave it disabled (the anon key will still work with default public access).

## 3. Set environment variables

**Frontend (React)**  
Copy `.env.example` to `.env.local` in the project root and set:

- `REACT_APP_SUPABASE_URL` = your Project URL  
- `REACT_APP_SUPABASE_ANON_KEY` = your anon public key  

**Backend (optional)**  
If you use the Express backend, copy `backend/.env.example` to `backend/.env` and set:

- `SUPABASE_URL` = your Project URL  
- `SUPABASE_ANON_KEY` = your anon public key  
- `PORT` = e.g. `5001`  

The app currently loads and saves blocks from the frontend using the Supabase client and your `REACT_APP_*` variables. The backend is only needed if you add server-side routes that use Supabase.

## 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Blocks will be loaded from and saved to your Supabase `blocks` table.
