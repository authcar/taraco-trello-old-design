-- One-time backfill: projects whose Master stage already says "Production On
-- Going" but whose own Production-pipeline card is still sitting at the very
-- first column ("New Project") — leftover from before the app auto-advanced
-- the Production stage on handover. Safe to re-run.
update project_pipelines pp
set stage = 'production', updated_at = now()
from project_pipelines mp
where pp.project_id = mp.project_id
  and mp.pipeline = 'MASTER'
  and mp.active = true
  and mp.stage = 'prod_ongoing'
  and pp.pipeline = 'PRODUCTION'
  and pp.active = true
  and pp.stage = 'new';
