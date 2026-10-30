-- ============================================================================
-- STUDIO OS — bootstrap data
-- ============================================================================
-- Run AFTER schema.sql, in the Supabase SQL editor (runs as owner, so it
-- bypasses RLS — this is the only way to create the FIRST master, since
-- add_member() requires you to already be a master).
--
-- 1) Replace the email below with the Google account that will be the owner.
-- 2) That person signs in with Google -> they become MASTER and can invite
--    everyone else from the in-app "Anggota" screen.
-- ============================================================================

insert into members (email, name, role, active) values
  ('owner@gmail.com', 'Demo Owner', 'MASTER', true)
on conflict (email) do update set role = 'MASTER', active = true;

-- ---------------------------------------------------------------------------
-- OPTIONAL: a couple of demo divisions + one demo project so the boards
-- aren't empty while you test. Delete this block for a clean production start.
-- ---------------------------------------------------------------------------
insert into members (email, name, role, active) values
  ('dewi.design@gmail.com', 'Dewi - Design',     'DESIGN',     true),
  ('rama.prod@gmail.com',   'Rama - Production',  'PRODUCTION', true)
on conflict (email) do nothing;

do $$
declare pid uuid;
begin
  -- 1. Pondok Indah Residence (original)
  insert into projects (name, client, type, location, budget, spent, start_date, due_date, progress, notes, created_by)
  values ('Pondok Indah Residence', 'Mr. & Mrs. Wijaya', 'Residential', 'Pondok Indah, Jakarta Selatan',
          1850000000, 740000000, '2025-02-10', '2026-07-30', 45,
          'Full gut renovation. Marble sourcing confirmed.', 'owner@gmail.com')
  returning id into pid;

  insert into project_pipelines (project_id, pipeline, active, stage) values
    (pid, 'MASTER',     true, 'prod_ongoing'),
    (pid, 'DESIGN',     true, 'done'),
    (pid, 'PRODUCTION', true, 'production');

  insert into activity_log (project_id, role, text) values (pid, 'MASTER', 'Project created');

  -- 2. Menteng Heritage Townhouse
  insert into projects (name, client, type, location, budget, spent, start_date, due_date, progress, notes, created_by)
  values ('Menteng Heritage Townhouse', 'Ibu Sandra Kusuma', 'Residential', 'Menteng, Jakarta Pusat',
          2400000000, 0, '2026-05-01', '2026-12-15', 10,
          'Period townhouse conversion. Client requests natural material palette — rattan, teak, limewash walls.', 'owner@gmail.com')
  returning id into pid;

  insert into project_pipelines (project_id, pipeline, active, stage) values
    (pid, 'MASTER', true, 'design_wip'),
    (pid, 'DESIGN', true, 'phase1');

  insert into activity_log (project_id, role, text) values (pid, 'MASTER', 'Project created'), (pid, 'DESIGN', 'Design Phase 1 dimulai');

  -- 3. BSD Townhouse — Negotiation stage
  insert into projects (name, client, type, location, budget, spent, start_date, due_date, progress, notes, created_by)
  values ('BSD Townhouse — Unit 7C', 'Mr. Hendriawan Lim', 'Residential', 'BSD City, Tangerang Selatan',
          980000000, 0, NULL, '2026-09-01', 0,
          'New build interior. Budget discussion ongoing — client evaluating material downgrades on secondary bedrooms.', 'owner@gmail.com')
  returning id into pid;

  insert into project_pipelines (project_id, pipeline, active, stage) values
    (pid, 'MASTER', true, 'nego');

  insert into activity_log (project_id, role, text) values (pid, 'MASTER', 'Project created'), (pid, 'MASTER', 'Quotation sent, awaiting negotiation');

  -- 4. Kemang Cafe & Co-working
  insert into projects (name, client, type, location, budget, spent, start_date, due_date, progress, notes, created_by)
  values ('Kemang Cafe & Co-working', 'PT Ruang Kerja Nusantara', 'Commercial', 'Kemang, Jakarta Selatan',
          3200000000, 1100000000, '2025-11-15', '2026-08-20', 60,
          'Biophilic concept. MEP coordination underway. Custom steel shelving in fabrication.', 'owner@gmail.com')
  returning id into pid;

  insert into project_pipelines (project_id, pipeline, active, stage) values
    (pid, 'MASTER',     true, 'prod_ongoing'),
    (pid, 'DESIGN',     true, 'done'),
    (pid, 'PRODUCTION', true, 'mep');

  insert into activity_log (project_id, role, text) values
    (pid, 'MASTER',     'Project created'),
    (pid, 'PRODUCTION', 'MEP coordination started'),
    (pid, 'PRODUCTION', 'Steel shelving order placed');

  -- 5. Sudirman Office — 12th Floor
  insert into projects (name, client, type, location, budget, spent, start_date, due_date, progress, notes, created_by)
  values ('Sudirman Office — Lantai 12', 'PT Mitra Solusi Global', 'Commercial', 'SCBD, Jakarta Selatan',
          1650000000, 0, NULL, NULL, 0,
          'Open-plan office for 120 pax. Survey scheduled. BOQ to follow after spatial planning approved.', 'owner@gmail.com')
  returning id into pid;

  insert into project_pipelines (project_id, pipeline, active, stage) values
    (pid, 'MASTER', true, 'survey_sched');

  insert into activity_log (project_id, role, text) values (pid, 'MASTER', 'Project created'), (pid, 'MASTER', 'Survey dijadwalkan minggu depan');

  -- 6. Senopati Villa Rooftop Extension
  insert into projects (name, client, type, location, budget, spent, start_date, due_date, progress, notes, created_by)
  values ('Senopati Villa — Rooftop Extension', 'Mr. Ariel Santoso', 'Residential', 'Senopati, Jakarta Selatan',
          720000000, 320000000, '2026-01-20', '2026-07-01', 78,
          'Rooftop deck + outdoor kitchen. Waterproofing layer complete. Decking install this week.', 'owner@gmail.com')
  returning id into pid;

  insert into project_pipelines (project_id, pipeline, active, stage) values
    (pid, 'MASTER',     true, 'prod_ongoing'),
    (pid, 'DESIGN',     true, 'done'),
    (pid, 'PRODUCTION', true, 'finishing');

  insert into activity_log (project_id, role, text) values
    (pid, 'MASTER',     'Project created'),
    (pid, 'PRODUCTION', 'Waterproofing selesai'),
    (pid, 'PRODUCTION', 'Decking install dimulai');

end $$;