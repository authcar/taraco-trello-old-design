-- One-time backfill: projects whose Production-pipeline card already reached
-- "Done" before move_stage() started auto-closing the loop on the Master
-- pipeline (e.g. "V House") — Master was left stuck at an earlier stage such
-- as "Production On Going". Safe to re-run.
update project_pipelines mp
set stage = 'done', active = true, updated_at = now()
from project_pipelines pp
where mp.project_id = pp.project_id
  and mp.pipeline = 'MASTER'
  and mp.stage <> 'done'
  and pp.pipeline = 'PRODUCTION'
  and pp.active = true
  and pp.stage = 'done';
