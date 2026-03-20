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

alter table public.projects enable row level security;

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
