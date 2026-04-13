-- Run this in Supabase SQL Editor to add name/table fields
alter table feedback add column if not exists name text;
alter table feedback add column if not exists table_number text;
