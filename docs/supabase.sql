create table if not exists public.projects (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  status text not null default 'planned',
  progress integer not null default 0,
  source_url text,
  repository_url text,
  clone_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.departments (
  id bigint generated always as identity primary key,
  name text not null,
  lead text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.initiatives (
  id bigint generated always as identity primary key,
  name text not null,
  department_id bigint not null references public.departments(id) on delete restrict,
  owner text,
  status text not null default 'planned',
  progress integer not null default 0,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.departments enable row level security;
alter table public.initiatives enable row level security;

create policy "Allow anon select"
on public.projects
for select
to anon
using (true);

create policy "Allow anon insert"
on public.projects
for insert
to anon
with check (true);

create policy "Allow anon update"
on public.projects
for update
to anon
using (true)
with check (true);

create policy "Allow anon delete"
on public.projects
for delete
to anon
using (true);

create policy "Allow anon select departments"
on public.departments
for select
to anon
using (true);

create policy "Allow anon insert departments"
on public.departments
for insert
to anon
with check (true);

create policy "Allow anon update departments"
on public.departments
for update
to anon
using (true)
with check (true);

create policy "Allow anon delete departments"
on public.departments
for delete
to anon
using (true);

create policy "Allow anon select initiatives"
on public.initiatives
for select
to anon
using (true);

create policy "Allow anon insert initiatives"
on public.initiatives
for insert
to anon
with check (true);

create policy "Allow anon update initiatives"
on public.initiatives
for update
to anon
using (true)
with check (true);

create policy "Allow anon delete initiatives"
on public.initiatives
for delete
to anon
using (true);
