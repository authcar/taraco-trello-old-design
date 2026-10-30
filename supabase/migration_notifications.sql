-- ============================================================================
-- STUDIO OS — migration: in-app notifications (assign + @mention)
-- Run AFTER schema.sql, migration_detail.sql, migration_features.sql. Safe to re-run.
--
-- Notifications are persisted rows, so a recipient who is offline still sees them
-- (as unread) the next time they open the app. Realtime just delivers them live
-- when the app is already open. Rows are created server-side inside the
-- set_assignees / add_comment RPCs, so the client cannot forge them.
-- ============================================================================

create table if not exists notifications (
  id            bigint generated always as identity primary key,
  recipient_email citext not null,
  type          text not null,                 -- 'assigned' | 'mention'
  project_id    uuid references projects(id) on delete cascade,
  project_name  text,                          -- denormalized for display
  actor_name    text,                          -- who triggered it
  body          text,
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists idx_notif_recipient on notifications(recipient_email, read, created_at desc);

-- RLS — you can only read your own notifications. No client INSERT/UPDATE/DELETE:
-- creation happens in SECURITY DEFINER RPCs; marking-read goes through an RPC.
alter table notifications enable row level security;
drop policy if exists notif_select on notifications;
create policy notif_select on notifications for select to authenticated
  using ( recipient_email = auth.email() );

-- Mark all of my unread notifications as read (called when the bell is opened).
create or replace function mark_notifications_read()
returns void language plpgsql security definer set search_path = public as $$
begin
  update notifications set read = true
    where recipient_email = auth.email() and not read;
end; $$;

grant execute on function mark_notifications_read() to authenticated;

-- ---------------------------------------------------------------------------
-- Override set_assignees — notify each NEWLY added assignee (not the actor).
-- ---------------------------------------------------------------------------
create or replace function set_assignees(pid uuid, items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare m members; cleaned jsonb; old jsonb; pname text;
begin
  m := auth_member();
  if m.id is null or not can_see_project(pid) then raise exception 'Not authorized'; end if;

  select assignees, name into old, pname from projects where id = pid;

  cleaned := coalesce((
    select jsonb_agg(distinct lower(e))
    from jsonb_array_elements_text(coalesce(items, '[]'::jsonb)) e
    where exists (select 1 from members mm where mm.email = lower(e) and mm.active)
  ), '[]'::jsonb);

  update projects set assignees = cleaned, updated_at = now() where id = pid;
  insert into activity_log(project_id, role, actor_name, text)
    values (pid, m.role, m.name, 'Updated assignees');

  insert into notifications(recipient_email, type, project_id, project_name, actor_name, body)
  select e.email, 'assigned', pid, pname, m.name, m.name || ' assigned you to ' || coalesce(pname, 'a project')
  from (select lower(x) as email from jsonb_array_elements_text(cleaned) x) e
  where e.email <> m.email
    and not exists (
      select 1 from jsonb_array_elements_text(coalesce(old, '[]'::jsonb)) o where lower(o) = e.email
    );
end; $$;

-- ---------------------------------------------------------------------------
-- Override add_comment — post the comment AND notify any @mentioned members.
-- A mention is "@token" where token matches a member's first name or the local
-- part of their email (case-insensitive). The author is never notified.
-- ---------------------------------------------------------------------------
create or replace function add_comment(pid uuid, body text)
returns void language plpgsql security definer set search_path = public as $$
declare m members; pname text; rec members;
begin
  m := auth_member();
  if m.id is null or not can_see_project(pid) then raise exception 'Not authorized'; end if;
  if coalesce(trim(body), '') = '' then return; end if;

  insert into project_comments(project_id, author_email, author_name, role, body)
    values (pid, m.email, m.name, m.role, body);

  select name into pname from projects where id = pid;

  for rec in
    select distinct mm.*
    from members mm,
         lateral (select lower(mt[1]) as tok from regexp_matches(body, '@(\w+)', 'g') as mt) toks
    where mm.active
      and mm.email <> m.email
      and ( lower(split_part(mm.name, ' ', 1)) = toks.tok
            or lower(split_part(mm.email, '@', 1)) = toks.tok )
  loop
    insert into notifications(recipient_email, type, project_id, project_name, actor_name, body)
      values (rec.email, 'mention', pid, pname, m.name, m.name || ' mentioned you: ' || left(body, 120));
  end loop;
end; $$;

-- ---------------------------------------------------------------------------
-- Realtime — live delivery while the app is open (idempotent).
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;
