-- ============================================================================
-- STUDIO OS — migration: shared member directory
-- Run AFTER schema.sql. Safe to re-run.
--
-- Problem: the original members RLS let a non-Master read ONLY their own row,
-- so Design/Production users couldn't pick other people to assign a project to,
-- and couldn't @mention anyone but themselves.
--
-- Fix: any ACTIVE member may read the team directory (name / email / role).
-- Finance figures live on `projects` (Master-only) and are unaffected.
-- ============================================================================

drop policy if exists members_select on members;
create policy members_select on members for select to authenticated
  using (
    email = auth.email()                 -- always see your own row
    or is_master()                       -- Master sees everyone (incl. inactive)
    or (my_role() is not null and active)-- any active member sees active members
  );
