-- NARO v2 — demo mode migration
-- Removes login/RLS friction for the MVP demo. Reversible: re-enable RLS to
-- restore multi-tenant behavior once auth is wired back in.

-- Allow inserts without an authenticated user (uploads now record created_by = null).
alter table assessments alter column created_by drop not null;

-- Keep the FK but make it tolerate profile deletion / missing references.
alter table assessments drop constraint if exists assessments_created_by_fkey;
alter table assessments
  add constraint assessments_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

-- Disable RLS on all tables so the anon key can read/write in demo mode.
-- Admin pages still query profiles (for user counts / listings), so profiles
-- needs to be readable too.
alter table firms disable row level security;
alter table profiles disable row level security;
alter table companies disable row level security;
alter table assessments disable row level security;
alter table signals disable row level security;

-- Relax storage policies for the documents bucket so uploads work without auth.
drop policy if exists "documents_firm_read" on storage.objects;
drop policy if exists "documents_firm_write" on storage.objects;

create policy "documents_demo_read" on storage.objects for select
  using (bucket_id = 'documents');

create policy "documents_demo_write" on storage.objects for insert
  with check (bucket_id = 'documents');
