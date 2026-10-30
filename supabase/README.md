# Studio OS — Supabase backend (Google login + members + RLS)

This folder turns the client-only prototype into a **real, server-enforced** app:
Google sign-in proves *who* you are; the `members` table decides *what division*
you are; and **Row Level Security + RPC functions enforce it on the server**, so
a Design user genuinely cannot load Production's data (not just "it's hidden").

```
Google OAuth ──▶ verified email ──▶ members table (email → role) ──▶ RLS + RPCs
   (identity)                          (authorization)               (enforcement)
```

## Files
| File | What it is |
|---|---|
| `schema.sql` | Tables, RLS read-policies, and all write RPCs. Run once. |
| `seed.sql` | Creates the **first MASTER** (edit the email) + optional demo data. |
| `../src/lib/supabaseClient.js` | Browser client (reads `.env`). |
| `../src/lib/useSession.js` | Hook: are we signed in, and what role? |
| `../src/lib/api.js` | Reads + RPC wrappers, mapped to the app's existing operations. |
| `../.env.example` | Copy to `.env`, fill with your project URL + anon key. |

---

## Setup (≈15 min)

### 1. Create the project
- supabase.com → **New project**. Note the **Project URL** and **anon public key**
  (Project Settings → API).

### 2. Enable Google login
- Google Cloud Console → create an **OAuth 2.0 Client ID** (Web application).
  - Authorized redirect URI: `https://YOUR-REF.supabase.co/auth/v1/callback`
- Supabase → **Authentication → Providers → Google** → paste the Client ID + Secret, enable.
- Supabase → **Authentication → URL Configuration** → add your app origins
  (e.g. `http://localhost:5173` and your production URL) to **Redirect URLs**.

> Personal `@gmail.com` accounts work out of the box. You do **not** need Google
> Workspace — the `members` table is what restricts who may enter.

### 3. Create the schema
- Supabase → **SQL Editor** → paste **`schema.sql`** → Run.

### 4. Bootstrap the first Master
- Edit `seed.sql`: change `owner@gmail.com` to the Google email of your owner.
- Run `seed.sql` in the SQL Editor. (It runs as owner, bypassing RLS — the only
  way to create the first master, because `add_member()` requires you to already
  be one.)

### 5. Wire the frontend env
```bash
cp .env.example .env       # then fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install                # @supabase/supabase-js is already in package.json
npm run dev
```

After this: the owner signs in with Google → becomes MASTER → invites everyone
else from the in-app **Anggota** screen. New people sign in with their own Gmail
and immediately land on the right board.

---

## How the access rules work

**Reads (RLS SELECT policies):**
- `projects` — visible if you're MASTER, or your division's pipeline is `active`
  on that project (`can_see_project()`).
- `project_pipelines` — MASTER sees all; a division sees only its own pipeline rows.
- `members` — you can read your own row; MASTER reads all.

**Writes (RPC functions only):** base tables have **no client write policies**, so
the *only* way to change data is the SECURITY DEFINER functions, each of which
checks the caller's role first:
- `move_stage` — MASTER any board; a division only its own.
- `handover` — MASTER → any division; DESIGN → PRODUCTION.
- `mark_master_done` — PRODUCTION closes the loop on the MASTER pipeline.
- `create_project` / `update_project` — finance fields (`budget`, `spent`) are
  written **only when the caller is MASTER**, ignored otherwise.
- `add_member` / `set_member` / `delete_member` — MASTER only, and they refuse to
  remove the **last active MASTER** (anti-lockout).

This is the server-side equivalent of the prototype's UI gating — but it can't be
bypassed by editing the bundle.

---

## Wiring it into `src/App.jsx`

The data layer is a near drop-in. Replace the prototype's local-state plumbing
with calls from `src/lib/api.js`:

```jsx
import { useSession } from "./lib/useSession";
import * as api from "./lib/api";

// --- gate (replaces the mock Login + window.storage role restore) ---
const { status, member, role } = useSession();
if (status === "loading")    return <Splash />;
if (status === "signed-out") return <Login onGoogle={api.signInWithGoogle} />;
if (status === "no-access")  return <NoAccess email={session?.user?.email} onSignOut={api.signOut} />;
// status === "ready": role is member.role, account is member.email

// --- load + live updates (replaces the load/save useEffects) ---
useEffect(() => {
  const reload = () => api.fetchProjects().then(setProjects);
  reload();
  return api.subscribeBoard(reload);            // realtime
}, []);
useEffect(() => {
  const reload = () => api.listMembers().then(setMembers);
  reload();
  return api.subscribeMembers(reload);
}, []);
```

Then swap the mutating handlers for the API (they already match by name/shape):

| Prototype handler | Replace body with |
|---|---|
| `saveProject(p, ctx)` | `p.id ? api.updateProject(p, ctx) : api.createProject(p, ctx)` |
| `moveStage(id, pk, s)` | `api.moveStage(id, pk, s)` |
| `handover(id, t, s)` | `api.handover(id, t, s)` |
| `markMasterDone(id)` | `api.markMasterDone(id)` |
| `removeFromBoard(id, pk)` | `api.removeFromBoard(id, pk)` |
| `hardDelete(id)` | `api.deleteProject(id)` |
| `addMember(e,n,r)` | `api.addMember(e, n, r)` |
| `updateMember(id, patch)` | `api.setMember(id, patch.role ?? m.role, patch.active ?? m.active)` |
| `removeMember(id)` | `api.deleteMember(id)` |
| `logout` | `api.signOut()` |

Because realtime re-fetches after every change, you can drop the optimistic
`setProjects(...)` updates (or keep them for snappiness and let realtime reconcile).
The `pipelines` object and `log` array shapes are produced by `toAppProject()` in
`api.js`, so the existing `Overview`, `Board`, `BoardCard`, `ProjectModal`, and
`MembersAdmin` components render **unchanged**.

---

## Migration plan (phased, low-risk)
1. **Stand up Supabase** — steps 1–4 above. Verify in the SQL editor that you can
   `select * from members`.
2. **Auth only** — wire `useSession` + a real "Continue with Google" button and the
   `no-access` screen. Keep `window.storage` for projects temporarily. Confirm each
   Gmail lands on the correct board (role from DB).
3. **Members live** — point `MembersAdmin` at `api.*`. Confirm RLS: a Design login
   gets an error if it tries a member RPC.
4. **Projects live** — switch reads to `api.fetchProjects()` + realtime, and the six
   project handlers to `api.*`. Remove `window.storage`.
5. **Harden** — add `start_date/due_date` validation, audit the `activity_log`,
   consider column GRANTs on `budget/spent` as defense-in-depth, and add tests for
   each RPC's authz path.
