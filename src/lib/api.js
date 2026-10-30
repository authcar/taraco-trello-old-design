import { supabase } from "./supabaseClient";

/* ============================================================================
   Data layer — mirrors the prototype's operations, but backed by Supabase.
   Reads use RLS-protected selects; writes go through the SECURITY DEFINER RPCs
   in supabase/schema.sql, so the browser can't bypass the rules.

   Drop-in mapping to the current App.jsx:
     prototype                         -> here
     ----------------------------------------------------------------
     login (mock)                      -> signInWithGoogle()
     logout                            -> signOut()
     members state + load              -> listMembers()  (+ realtime)
     addMember(email,name,role)        -> addMember(...)
     updateMember(id,{role|active})    -> setMember(id, role, active)
     removeMember(id)                  -> deleteMember(id)
     projects state + load             -> fetchProjects() (+ realtime)
     saveProject(payload, ctx) [new]   -> createProject(payload, ctx)
     saveProject(payload, ctx) [edit]  -> updateProject(payload, ctx)
     moveStage(id, pk, stage)          -> moveStage(id, pk, stage)
     handover(id, target, stage)       -> handover(id, target, stage)
     markMasterDone(id)                -> markMasterDone(id)
     removeFromBoard(id, pk)           -> removeFromBoard(id, pk)
     hardDelete(id)                    -> deleteProject(id)
   ========================================================================== */

/* ---------- auth ---------- */
export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
}
export async function signOut() {
  return supabase.auth.signOut();
}

/* ---------- members ---------- */
export async function listMembers() {
  const { data, error } = await supabase.from("members").select("*").order("role");
  if (error) throw error;
  return data;
}
export async function addMember(email, name, role) {
  const { data, error } = await supabase.rpc("add_member", { p_email: email, p_name: name, p_role: role });
  if (error) throw error;
  return data;
}
export async function setMember(id, role, active) {
  const { error } = await supabase.rpc("set_member", { p_id: id, p_role: role, p_active: active });
  if (error) throw error;
}
export async function deleteMember(id) {
  const { error } = await supabase.rpc("delete_member", { p_id: id });
  if (error) throw error;
}

/* ---------- projects: DB <-> app shape ---------- */
const EMPTY_PIPES = () => ({
  MASTER: { active: false, stage: null },
  DESIGN: { active: false, stage: null },
  PRODUCTION: { active: false, stage: null },
});

function toAppProject(row, finance = true) {
  const pipes = EMPTY_PIPES();
  (row.project_pipelines || []).forEach((pp) => {
    pipes[pp.pipeline] = { active: pp.active, stage: pp.stage };
  });
  const log = (row.activity_log || [])
    .map((l) => ({ ts: new Date(l.created_at).getTime(), role: l.role, actor: l.actor_name || "", text: l.text }))
    .sort((a, b) => b.ts - a.ts);
  const cl = row.project_checklist || [];
  return {
    id: row.id,
    name: row.name,
    client: row.client || "",
    type: row.type || "Residential",
    location: row.location || "",
    mandors: Array.isArray(row.mandors) ? row.mandors : (row.mandor ? [row.mandor] : []),
    supervisor: row.supervisor || "",
    budget: finance ? Number(row.budget) || 0 : null,
    spent: finance ? Number(row.spent) || 0 : null,
    start: row.start_date || "",
    due: row.due_date || "",
    progress: row.progress || 0,
    notes: row.notes || "",
    finance,
    code: row.code || "",
    existing: row.existing || "",
    scope: Array.isArray(row.scope) ? row.scope : [],
    timeline: row.timeline && typeof row.timeline === "object" ? row.timeline : {},
    labels: Array.isArray(row.labels) ? row.labels : [],
    assignees: Array.isArray(row.assignees) ? row.assignees : [],
    checklist: { total: cl.length, done: cl.filter((x) => x.done).length },
    pipelines: pipes,
    log,
  };
}

export async function fetchProjects(finance = true) {
  // RLS filters rows to what the signed-in division may see; `finance` hides
  // budget/spent from non-Master so divisions never receive the figures.
  let { data, error } = await supabase
    .from("projects")
    .select("*, project_pipelines(*), activity_log(*), project_checklist(*)")
    .order("created_at", { ascending: false });
  if (error) {
    // migration_features.sql not run yet → retry without the checklist join
    ({ data, error } = await supabase
      .from("projects")
      .select("*, project_pipelines(*), activity_log(*)")
      .order("created_at", { ascending: false }));
  }
  if (error) throw error;
  return (data || []).map((row) => toAppProject(row, finance));
}

/* ---------- project detail: links / files / comments ---------- */
export async function fetchProjectExtras(projectId) {
  const [links, files, comments] = await Promise.all([
    supabase.from("project_links").select("*").eq("project_id", projectId).order("created_at"),
    supabase.from("project_files").select("*").eq("project_id", projectId).order("created_at"),
    supabase.from("project_comments").select("*").eq("project_id", projectId).order("created_at"),
  ]);
  const err = links.error || files.error || comments.error;
  if (err) throw err;
  // checklist comes from a later migration — tolerate its absence so the rest still loads
  let checklist = [];
  try {
    const cl = await supabase.from("project_checklist").select("*").eq("project_id", projectId).order("position");
    if (!cl.error) checklist = (cl.data || []).map((c) => ({ id: c.id, text: c.text, done: !!c.done }));
  } catch { /* table not migrated yet */ }
  return {
    links: links.data || [],
    files: files.data || [],
    comments: (comments.data || []).map((c) => ({
      id: c.id, email: c.author_email, author: c.author_name || c.author_email, role: c.role, body: c.body,
      ts: new Date(c.created_at).getTime(),
    })),
    checklist,
  };
}
export async function addComment(projectId, body) {
  const { error } = await supabase.rpc("add_comment", { pid: projectId, body });
  if (error) throw error;
}
export async function editComment(commentId, body) {
  const { error } = await supabase.rpc("edit_comment", { cid: commentId, p_body: body });
  if (error) throw error;
}
export async function deleteComment(commentId) {
  const { error } = await supabase.rpc("delete_comment", { cid: commentId });
  if (error) throw error;
}

