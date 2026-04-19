-- NARO v2 — initial schema
-- Apply in Supabase SQL editor on a fresh project, then run supabase/seed.sql.

-- Extensions
create extension if not exists pgcrypto;

-- ==============================================================
-- TABLES
-- ==============================================================

create table if not exists firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  firm_id uuid references firms on delete set null,
  full_name text,
  role text check (role in ('super_admin', 'gp', 'operating_partner', 'read_only')) default 'operating_partner',
  created_at timestamptz default now()
);

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid references firms on delete cascade not null,
  name text not null,
  slug text not null,
  industry text,
  hold_start_date date,
  created_at timestamptz default now(),
  unique(firm_id, slug)
);

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies on delete cascade not null,
  risk_score integer check (risk_score between 0 and 100),
  status text check (status in ('healthy', 'moderate', 'elevated', 'critical')),
  scoring_model_version text default 'ORS-LITE-1.0',
  source_type text check (source_type in ('csv', 'document', 'diagnostic', 'manual')) default 'manual',
  notes text,
  created_by uuid references profiles,
  created_at timestamptz default now()
);

create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments on delete cascade not null,
  signal_type text not null,
  category text check (category in ('operational_stability', 'systems_reliability', 'organizational_capacity')) not null,
  severity text check (severity in ('none', 'mild', 'moderate', 'severe')) not null,
  contribution integer not null,
  evidence text,
  raw_value text,
  created_at timestamptz default now()
);

create index if not exists idx_companies_firm on companies(firm_id);
create index if not exists idx_assessments_company on assessments(company_id);
create index if not exists idx_assessments_created on assessments(created_at desc);
create index if not exists idx_signals_assessment on signals(assessment_id);
create index if not exists idx_profiles_firm on profiles(firm_id);

-- ==============================================================
-- RLS HELPERS
-- Use SECURITY DEFINER functions so policies can check the current
-- user's role and firm without triggering recursive RLS on profiles.
-- ==============================================================

create or replace function auth_role() returns text
language sql stable security definer set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function auth_firm_id() returns uuid
language sql stable security definer set search_path = public
as $$
  select firm_id from profiles where id = auth.uid()
$$;

create or replace function is_super_admin() returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select role = 'super_admin' from profiles where id = auth.uid()), false)
$$;

-- ==============================================================
-- RLS
-- ==============================================================

alter table firms enable row level security;
alter table profiles enable row level security;
alter table companies enable row level security;
alter table assessments enable row level security;
alter table signals enable row level security;

-- Firms: super_admin sees all; user sees only own firm
drop policy if exists firms_select on firms;
create policy firms_select on firms for select
  using (is_super_admin() or id = auth_firm_id());

drop policy if exists firms_write on firms;
create policy firms_write on firms for all
  using (is_super_admin())
  with check (is_super_admin());

-- Profiles: user sees own; super_admin sees all; any authenticated user in the
-- same firm can see peer profiles (for the left rail + admin UIs).
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select
  using (
    id = auth.uid()
    or is_super_admin()
    or (firm_id is not null and firm_id = auth_firm_id())
  );

drop policy if exists profiles_write_self on profiles;
create policy profiles_write_self on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_admin_write on profiles;
create policy profiles_admin_write on profiles for all
  using (is_super_admin())
  with check (is_super_admin());

-- Companies: super_admin sees all; firm members see their firm's companies
drop policy if exists companies_select on companies;
create policy companies_select on companies for select
  using (is_super_admin() or firm_id = auth_firm_id());

drop policy if exists companies_write on companies;
create policy companies_write on companies for all
  using (is_super_admin() or (firm_id = auth_firm_id() and auth_role() in ('operating_partner', 'gp')))
  with check (is_super_admin() or (firm_id = auth_firm_id() and auth_role() in ('operating_partner', 'gp')));

-- Assessments: scoped through company -> firm
drop policy if exists assessments_select on assessments;
create policy assessments_select on assessments for select
  using (
    is_super_admin()
    or exists (
      select 1 from companies c
      where c.id = assessments.company_id and c.firm_id = auth_firm_id()
    )
  );

drop policy if exists assessments_write on assessments;
create policy assessments_write on assessments for all
  using (
    is_super_admin()
    or exists (
      select 1 from companies c
      where c.id = assessments.company_id
        and c.firm_id = auth_firm_id()
        and auth_role() in ('operating_partner', 'gp')
    )
  )
  with check (
    is_super_admin()
    or exists (
      select 1 from companies c
      where c.id = assessments.company_id
        and c.firm_id = auth_firm_id()
        and auth_role() in ('operating_partner', 'gp')
    )
  );

-- Signals: scoped through assessment -> company -> firm
drop policy if exists signals_select on signals;
create policy signals_select on signals for select
  using (
    is_super_admin()
    or exists (
      select 1 from assessments a
      join companies c on c.id = a.company_id
      where a.id = signals.assessment_id and c.firm_id = auth_firm_id()
    )
  );

drop policy if exists signals_write on signals;
create policy signals_write on signals for all
  using (
    is_super_admin()
    or exists (
      select 1 from assessments a
      join companies c on c.id = a.company_id
      where a.id = signals.assessment_id
        and c.firm_id = auth_firm_id()
        and auth_role() in ('operating_partner', 'gp')
    )
  )
  with check (
    is_super_admin()
    or exists (
      select 1 from assessments a
      join companies c on c.id = a.company_id
      where a.id = signals.assessment_id
        and c.firm_id = auth_firm_id()
        and auth_role() in ('operating_partner', 'gp')
    )
  );

-- ==============================================================
-- STORAGE BUCKET — documents (for stubbed document upload)
-- ==============================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents_firm_read" on storage.objects;
create policy "documents_firm_read" on storage.objects for select
  using (
    bucket_id = 'documents'
    and (
      is_super_admin()
      or exists (
        select 1 from companies c
        where c.firm_id = auth_firm_id()
          and (storage.foldername(name))[1] = c.id::text
      )
    )
  );

drop policy if exists "documents_firm_write" on storage.objects;
create policy "documents_firm_write" on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (
      is_super_admin()
      or exists (
        select 1 from companies c
        where c.firm_id = auth_firm_id()
          and (storage.foldername(name))[1] = c.id::text
          and auth_role() in ('operating_partner', 'gp')
      )
    )
  );
