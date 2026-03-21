-- Create users table
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('admin', 'department_head', 'project_manager', 'user')),
  department_id bigint references public.departments(id),
  status text not null default 'pending_approval' check (status in ('pending_approval', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create departments table
create table if not exists public.departments (
  id bigint generated always as identity primary key,
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create initiatives table
create table if not exists public.initiatives (
  id bigint generated always as identity primary key,
  name text not null,
  department_id bigint not null references public.departments(id) on delete restrict,
  owner text,
  status text not null default 'planned' check (status in ('planned', 'in-progress', 'blocked', 'done')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.users enable row level security;
alter table public.departments enable row level security;
alter table public.initiatives enable row level security;

-- RLS policies for users (admins only)
create policy "Admins can view all users"
  on public.users for select
  using (auth.jwt() ->> 'role' = 'admin');

  
create policy "Users can view themselves"
  on public.users for select
  using (auth.uid() = id);

-- RLS policies for departments (all authenticated can view)
create policy "All can view departments"
  on public.departments for select
  using (true);

create policy "Admins can insert departments"
  on public.departments for insert
  to authenticated
  with check (auth.jwt() ->> 'role' = 'admin');

-- RLS policies for initiatives (all authenticated can view)
create policy "All can view initiatives"
  on public.initiatives for select
  using (true);

create policy "Department heads can insert their initiatives"
  on public.initiatives for insert
  to authenticated
  with check (auth.jwt() ->> 'role' in ('department_head', 'admin'));

create policy "Department heads can update their initiatives"
  on public.initiatives for update
  to authenticated
  using (auth.jwt() ->> 'role' in ('department_head', 'admin'))
  with check (auth.jwt() ->> 'role' in ('department_head', 'admin'));

-- Create sessions table for express-session
create table if not exists "session" (
  "sid" varchar not null collate "default",
  "sess" json not null,
  "expire" timestamp(6) not null,
  primary key ("sid")
)
with (oids = false);
