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
  notes text default '',
  color text default 'var(--crimson-4)',
  "columns" int[] not null default '{1, 2}',
  "rows" int[] default '{1, 2}',
  "widthType" text default 'fill',
  "startTime" text default '09:00',
  "endTime" text default '10:00',
  created_at timestamptz default now()
);

-- If the table already exists, add time columns so block positions adapt when you change rows:
-- alter table public.blocks add column if not exists "startTime" text default '09:00';
-- alter table public.blocks add column if not exists "endTime" text default '10:00';
-- alter table public.blocks add column if not exists notes text default '';

-- Optional: enable Row Level Security (RLS) and allow anonymous read/write for the demo.
-- For production, replace with proper auth policies.
alter table public.blocks enable row level security;

create policy "Allow anonymous read and write for blocks"
  on public.blocks for all
  using (true)
  with check (true);
```

If you prefer not to use RLS, you can leave it disabled (the anon key will still work with default public access).

## 2b. Create the `swimlanes` table

Row times and deletions are stored in this table. In **SQL Editor**, run:

```sql
create table if not exists public.swimlanes (
  id text primary key,
  "start" text not null,
  "end" text not null,
  position int not null default 0
);

alter table public.swimlanes enable row level security;

create policy "Allow anonymous read and write for swimlanes"
  on public.swimlanes for all
  using (true)
  with check (true);
```

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

---

## Deploying to Vercel (blocks not loading / “access control checks”)

If blocks don’t load in production and you see **“Fetch API cannot load … due to access control checks”** or **“Load failed”**:

### 1. Use the correct env var names in Vercel

Create React App only exposes variables that start with **`REACT_APP_`**. In Vercel → your project → **Settings** → **Environment Variables**, set:

- **`REACT_APP_SUPABASE_URL`** = your Supabase project URL (e.g. `https://xxxx.supabase.co`)
- **`REACT_APP_SUPABASE_ANON_KEY`** = your Supabase **anon public** key (from Supabase → Project Settings → API)

Do **not** use `SUPABASE_URL` / `SUPABASE_ANON_KEY` alone; the React build will not see them and the app will fail to call Supabase.

Redeploy after changing env vars.

### 2. Allow your site in Supabase (if restricted)

In Supabase → **Project Settings** → **API**, check **“Restrict API requests to allowed origins”**. If it’s enabled, add your Vercel URL (e.g. `https://your-app.vercel.app`).

### 3. RLS on `blocks`

Ensure the `blocks` table has an RLS policy that allows anonymous read/write, as in step 2 (e.g. `using (true)` and `with check (true)` for the anon role). Otherwise the API will reject requests and the browser may report it as an access control error.
