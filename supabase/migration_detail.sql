-- ============================================================================
-- STUDIO OS — migration: Project Detail fields, attachments, comments, profile
-- Run AFTER schema.sql in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

-- 1) extra columns on projects (brief / scope / timeline)
alter table projects add column if not exists code     text;
alter table projects add column if not exists existing text;
alter table projects add column if not exists scope    jsonb not null default '[]'::jsonb;
alter table projects add column if not exists timeline jsonb not null default '{}'::jsonb;
alter table projects add column if not exists labels   jsonb not null default '[]'::jsonb;  -- production status labels

-- 2) attachments + comments
create table if not exists project_links (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  label      text,
  sub        text,
  url        text,
  kind       text default 'link',        -- doc | sheet | link
  created_at timestamptz default now()
);

create table if not exists project_files (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name       text,
  kind       text default 'pdf',         -- pdf | image
  url        text,
  thumb      text,
  created_at timestamptz default now()
);

create table if not exists project_comments (
  id         bigint generated always as identity primary key,
  project_id uuid not null references projects(id) on delete cascade,
  author_email citext,
  role       member_role,
  body       text not null,
  created_at timestamptz default now()
);

-- extra columns (safe to re-run): photo caption + denormalized commenter name
alter table project_files    add column if not exists caption     text;
alter table project_comments add column if not exists author_name text;

create index if not exists idx_links_project    on project_links(project_id);
create index if not exists idx_files_project     on project_files(project_id);
create index if not exists idx_comments_project  on project_comments(project_id, created_at);

-- 3) RLS — readable for any project you can see
alter table project_links    enable row level security;
alter table project_files    enable row level security;
alter table project_comments enable row level security;

drop policy if exists links_select on project_links;
create policy links_select on project_links for select to authenticated using ( can_see_project(project_id) );

drop policy if exists files_select on project_files;
create policy files_select on project_files for select to authenticated using ( can_see_project(project_id) );

drop policy if exists comments_select on project_comments;
create policy comments_select on project_comments for select to authenticated using ( can_see_project(project_id) );

-- 4) RPC — post a comment (must be able to see the project)
create or replace function add_comment(pid uuid, body text)
returns void language plpgsql security definer set search_path = public as $$
declare m members;
begin
  m := auth_member();
  if m.id is null or not can_see_project(pid) then raise exception 'Not authorized'; end if;
  if coalesce(trim(body), '') = '' then return; end if;
  insert into project_comments(project_id, author_email, author_name, role, body)
    values (pid, m.email, m.name, m.role, body);
end; $$;

-- 4b) RPC — edit your OWN comment / delete (author, or Master can delete any)
create or replace function edit_comment(cid bigint, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare m members;
begin
  m := auth_member();
  if m.id is null then raise exception 'Not authorized'; end if;
  if coalesce(trim(p_body), '') = '' then return; end if;
  if not exists (select 1 from project_comments where id = cid and author_email = m.email) then
    raise exception 'You can only edit your own comment';
  end if;
  update project_comments set body = p_body where id = cid;
end; $$;

create or replace function delete_comment(cid bigint)
returns void language plpgsql security definer set search_path = public as $$
declare m members; c project_comments;
begin
  m := auth_member();
  if m.id is null then raise exception 'Not authorized'; end if;
  select * into c from project_comments where id = cid;
  if c.id is null then return; end if;
  if c.author_email <> m.email and m.role <> 'MASTER' then
    raise exception 'You can only delete your own comment';
  end if;
  delete from project_comments where id = cid;
end; $$;

grant execute on function edit_comment(bigint, text), delete_comment(bigint) to authenticated;

-- 5) RPC — update YOUR OWN display name (for Profile settings)
create or replace function update_my_name(new_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update members set name = coalesce(nullif(trim(new_name), ''), name)
    where email = auth.email();
end; $$;

grant execute on function add_comment(uuid, text), update_my_name(text) to authenticated;

-- 6) realtime for live comments (idempotent — skip if already added)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'project_comments') then
    alter publication supabase_realtime add table project_comments;
  end if;
end $$;

-- ============================================================================
-- 7) EDIT support — documentation, links, files (run together with the above)
-- ============================================================================

