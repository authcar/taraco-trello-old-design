-- One-time backfill: projects already at Master stage "Production On Going"
-- (prod_ongoing) that were never handed over onto the Production board,
-- because that used to be a manual step. Safe to re-run — only touches
-- projects with no active PRODUCTION row yet.
with to_backfill as (
  select mp.project_id
  from project_pipelines mp
  left join project_pipelines pp
    on pp.project_id = mp.project_id and pp.pipeline = 'PRODUCTION'
  where mp.pipeline = 'MASTER'
    and mp.active = true
    and mp.stage = 'prod_ongoing'
    and (pp.project_id is null or pp.active = false)
)
insert into project_pipelines (project_id, pipeline, active, stage)
select project_id, 'PRODUCTION', true, 'production' from to_backfill
on conflict (project_id, pipeline) do update
  set active = true, stage = 'production', updated_at = now();