/* edit the documentation fields (code / existing / scope / timeline) */
export async function updateProjectDetail(projectId, fields) {
  const { error } = await supabase.rpc("update_project_detail", { pid: projectId, payload: fields });
  if (error) throw error;
}
/* replace the whole set of links for a project */
export async function setProjectLinks(projectId, links) {
  const { error } = await supabase.rpc("set_project_links", { pid: projectId, items: links });
  if (error) throw error;
}
/* production status labels (keys) — Production / Master only */
export async function setProjectLabels(projectId, labels) {
  const { error } = await supabase.rpc("set_project_labels", { pid: projectId, items: labels });
  if (error) throw error;
}
/* upload a file to Storage, then register it on the project */
export async function uploadProjectFile(projectId, file) {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${projectId}/${Date.now()}-${safe}`;
  const up = await supabase.storage.from("project-files").upload(path, file, { upsert: false });
  if (up.error) throw up.error;
  const { data: pub } = supabase.storage.from("project-files").getPublicUrl(path);
  const kind = (file.type || "").startsWith("image/") ? "image" : "pdf";
  const url = pub.publicUrl;
  const { data, error } = await supabase.rpc("add_project_file", {
    pid: projectId, p_name: file.name, p_kind: kind, p_url: url, p_thumb: kind === "image" ? url : null,
  });
  if (error) throw error;
  return { id: data, name: file.name, kind, url, thumb: kind === "image" ? url : null };
}
export async function removeProjectFile(fileId) {
  const { error } = await supabase.rpc("delete_project_file", { fid: fileId });
  if (error) throw error;
}
export async function setFileCaption(fileId, caption) {
  const { error } = await supabase.rpc("set_file_caption", { fid: fileId, p_caption: caption });
  if (error) throw error;
}

/* ---------- assignees + checklist (migration_features.sql) ---------- */
/* replace the whole assignee set with the given array of member emails */
export async function setAssignees(projectId, emails) {
  const { error } = await supabase.rpc("set_assignees", { pid: projectId, items: emails || [] });
  if (error) throw error;
}
/* replace the whole checklist with the given array of { text, done } */
export async function setChecklist(projectId, items) {
  const { error } = await supabase.rpc("set_checklist", { pid: projectId, items });
  if (error) throw error;
}

/* ---------- notifications (migration_notifications.sql) ---------- */
export async function fetchNotifications() {
  // tolerate the table not existing yet (migration not run) → no notifications
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return [];
    return (data || []).map((n) => ({
      id: n.id, type: n.type, projectId: n.project_id, projectName: n.project_name,
      actor: n.actor_name || "", body: n.body || "", read: !!n.read,
      ts: new Date(n.created_at).getTime(),
    }));
  } catch { return []; }
}
export async function markAllNotificationsRead() {
  const { error } = await supabase.rpc("mark_notifications_read");
  if (error) throw error;
}
export function subscribeNotifications(onChange) {
  const ch = supabase
    .channel("studioos-notifications")
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(ch);
}

/* ---------- profile ---------- */
export async function updateMyName(name) {
  const { error } = await supabase.rpc("update_my_name", { new_name: name });
  if (error) throw error;
}

/* ---------- project mutations (RPC) ---------- */
export async function createProject(payload, contextPipe) {
  const { data, error } = await supabase.rpc("create_project", { payload, context_pipe: contextPipe });
  if (error) throw error;
  return data; // new project id
}
export async function updateProject(payload, contextPipe) {
  const body = { ...payload, pipeline: contextPipe, stage: payload.stage };
  const { error } = await supabase.rpc("update_project", { pid: payload.id, payload: body });
  if (error) throw error;
}
export async function moveStage(id, pk, stage) {
  const { error } = await supabase.rpc("move_stage", { pid: id, pk, to_stage: stage });
  if (error) throw error;
}
export async function handover(id, target, stage) {
  const { error } = await supabase.rpc("handover", { pid: id, target, to_stage: stage });
  if (error) throw error;
}
export async function markMasterDone(id) {
  const { error } = await supabase.rpc("mark_master_done", { pid: id });
  if (error) throw error;
}
export async function removeFromBoard(id, pk) {
  const { error } = await supabase.rpc("remove_from_board", { pid: id, pk });
  if (error) throw error;
}
export async function deleteProject(id) {
  const { error } = await supabase.rpc("delete_project", { pid: id });
  if (error) throw error;
}

/* ---------- realtime ---------- */
/* Re-fetch on any change to the shared tables. Simple + correct; optimize later
   with granular row patching if needed. */
export function subscribeBoard(onChange) {
  const ch = supabase
    .channel("studioos-board")
    .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "project_pipelines" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "activity_log" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "project_checklist" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(ch);
}
export function subscribeMembers(onChange) {
  const ch = supabase
    .channel("studioos-members")
    .on("postgres_changes", { event: "*", schema: "public", table: "members" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(ch);
}
