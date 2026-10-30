-- ============================================================================
-- STUDIO OS — migration: assignee, checklist, named activity, mentions
-- Run AFTER schema.sql and migration_detail.sql. Safe to re-run.
-- Adds:
--   * projects.assignees (jsonb)     — who holds the project, 1+ people (set_assignees RPC)
--   * project_checklist              — interactive checklist items (set_checklist RPC)
--   * activity_log.actor_name        — so the feed shows the person, not just the division
-- Comments already store author_name (migration_detail.sql); @mentions live inside
-- the comment body text, so they need no schema change.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Assignees (a project can be held by more than one person)
-- ---------------------------------------------------------------------------
alter table projects add column if not exists assignees jsonb not null default '[]'::jsonb;

-- Replace the whole assignee set with the given array of emails. Only active
-- members are kept; anyone who can see the project may change it.
create or replace function set_assignees(pid uuid, items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare m members; cleaned jsonb;
begin
  m := auth_member();
  if m.id is null or not can_see_project(pid) then raise exception 'Not authorized'; end if;

  cleaned := coalesce((
    select jsonb_agg(distinct lower(e))
    from jsonb_array_elements_text(coalesce(items, '[]'::jsonb)) e
    where exists (select 1 from members mm where mm.email = lower(e) and mm.active)
  ), '[]'::jsonb);

  update projects set assignees = cleaned, updated_at = now() where id = pid;
  insert into activity_log(project_id, role, actor_name, text)
    values (pid, m.role, m.name, 'Updated assignees');
end; $$;

-- ---------------------------------------------------------------------------
-- 2) Checklist
-- ---------------------------------------------------------------------------
create table if not exists project_checklist (
  id         bigint generated always as identity primary key,
  project_id uuid not null references projects(id) on delete cascade,
  text       text not null,
  done       boolean not null default false,
  position   int not null default 0,
  created_at timestamptz default now()
);
create index if not exists idx_checklist_project on project_checklist(project_id, position);

alter table project_checklist enable row level security;
drop policy if exists checklist_select on project_checklist;
create policy checklist_select on project_checklist for select to authenticated
  using ( can_see_project(project_id) );

-- Replace the whole checklist for a project with the given array of {text, done}.
create or replace function set_checklist(pid uuid, items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare m members;
begin
  m := auth_member();
  if m.id is null or not can_see_project(pid) then raise exception 'Not authorized'; end if;
  delete from project_checklist where project_id = pid;
  insert into project_checklist(project_id, text, done, position)
  select pid, x->>'text', coalesce((x->>'done')::boolean, false), (ord - 1)::int
  from jsonb_array_elements(coalesce(items, '[]'::jsonb)) with ordinality as t(x, ord)
  where coalesce(trim(x->>'text'), '') <> '';
end; $$;

-- ---------------------------------------------------------------------------
-- 3) Named activity — record WHO acted, not only their division.
--    These `create or replace` the originals in schema.sql, adding actor_name.
-- ---------------------------------------------------------------------------
alter table activity_log add column if not exists actor_name text;

create or replace function create_project(payload jsonb, context_pipe pipeline_key)
returns uuid language plpgsql security definer set search_path = public as $$
declare m members; new_id uuid;
begin
  m := auth_member();
  if m.id is null then raise exception 'Not authorized'; end if;

  insert into projects(name, client, type, location, budget, spent, start_date, due_date, progress, notes, created_by)
  values (
    payload->>'name',
    coalesce(payload->>'client',''),
    coalesce(payload->>'type','Residential'),
    coalesce(payload->>'location',''),
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

  insert into activity_log(project_id, role, actor_name, text)
    values (new_id, m.role, m.name, 'Created in ' || context_pipe::text);

  return new_id;
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
  insert into activity_log(project_id, role, actor_name, text)
    values (pid, m.role, m.name, pk::text || ': -> ' || to_stage);
end; $$;

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
  insert into activity_log(project_id, role, actor_name, text)
    values (pid, m.role, m.name, 'Handed over to ' || target::text);
end; $$;

create or replace function mark_master_done(pid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m members;
begin
  m := auth_member();
  if m.id is null or m.role <> 'PRODUCTION' then raise exception 'Not authorized'; end if;
  update project_pipelines set stage = 'done', active = true, updated_at = now()
    where project_id = pid and pipeline = 'MASTER';
  insert into activity_log(project_id, role, actor_name, text)
    values (pid, m.role, m.name, 'Marked Done in Master Pipeline');
end; $$;

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
  insert into activity_log(project_id, role, actor_name, text)
    values (pid, m.role, m.name, 'Removed from ' || pk::text || ' pipeline');
end; $$;

-- ---------------------------------------------------------------------------
-- 4) Grants + realtime
-- ---------------------------------------------------------------------------
grant execute on function set_assignees(uuid, jsonb), set_checklist(uuid, jsonb) to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'project_checklist') then
    alter publication supabase_realtime add table project_checklist;
  end if;
end $$;
