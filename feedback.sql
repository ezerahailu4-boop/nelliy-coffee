-- Run this in your Supabase SQL Editor

create table feedback (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  overall text,
  coffee text,
  service text,
  wait text,
  cleanliness text,
  price text,
  recommend text,
  liked text,
  improve text
);

-- Allow anyone to insert (customers submitting survey)
alter table feedback enable row level security;

create policy "Anyone can insert feedback"
  on feedback for insert
  with check (true);

-- Only authenticated users (admin) can read
create policy "Authenticated users can read feedback"
  on feedback for select
  using (auth.role() = 'authenticated');
