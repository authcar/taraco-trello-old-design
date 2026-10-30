-- ============================================================================
-- Migration: add SALES role with master-like visibility
-- Run in Supabase SQL editor.
-- ============================================================================

-- 1. Extend the enums to include SALES
alter type member_role  add value if not exists 'SALES';

-- 2. Update identity helpers to treat SALES like MASTER

create or replace function is_master()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members
    where email = auth.email() and active and role in ('MASTER','SALES')
  );
$$;

-- 3. Refresh can_see_project (it calls is_master() so it picks up the change
--    automatically, but re-create explicitly to be safe)
create or replace function can_see_project(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_master()
      or exists (
        select 1 from project_pipelines pp
        where pp.project_id = pid
          and pp.active
          and pp.pipeline::text = my_role()::text
      );
$$;

-- 4. pp_select policy: SALES (via is_master()) already gets full access through
--    the existing "is_master() or pipeline = my_role()" condition because
--    is_master() now returns true for SALES. Drop and re-create to be explicit.
drop policy if exists pp_select on project_pipelines;
create policy pp_select on project_pipelines for select to authenticated
  using ( is_master() or pipeline::text = my_role()::text );

-- 5. members_select: SALES can also read the full member list (same as MASTER)
drop policy if exists members_select on members;
create policy members_select on members for select to authenticated
  using ( email = auth.email() or is_master() );
