-- ============================================================================
-- STUDIO OS — migration: add Nama Mandor / Nama Supervisor to projects
-- Run AFTER schema.sql in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

-- 1) extra columns on projects
alter table projects add column if not exists mandor     text default '';
alter table projects add column if not exists supervisor text default '';

-- 2) refresh create_project / update_project to read/write the new fields
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
