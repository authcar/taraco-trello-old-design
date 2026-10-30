-- ============================================================================
-- STUDIO OS — Supabase schema, RLS, and authorization RPCs
-- ============================================================================
-- Run this in the Supabase SQL editor (or `supabase db push`) on a fresh project.
--
-- Security model
--   * Identity comes from Google OAuth (Supabase Auth) -> we only trust the
--     verified email.
--   * Role/division comes from the `members` table (email -> role + active),
--     managed by MASTER. NOTHING in the client decides access.
--   * READS are guarded by RLS SELECT policies (scoped per division).
--   * WRITES go through SECURITY DEFINER RPC functions that encode the business
--     rules (move stage, handover, finance guard, member admin). Base-table
--     write access is denied to clients, so the only way to mutate data is via
--     these audited functions. This is the server-side enforcement the
--     prototype could not provide.
-- ============================================================================

create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
do $$ begin
  create type member_role  as enum ('MASTER','SALES','DESIGN','PRODUCTION');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pipeline_key as enum ('MASTER','DESIGN','PRODUCTION');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists members (
  id         uuid primary key default gen_random_uuid(),
  email      citext not null unique,
  name       text   not null default '',
  role       member_role not null default 'DESIGN',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  client     text default '',
  type       text default 'Residential',
  location   text default '',
  mandor     text default '',
  supervisor text default '',
  budget     bigint default 0,           -- MASTER-only (enforced in RPCs)
  spent      bigint default 0,           -- MASTER-only
  start_date date,
  due_date   date,
  progress   int  default 0,
  notes      text default '',
  created_by citext,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists project_pipelines (
  project_id uuid not null references projects(id) on delete cascade,
  pipeline   pipeline_key not null,
  active     boolean not null default false,
  stage      text,
  updated_at timestamptz default now(),
  primary key (project_id, pipeline)
);

create table if not exists activity_log (
  id         bigint generated always as identity primary key,
  project_id uuid not null references projects(id) on delete cascade,
  role       member_role,
  text       text not null,
  created_at timestamptz default now()
);

create index if not exists idx_pp_pipeline_active on project_pipelines(pipeline, active);
create index if not exists idx_log_project        on activity_log(project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Identity helpers (SECURITY DEFINER so policies can read `members`
-- without recursing into its own RLS)
-- ---------------------------------------------------------------------------
create or replace function auth_member()
returns members language sql stable security definer set search_path = public as $$
  select * from members where email = auth.email() and active limit 1;
$$;

create or replace function my_role()
returns member_role language sql stable security definer set search_path = public as $$
  select role from members where email = auth.email() and active limit 1;
$$;

create or replace function is_master()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where email = auth.email() and active and role in ('MASTER','SALES'));
$$;

-- A project is visible to MASTER, or to a division whose pipeline is active on it.
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

-- ---------------------------------------------------------------------------
-- Row Level Security — READS (writes are RPC-only, see below)
-- ---------------------------------------------------------------------------
alter table members          enable row level security;
alter table projects         enable row level security;
alter table project_pipelines enable row level security;
alter table activity_log     enable row level security;

-- members: you can read your own row (to learn your role); MASTER reads all.
drop policy if exists members_select on members;
create policy members_select on members for select to authenticated
  using ( email = auth.email() or is_master() );

-- projects: visible if MASTER or your division is active on it.
drop policy if exists projects_select on projects;
create policy projects_select on projects for select to authenticated
  using ( can_see_project(id) );

-- pipelines: MASTER sees all rows; a division sees only its own pipeline rows.
drop policy if exists pp_select on project_pipelines;
create policy pp_select on project_pipelines for select to authenticated
  using ( is_master() or pipeline::text = my_role()::text );

-- activity log: readable for any project you can see.
drop policy if exists log_select on activity_log;
create policy log_select on activity_log for select to authenticated
  using ( can_see_project(project_id) );

-- NOTE: no INSERT/UPDATE/DELETE policies on base tables for clients => all
-- direct writes are denied. Mutations happen only through the RPCs below.

-- ---------------------------------------------------------------------------
-- Member administration (MASTER only) with last-master guard
-- ---------------------------------------------------------------------------
create or replace function active_master_count()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from members where role = 'MASTER' and active;
$$;

create or replace function add_member(p_email text, p_name text, p_role member_role)
returns members language plpgsql security definer set search_path = public as $$
declare row members;
begin
  if not is_master() then raise exception 'Only MASTER can manage members'; end if;
  insert into members(email, name, role, active)
    values (lower(p_email), coalesce(nullif(p_name,''), lower(p_email)), p_role, true)
    returning * into row;
  return row;
end; $$;

create or replace function set_member(p_id uuid, p_role member_role, p_active boolean)
returns members language plpgsql security definer set search_path = public as $$
declare target members; row members;
begin
  if not is_master() then raise exception 'Only MASTER can manage members'; end if;
  select * into target from members where id = p_id;
  -- prevent demoting/deactivating the last active MASTER
  if target.role = 'MASTER' and target.active
     and (p_role <> 'MASTER' or p_active = false)
     and active_master_count() <= 1 then
    raise exception 'Cannot remove the last active MASTER';
  end if;
  update members set role = p_role, active = p_active where id = p_id returning * into row;
  return row;
end; $$;

create or replace function delete_member(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare target members;
begin
  if not is_master() then raise exception 'Only MASTER can manage members'; end if;
  select * into target from members where id = p_id;
  if target.role = 'MASTER' and target.active and active_master_count() <= 1 then
    raise exception 'Cannot remove the last active MASTER';
  end if;
  delete from members where id = p_id;
end; $$;

-- ---------------------------------------------------------------------------
-- Project mutations (authorization encoded per function)
-- ---------------------------------------------------------------------------
create or replace function create_project(payload jsonb, context_pipe pipeline_key)
returns uuid language plpgsql security definer set search_path = public as $$
declare m members; new_id uuid;
begin
  m := auth_member();
  if m.id is null then raise exception 'Not authorized'; end if;

  insert into projects(code, name, client, type, location, mandor, supervisor, budget, spent, start_date, due_date, progress, notes, created_by)
  values (
    nullif(trim(coalesce(payload->>'code','')), ''),
    payload->>'name',
    coalesce(payload->>'client',''),
    coalesce(payload->>'type','Residential'),
    coalesce(payload->>'location',''),
    coalesce(payload->>'mandor',''),
    coalesce(payload->>'supervisor',''),
    case when m.role = 'MASTER' then coalesce((payload->>'budget')::bigint, 0) else 0 end,
    case when m.role = 'MASTER' then coalesce((payload->>'spent')::bigint, 0) else 0 end,
    nullif(payload->>'start','')::date,
    nullif(payload->>'due','')::date,
    coalesce((payload->>'progress')::int, 0),
    coalesce(payload->>'notes',''),
    m.email
  ) returning id into new_id;

  insert into project_pipelines(project_id, pipeline, active, stage)
    values (new_id, context_pipe, true, payload->>'stage');

  insert into activity_log(project_id, role, text)
    values (new_id, m.role, 'Created in ' || context_pipe::text);

  return new_id;
end; $$;

create or replace function update_project(pid uuid, payload jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare m members;
begin
  m := auth_member();
  if m.id is null or not can_see_project(pid) then raise exception 'Not authorized'; end if;

  update projects set
    name      = coalesce(payload->>'name', name),
    client    = coalesce(payload->>'client', client),
    type      = coalesce(payload->>'type', type),
    location  = coalesce(payload->>'location', location),
    mandor    = coalesce(payload->>'mandor', mandor),
    supervisor= coalesce(payload->>'supervisor', supervisor),
    start_date= nullif(payload->>'start','')::date,
    due_date  = nullif(payload->>'due','')::date,
    progress  = coalesce((payload->>'progress')::int, progress),
    notes     = coalesce(payload->>'notes', notes),
    -- finance fields only when MASTER
    budget    = case when m.role='MASTER' and payload ? 'budget' then (payload->>'budget')::bigint else budget end,
    spent     = case when m.role='MASTER' and payload ? 'spent'  then (payload->>'spent')::bigint  else spent  end,
    updated_at= now()
  where id = pid;

  -- optional stage update for the editing context pipeline
  if payload ? 'pipeline' and payload ? 'stage' then
    update project_pipelines
      set stage = payload->>'stage', updated_at = now()
      where project_id = pid and pipeline = (payload->>'pipeline')::pipeline_key;
  end if;
end; $$;

create or replace function move_stage(pid uuid, pk pipeline_key, to_stage text)
returns void language plpgsql security definer set search_path = public as $$
declare m members;
begin
  m := auth_member();
  if m.id is null then raise exception 'Not authorized'; end if;
  if m.role <> 'MASTER' and m.role <> 'SALES' and m.role::text <> pk::text then
    raise exception 'You can only move cards on your own board';
  end if;
  update project_pipelines set stage = to_stage, updated_at = now()
    where project_id = pid and pipeline = pk;
  insert into activity_log(project_id, role, text)
    values (pid, m.role, pk::text || ': -> ' || to_stage);

  -- PRODUCTION closing the loop: reaching Done there auto-marks the project
  -- Done on the MASTER pipeline too, so the two boards can't drift apart.
  if pk = 'PRODUCTION' and to_stage = 'done' then
    update project_pipelines set stage = 'done', active = true, updated_at = now()
      where project_id = pid and pipeline = 'MASTER' and stage <> 'done';
    if found then
      insert into activity_log(project_id, role, text)
        values (pid, m.role, 'Marked Done in Master Pipeline (auto)');
    end if;
  end if;
end; $$;

-- Open a project on another division's board (MASTER -> any; DESIGN -> PRODUCTION).
create or replace function handover(pid uuid, target pipeline_key, to_stage text)
returns void language plpgsql security definer set search_path = public as $$
declare m members;
begin
  m := auth_member();
  if m.id is null then raise exception 'Not authorized'; end if;
  if not (
       m.role = 'MASTER'
    or m.role = 'SALES'
    or (m.role = 'DESIGN' and target = 'PRODUCTION')
  ) then
    raise exception 'Handover not allowed for your role';
  end if;
  insert into project_pipelines(project_id, pipeline, active, stage)
    values (pid, target, true, to_stage)
  on conflict (project_id, pipeline) do update set active = true, stage = excluded.stage, updated_at = now();
  insert into activity_log(project_id, role, text)
    values (pid, m.role, 'Handed over to ' || target::text);
end; $$;

-- PRODUCTION closing the loop: mark the project Done on the MASTER pipeline.
create or replace function mark_master_done(pid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m members;
begin
  m := auth_member();
  if m.id is null or m.role <> 'PRODUCTION' then raise exception 'Not authorized'; end if;
  update project_pipelines set stage = 'done', active = true, updated_at = now()
    where project_id = pid and pipeline = 'MASTER';
  insert into activity_log(project_id, role, text)
    values (pid, m.role, 'Marked Done in Master Pipeline');
end; $$;

-- Remove a project from a single board (division leaves; record stays elsewhere).
create or replace function remove_from_board(pid uuid, pk pipeline_key)
returns void language plpgsql security definer set search_path = public as $$
declare m members;
begin
  m := auth_member();
  if m.id is null then raise exception 'Not authorized'; end if;
  if m.role <> 'MASTER' and m.role::text <> pk::text then
    raise exception 'You can only remove from your own board';
  end if;
  update project_pipelines set active = false, stage = null, updated_at = now()
    where project_id = pid and pipeline = pk;
  insert into activity_log(project_id, role, text)
    values (pid, m.role, 'Removed from ' || pk::text || ' pipeline');
end; $$;

-- Hard delete (MASTER only).
create or replace function delete_project(pid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_master() then raise exception 'Only MASTER can delete a project'; end if;
  delete from projects where id = pid;  -- cascades to pipelines + log
end; $$;

-- ---------------------------------------------------------------------------
-- Grants — let signed-in users call the RPCs (authz is inside each function)
-- ---------------------------------------------------------------------------
grant execute on function
  add_member(text,text,member_role), set_member(uuid,member_role,boolean), delete_member(uuid),
  create_project(jsonb,pipeline_key), update_project(uuid,jsonb),
  move_stage(uuid,pipeline_key,text), handover(uuid,pipeline_key,text),
  mark_master_done(uuid), remove_from_board(uuid,pipeline_key), delete_project(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime — push live changes to connected clients (idempotent)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['projects','project_pipelines','activity_log','members'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