-- edit the documentation fields on a project (anyone who can see it)
create or replace function update_project_detail(pid uuid, payload jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare m members;
begin
  m := auth_member();
  if m.id is null or not can_see_project(pid) then raise exception 'Not authorized'; end if;
  update projects set
    code     = coalesce(payload->>'code', code),
    existing = coalesce(payload->>'existing', existing),
    scope    = coalesce(payload->'scope', scope),
    timeline = coalesce(payload->'timeline', timeline),
    updated_at = now()
  where id = pid;
end; $$;

-- set production status labels (only Production or Master)
create or replace function set_project_labels(pid uuid, items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare m members;
begin
  m := auth_member();
  if m.id is null or not can_see_project(pid) then raise exception 'Not authorized'; end if;
  if m.role <> 'MASTER' and m.role <> 'PRODUCTION' and m.role <> 'SALES' then
    raise exception 'Only Production, Sales, or Master can set labels';
  end if;
  update projects set labels = coalesce(items, '[]'::jsonb), updated_at = now() where id = pid;
end; $$;

-- replace ALL links for a project with the given array
create or replace function set_project_links(pid uuid, items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare m members;
begin
  m := auth_member();
  if m.id is null or not can_see_project(pid) then raise exception 'Not authorized'; end if;
  delete from project_links where project_id = pid;
  insert into project_links(project_id, label, sub, url, kind)
  select pid, x->>'label', x->>'sub', x->>'url', coalesce(x->>'kind', 'link')
  from jsonb_array_elements(coalesce(items, '[]'::jsonb)) x
  where coalesce(x->>'label', x->>'url') is not null;
end; $$;

-- register an uploaded file on a project; returns the new row id
create or replace function add_project_file(pid uuid, p_name text, p_kind text, p_url text, p_thumb text)
returns uuid language plpgsql security definer set search_path = public as $$
declare m members; new_id uuid;
begin
  m := auth_member();
  if m.id is null or not can_see_project(pid) then raise exception 'Not authorized'; end if;
  insert into project_files(project_id, name, kind, url, thumb)
    values (pid, p_name, coalesce(p_kind, 'pdf'), p_url, p_thumb)
    returning id into new_id;
  return new_id;
end; $$;

create or replace function delete_project_file(fid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from project_files f where f.id = fid and can_see_project(f.project_id)) then
    raise exception 'Not authorized';
  end if;
  delete from project_files where id = fid;
end; $$;

create or replace function set_file_caption(fid uuid, p_caption text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from project_files f where f.id = fid and can_see_project(f.project_id)) then
    raise exception 'Not authorized';
  end if;
  update project_files set caption = p_caption where id = fid;
end; $$;

grant execute on function
  update_project_detail(uuid, jsonb), set_project_links(uuid, jsonb), set_project_labels(uuid, jsonb),
  add_project_file(uuid, text, text, text, text), delete_project_file(uuid),
  set_file_caption(uuid, text)
to authenticated;

-- realtime for attachments (idempotent)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'project_links') then
    alter publication supabase_realtime add table project_links;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'project_files') then
    alter publication supabase_realtime add table project_files;
  end if;
end $$;

-- ============================================================================
-- 8) STORAGE — bucket for uploaded attachments (public read)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', true)
on conflict (id) do nothing;

drop policy if exists "project-files read"   on storage.objects;
drop policy if exists "project-files write"  on storage.objects;
drop policy if exists "project-files delete" on storage.objects;

create policy "project-files read"   on storage.objects for select to authenticated using (bucket_id = 'project-files');
create policy "project-files write"  on storage.objects for insert to authenticated with check (bucket_id = 'project-files');
create policy "project-files delete" on storage.objects for delete to authenticated using (bucket_id = 'project-files');

-- public (anon) read so image thumbnails render via getPublicUrl
drop policy if exists "project-files public read" on storage.objects;
create policy "project-files public read" on storage.objects for select to anon using (bucket_id = 'project-files');

-- ----------------------------------------------------------------------------
-- OPTIONAL demo content for one project (replace the id, or delete this block)
-- ----------------------------------------------------------------------------
-- update projects set
--   code = 'TRC-2026-014',
--   existing = 'Bangunan eksisting 2 lantai, ±240 m². Struktur baik, kelistrikan perlu rewiring.',
--   scope = '["Bongkar partisi lama","Rewiring kelistrikan","Custom furniture","Finishing lantai","Lighting fixtures"]'::jsonb,
--   timeline = '{"flexible": false, "note": "Desain fleksibel; produksi rigid."}'::jsonb
-- where name = 'Pondok Indah Residence';
