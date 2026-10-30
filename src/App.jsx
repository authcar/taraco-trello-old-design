import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  FileText,
  FileSpreadsheet,
  Link2,
  Image as ImageIcon,
  ExternalLink,
  Pencil,
  Replace,
  Users,
  MapPin,
  CalendarClock,
  ListChecks,
  ClipboardList,
  MessageSquare,
  Send,
  Layers,
  Banknote,
  Paperclip,
  Trash2,
  Tag,
  Check,
  Filter,
  Bell,
  AtSign,
  UserPlus,
  FolderX,
} from "lucide-react";
import { useSession } from "./lib/useSession";
import * as api from "./lib/api";
import logoImg from "./assets/logo.svg";
import catSvg from "./assets/cat.svg";
import designSvg from "./assets/design.svg";
import masterSvg from "./assets/master.svg";
import productionSvg from "./assets/production.svg";
import overviewSvg from "./assets/overview.svg";
import geometryOverviewSvg from "./assets/geometry overview.svg";
import lamp1Svg from "./assets/lamp 1 overview.svg";
import lamp2Svg from "./assets/lamp 2 overview.svg";
import profileSvg from "./assets/profile.svg";
import plantSvg from "./assets/plant.svg";
import booksSvg from "./assets/books.svg";
import navbarExpandedSvg from "./assets/navbar expanded.svg";
import avatar1 from "./assets/avatar/Asset 1.svg";
import avatar2 from "./assets/avatar/Asset 2.svg";
import avatar3 from "./assets/avatar/Asset 3.svg";
import avatar4 from "./assets/avatar/Asset 4.svg";
import avatar5 from "./assets/avatar/Asset 5.svg";
import avatar6 from "./assets/avatar/Asset 6.svg";
import avatar7 from "./assets/avatar/Asset 7.svg";
import avatar8 from "./assets/avatar/Asset 8.svg";
import avatar9 from "./assets/avatar/Asset 9.svg";
const AVATAR_OPTIONS = [avatar1, avatar2, avatar3, avatar4, avatar5, avatar6, avatar7, avatar8, avatar9];

/* ------------------------------------------------------------------ *
   STUDIO OS — Interior Design & Build Project Management (portfolio demo)
   Role-based, multi-pipeline project tracker.

   Roles:   MASTER (full access) · DESIGN DIVISION · PRODUCTION DIVISION
   Boards:  Master · Design · Production (each with its own stages)
   Flow:    cross-divisional handovers + per-project activity log

   NOTE: This is a single-page prototype. Role selection here is a UI
   gate for demonstrating the access model — real enforcement must live
   on a server (see the architecture blueprint). Data persists via
   window.storage (single device).
 * ------------------------------------------------------------------ */

/* "Interior Studio" palette — PEARL canvas, INKSTONE text, SAND accent,
   MILK JADE success, SILVER secondary/borders. White cards float on PEARL. */
const PALETTE = {
  canvas: "#E8E4DB", // OAT — page background (muted warm paper, less yellow)
  bg: "#F0EDE6", // soft neutral fill (inputs, hovers, lanes, tint boxes)
  paper: "#FCFBF8", // warm near-white cards
  bone: "#E5E0D6", // chip / track fills (muted greige)
  ink: "#1B1A17", // SUMI — warm near-black: headings, display, primary, dark text
  inkSoft: "#6B6760", // GRAPHITE — secondary text, labels, metadata
  inkFaint: "#9B968C", // light graphite — least emphasis
  line: "rgba(27,26,23,0.13)", // ink hairline border
  lineSoft: "rgba(27,26,23,0.07)", // divider
  clay: "#8C6F58", // CLAY — single quiet earth accent (desaturated)
  claySoft: "rgba(140,111,88,0.12)", // clay tint
  sage: "#9BA395", // muted sage — done / success / positive
  sageText: "#5C6155", // deeper sage for legible success text
  terra: "#9E6A52", // muted terracotta (alerts / destructive)
  black: "#000000", // INK BLACK — deliberate B&W structural accent
};

const SOFT_SHADOW = "0 8px 30px -12px rgba(27,26,23,0.10)";

/* Type system: Poppins across UI + display (Bold 700, Regular 400, Thin 100);
   IBM Plex Mono kept for data/figures. */
const FONT_SANS = "'Poppins', system-ui, -apple-system, sans-serif";
const FONT_SERIF = "'Poppins', system-ui, -apple-system, sans-serif";
const FONT_MONO = "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace";

/* Responsive breakpoints — self-contained hook (no provider needed).
   isMobile ≤ 680 (phones), isTablet ≤ 1024 (small tablets / split view). */
function useViewport() {
  const [w, setW] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1280,
  );
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return { w, isMobile: w <= 680, isTablet: w <= 1024 };
}

/* Stage families — colour by what a stage *means*, so 16 columns still read calmly */
const KINDS = {
  notes: { color: "#A39B8B", tint: "#EEEAE0" }, // faint taupe — not yet a real project
  intake: { color: "#8E897E", tint: "#ECE8DF" }, // stone grey
  active: { color: "#8C6F58", tint: "#EAE3D9" }, // clay (the one accent)
  money: { color: "#7A7468", tint: "#ECE9E0" }, // warm graphite
  build: { color: "#5E5950", tint: "#E6E2D8" }, // charcoal
  handover: { color: "#7C857C", tint: "#E7EBE6" }, // muted sage-grey
  attention: { color: "#9E6A52", tint: "#EFE5DD" }, // muted terracotta
  done: { color: "#8A9285", tint: "#E8ECE4" }, // muted sage
  hold: { color: "#9B968C", tint: "#EDEAE2" }, // light graphite
};

/* Production pipeline status labels (Trello-style chips) — Production/Master set these */
const PROD_LABELS = [
  { key: "delay", label: "Delay", bg: "#1B1A17", text: "#EBDFC4" }, // black chip — B&W urgency anchor
  { key: "data", label: "Data Ga Lengkap", bg: "#E0D9CC", text: "#5A554C" }, // greige
  { key: "sipil", label: "Pekerjaan Sipil", bg: "#D6D9D0", text: "#4C5249" }, // cool stone
  {
    key: "material",
    label: "Material Kurang / Inden",
    bg: "#E5D9C8",
    text: "#6B5236",
  }, // clay tint
  { key: "vendor", label: "Vendor Delay", bg: "#9E6A52", text: "#FFFFFF" }, // muted terracotta
  { key: "komplain", label: "Komplain", bg: "#C29A82", text: "#3A2114" }, // soft clay
];
const PROD_LABEL_MAP = Object.fromEntries(PROD_LABELS.map((l) => [l.key, l]));

/* Master lead-status labels (Trello-style chips) — Master sets these on the Master board */
const MASTER_LABELS = [
  { key: "hot", label: "Hot Lead", bg: "#1B1A17", text: "#EBDFC4" }, // black chip — top priority
  { key: "warm", label: "Warm", bg: "#C29A82", text: "#3A2114" }, // soft clay
  { key: "cold", label: "Cold", bg: "#D6D9D0", text: "#4C5249" }, // cool stone
  { key: "follow_up", label: "Follow Up", bg: "#E5D9C8", text: "#6B5236" }, // clay tint
  { key: "priority", label: "Priority", bg: "#9E6A52", text: "#FFFFFF" }, // muted terracotta
  { key: "on_hold", label: "On Hold", bg: "#E0D9CC", text: "#5A554C" }, // greige
];
const MASTER_LABEL_MAP = Object.fromEntries(
  MASTER_LABELS.map((l) => [l.key, l]),
);

/* Design division status labels (Trello-style chips) — Design/Master set these */
const DESIGN_LABELS = [
  {
    key: "design_progress",
    label: "On Progress",
    bg: "#D6D9D0",
    text: "#4C5249",
  }, // cool stone — actively working
  { key: "design_revisi", label: "Revisi", bg: "#9E6A52", text: "#FFFFFF" }, // muted terracotta — needs rework
  {
    key: "design_followup",
    label: "Follow Up Client",
    bg: "#C29A82",
    text: "#3A2114",
  }, // soft clay — waiting on client
];
const DESIGN_LABEL_MAP = Object.fromEntries(
  DESIGN_LABELS.map((l) => [l.key, l]),
);

/* every label key across all divisions → its chip definition (for display anywhere) */
const ALL_LABEL_MAP = {
  ...MASTER_LABEL_MAP,
  ...PROD_LABEL_MAP,
  ...DESIGN_LABEL_MAP,
};

/* Service-type stripe labels — stored as "svc:design" / "svc:build" / "svc:both" in labels[].
   Rendered as a coloured band at the top of each board card (Trello-style). */
const SERVICE_TYPES = [
  {
    key: "svc:design",
    label: "Design Only",
    stripe: "#3B7A57",
    textColor: "#fff",
  },
  {
    key: "svc:build",
    label: "Build Only",
    stripe: "#1A3F6F",
    textColor: "#fff",
  },
  {
    key: "svc:both",
    label: "Design & Build",
    stripe: "#C2692A",
    textColor: "#fff",
  },
];
const SERVICE_TYPE_MAP = Object.fromEntries(
  SERVICE_TYPES.map((s) => [s.key, s]),
);

/* Custom label key format: "cx:<text>:<6hexdigits>"  e.g. "cx:Rush:FF6B35" */
function parseCustomLabel(key) {
  if (!key || !key.startsWith("cx:")) return null;
  const rest = key.slice(3);
  const last = rest.lastIndexOf(":");
  if (last === -1) return null;
  const text = rest.slice(0, last);
  const hex = rest.slice(last + 1);
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return { text, bg: "#" + hex };
}

function contrastColor(hex) {
  const h = (hex || "").replace("#", "");
  if (h.length < 6) return "#FFFFFF";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55
    ? "#1B1A17"
    : "#FFFFFF";
}

const CUSTOM_LABEL_COLORS = [
  "3B7A57",
  "1A3F6F",
  "7B3F9E",
  "C0392B",
  "C2692A",
  "B8860B",
  "4A6572",
  "00787A",
  "9C2752",
  "6D4C41",
  "37474F",
  "8E6F3E",
];

/* universal chip — resolves a key from any division's label set, or renders a custom label */
function LabelChip({ k, small }) {
  if (!k) return null;
  if (k.startsWith("svc:")) return null; // service type = stripe only, not a chip
  if (k.startsWith("cx:")) {
    const cust = parseCustomLabel(k);
    if (!cust) return null;
    const fg = contrastColor(cust.bg);
    return (
      <span
        style={{
          fontSize: small ? 9 : 10,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: fg,
          background: cust.bg,
          borderRadius: 5,
          padding: small ? "2px 6px" : "3px 9px",
          whiteSpace: "nowrap",
          lineHeight: 1.35,
        }}
      >
        {cust.text}
      </span>
    );
  }
  const l = ALL_LABEL_MAP[k];
  if (!l) return null;
  return (
    <span
      style={{
        fontSize: small ? 9 : 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: l.text,
        background: l.bg,
        borderRadius: 5,
        padding: small ? "2px 6px" : "3px 9px",
        whiteSpace: "nowrap",
        lineHeight: 1.35,
      }}
    >
      {l.label}
    </span>
  );
}
/* kept as an alias so existing call sites still resolve any label key */
const MasterLabelChip = LabelChip;

/* Phase labels — stage kinds double as the phase a board groups its columns under */
const PHASES = {
  notes: "Notes",
  intake: "Intake",
  active: "In Progress",
  money: "Commercial",
  build: "Production",
  handover: "Handover",
  attention: "Needs Attention",
  done: "Completed",
  hold: "On Hold",
};

const ROLES = {
  MASTER: {
    id: "MASTER",
    label: "Master",
    sub: "Management · full access",
    tag: "M",
    color: PALETTE.ink,
  },
  SALES: {
    id: "SALES",
    label: "Sales",
    sub: "Sales · full visibility",
    tag: "S",
    color: "#4A7C6F",
  },
  DESIGN: {
    id: "DESIGN",
    label: "Design",
    sub: "Design pipeline only",
    tag: "D",
    color: "#8C6F58",
  },
  PRODUCTION: {
    id: "PRODUCTION",
    label: "Production",
    sub: "Production pipeline only",
    tag: "P",
    color: "#6B6760",
  },
};

/* ----- membership / access (prototype) -----
   Login (Google) only proves WHO someone is (their email). The DIVISION/ROLE
   comes from this members table, which the Master manages. Real auth + this
   lookup must live on a server — here it's a client-side simulation.
   A logged-in user's role is always derived from their email in `members`,
   so changing someone's role here takes effect on their next sign-in. */
const ROLE_LIST = ["MASTER", "SALES", "DESIGN", "PRODUCTION"];
const MASTER_ONLY_LABEL = "__master_only__";
const isMasterOnly = (p) => (p.labels || []).includes(MASTER_ONLY_LABEL);
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || "").trim());

const S = (id, label, kind) => ({ id, label, kind });

const PIPELINES = {
  MASTER: {
    key: "MASTER",
    label: "Master Pipeline",
    short: "Master",
    stages: [
      S("catatan", "Notes", "notes"),
      S("inbox", "Inbox Follow Up", "intake"),
      S("qualifying", "Qualifying", "intake"),
      S("survey_sched", "Survey Scheduled", "active"),
      S("survey_done", "Survey Done", "active"),
      S("design_fee", "Design Fee Quotation", "active"),
      S("design_wip", "Design In Progress", "active"),
      S("quote_req", "Quotation Request", "active"),
      S("quote_sent", "Quotation Sent", "active"),
      S("nego", "Negotiation", "active"),
      S("dp_spk", "DP / SPK", "active"),
      S("kickoff", "Kick Off Meeting", "handover"),
      S("prod_ongoing", "Production On Going", "build"),
      S("aftersales", "After Sales / Repair", "attention"),
      S("done", "Done", "done"),
      S("hold", "On Hold", "hold"),
    ],
  },
  DESIGN: {
    key: "DESIGN",
    label: "Design Pipeline",
    short: "Design",
    stages: [
      S("new", "New Projects", "intake"),
      S("phase1", "Design Phase 1", "active"),
      S("phase2", "Design Phase 2", "active"),
      S("phase3", "Design Phase 3", "active"),
      S("approved_qs", "Approved to QS", "handover"),
      S("handover", "Handover", "handover"),
      S("need_info", "Need Info", "attention"),
      S("done", "Done", "done"),
      S("hold", "On Hold", "hold"),
    ],
  },
  PRODUCTION: {
    key: "PRODUCTION",
    label: "Production Pipeline",
    short: "Production",
    stages: [
      S("new", "New Project", "intake"),
      S("survei", "Survey", "active"),
      S("kickoff", "Kick Off Meeting", "active"),
      S("survei_pre", "Pre-Production Survey", "active"),
      S("production", "Production", "build"),
      S("fitout", "Fit Out", "build"),
      S("handover", "Hand Over", "handover"),
      S("perbaikan", "Repair", "attention"),
      S("done", "Done", "done"),
      S("hold", "On Hold", "hold"),
    ],
  },
};

const TYPES = [
  "Residential",
  "Apartment",
  "Commercial",
  "Office",
  "Hospitality",
  "Retail",
  "F&B",
];

/* Timeline status — selectable label on the Timeline section (was a flexible yes/no). */
const TIMELINE_STATUSES = [
  {
    key: "flexible",
    label: "Flexible",
    dot: "#7C9473",
    text: "#5C6155",
    bg: "#7C947333",
  },
  {
    key: "fixed",
    label: "Fixed",
    dot: "#9E6A52",
    text: "#9E6A52",
    bg: "#9E6A521a",
  },
  {
    key: "tentative",
    label: "Tentative",
    dot: "#B98155",
    text: "#9E6A52",
    bg: "#EFE0D3",
  },
];
/* read status with backward-compat for old records that only stored { flexible: bool } */
const timelineStatus = (tl) =>
  tl && tl.status ? tl.status : tl && tl.flexible ? "flexible" : "fixed";
const timelineMeta = (k) =>
  TIMELINE_STATUSES.find((s) => s.key === k) || TIMELINE_STATUSES[1];

/* ------------------------------------------------------------------ *
 * PROJECT DETAIL — mock payload shape (map to Supabase later)
 *
 * Suggested DB:
 *   projects: + code text, existing text, scope jsonb (text[]),
 *             timeline jsonb { flexible bool, note text, milestones [{label,date}] }
 *   project_links(project_id, label, url, kind)            kind: doc|sheet|link
 *   project_files(project_id, name, kind, url, thumb)      kind: pdf|image
 *   project_comments(project_id, author_email, role, body, created_at)
 * Until then, the detail modal falls back to this mock content.
 * ------------------------------------------------------------------ */
const DETAIL_MOCK = {
  existing: "",
  scope: [],
  timeline: { flexible: false, note: "" },
  links: [],
  files: [],
  comments: [],
};

/* ----- access helpers ----- */
const PIPE_ORDER = ["MASTER", "DESIGN", "PRODUCTION"];
const isMasterLike = (role) => role === "MASTER" || role === "SALES";
const allowedPipelines = (role) => (isMasterLike(role) ? PIPE_ORDER : [role]); // DESIGN -> ["DESIGN"], PRODUCTION -> ["PRODUCTION"]
const ownPipeline = (role) => (role === "MASTER" ? null : role);
const canWrite = (role, pk) => (isMasterLike(role) ? true : pk === role);
const canEditFinance = (role) => isMasterLike(role);

/* ----- small utils ----- */
const findStage = (pk, id) =>
  PIPELINES[pk].stages.find((s) => s.id === id) || PIPELINES[pk].stages[0];
const kindOf = (kind) => KINDS[kind] || KINDS.intake;

/* Group a pipeline's stages into phase bands, ordered by where each kind first
   appears so the board still reads in pipeline flow. */
const phaseGroups = (stages) => {
  const order = [];
  const byKind = {};
  stages.forEach((st) => {
    if (!byKind[st.kind]) {
      byKind[st.kind] = [];
      order.push(st.kind);
    }
    byKind[st.kind].push(st);
  });
  return order.map((kind) => ({
    kind,
    label: PHASES[kind] || kind,
    stages: byKind[kind],
  }));
};

const fmtMoney = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");
/* compact rupiah for tight spots (mobile metric cells): Rp 12,5 M / Rp 850 jt */
const fmtMoneyShort = (n) => {
  const v = Number(n) || 0,
    a = Math.abs(v),
    f = (x, d) => x.toLocaleString("id-ID", { maximumFractionDigits: d });
  if (a >= 1e12) return "Rp " + f(v / 1e12, 1) + " T";
  if (a >= 1e9) return "Rp " + f(v / 1e9, 1) + " M";
  if (a >= 1e6) return "Rp " + f(v / 1e6, 1) + " jt";
  if (a >= 1e3) return "Rp " + f(v / 1e3, 0) + " rb";
  return "Rp " + f(v, 0);
};
const nowMs = () => Date.now(); // wrapped so analytics can read "now" in render
/* humanise a duration in ms → "3d 4h" / "5h 12m" / "8m" (for analytics) */
const fmtDur = (ms) => {
  if (ms == null || !isFinite(ms) || ms < 0) return "—";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d >= 1) return h ? `${d}d ${h}h` : `${d}d`;
  if (h >= 1) return m ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
};

/* Calculate elapsed milliseconds between two timestamps counting only
   working hours (Mon–Fri, non-holiday). holidays = Set of "YYYY-MM-DD". */
function workingMs(startMs, endMs, holidays) {
  if (!startMs || !endMs || endMs <= startMs) return 0;
  let ms = 0;
  const cur = new Date(startMs);
  cur.setHours(0, 0, 0, 0);
  const end = endMs;
  while (cur.getTime() < end) {
    const nextDay = new Date(cur);
    nextDay.setDate(nextDay.getDate() + 1);
    const dow = cur.getDay();
    const dateStr = cur.toISOString().slice(0, 10);
    if (dow !== 0 && dow !== 6 && !(holidays && holidays.has(dateStr))) {
      ms += Math.min(end, nextDay.getTime()) - Math.max(startMs, cur.getTime());
    }
    cur.setDate(cur.getDate() + 1);
  }
  return ms;
}

/* Fetch Indonesian public holidays from Google Calendar (public calendar).
   Requires VITE_GCAL_KEY. Returns a Set of "YYYY-MM-DD" strings. */
function useIndonesianHolidays() {
  const [holidays, setHolidays] = useState(new Set());
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const key = import.meta.env.VITE_GCAL_KEY;
    if (!key) {
      setLoaded(true);
      return;
    }
    const calId = encodeURIComponent(
      "en.indonesian#holiday@group.v.calendar.google.com",
    );
    const yr = new Date().getFullYear();
    const timeMin = encodeURIComponent(new Date(yr - 2, 0, 1).toISOString());
    const timeMax = encodeURIComponent(new Date(yr + 1, 11, 31).toISOString());
    fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?key=${key}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&maxResults=500&fields=items(start)`,
    )
      .then((r) => r.json())
      .then((data) => {
        const s = new Set();
        (data.items || []).forEach((ev) => {
          if (ev.start?.date) s.add(ev.start.date);
        });
        setHolidays(s);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);
  return { holidays, loaded };
}
/* reconstruct a project's stage-entry history for one pipeline from its activity
   log. move_stage logs "<PK>: -> <stage_id>", so each match is a timestamped
   entry into a stage. Returns ascending [{ stage, ts }]. */
function stageHistory(p, pk) {
  return (p.log || [])
    .map((l) => {
      const m =
        typeof l.text === "string" && l.text.match(/^([A-Z]+):\s*->\s*(.+)$/);
      return m && m[1] === pk ? { stage: m[2].trim(), ts: l.ts, actor: l.actor || "" } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.ts - b.ts);
}
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const fmtStamp = (ts) =>
  new Date(ts).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const daysUntil = (d) => {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date().setHours(0, 0, 0, 0)) / 86400000);
};

/* ----- deadline reminders -----
   Notify when a project's due date is within DEADLINE_WARN_DAYS (or already past).
   Derived client-side from the loaded projects (no server row needed): a deadline
   alert is inherently time-based and should re-surface while the date stays near,
   so it lives alongside the persisted assign/mention notifications in the bell.
   Scope: MASTER sees every project; a division member only sees projects they're
   assigned to. Skip projects that aren't on any active board, or are already Done. */
const DEADLINE_WARN_DAYS = 3;
function deadlineAlertsFor(projects, role, account) {
  const out = [];
  const me = (account || "").toLowerCase();
  for (const p of projects) {
    if (!p.due) continue;
    const cells = Object.values(p.pipelines || {});
    const onActiveBoard = cells.some(
      (c) => c && c.active && c.stage !== "done",
    );
    if (!onActiveBoard) continue;
    const mine =
      isMasterLike(role) ||
      (me && (p.assignees || []).some((e) => (e || "").toLowerCase() === me));
    if (!mine) continue;
    const d = daysUntil(p.due);
    if (d == null || d > DEADLINE_WARN_DAYS) continue;
    const body =
      d < 0
        ? `Deadline lewat ${Math.abs(d)} hari`
        : d === 0
          ? "Deadline hari ini"
          : d === 1
            ? "Deadline besok"
            : `Deadline tinggal ${d} hari lagi`;
    out.push({
      id: `deadline-${p.id}`,
      key: `${p.id}:${p.due}`, // stable per project+date; re-alerts if the date changes
      type: "deadline",
      projectId: p.id,
      projectName: p.name,
      body,
      ts: new Date(p.due).getTime(),
      daysLeft: d,
    });
  }
  return out;
}

/* ----- missing-supervisor reminders -----
   Surface any project sitting in Master's "Production On Going" stage without a
   supervisor assigned. Derived client-side like deadline alerts (no DB row), so
   it clears itself the moment a supervisor is filled in. Shown to Master + Production. */
function supervisorAlertsFor(projects, role) {
  const out = [];
  if (role !== "MASTER" && role !== "PRODUCTION") return out;
  for (const p of projects) {
    if (!p.pipelines?.MASTER?.active) continue;
    if (p.pipelines.MASTER.stage !== "prod_ongoing") continue;
    if ((p.supervisor || "").trim()) continue;
    out.push({
      id: `supervisor-${p.id}`,
      key: `supervisor:${p.id}`,
      type: "supervisor",
      projectId: p.id,
      projectName: p.name,
      body: "Belum ada Supervisor",
      ts: Date.now(),
    });
  }
  return out;
}
const getAvatarIdx = (email) => { try { const v = localStorage.getItem(`studioos_avatar_${email}`); return v !== null ? parseInt(v, 10) : null; } catch { return null; } };
const setAvatarIdx = (email, idx) => { try { localStorage.setItem(`studioos_avatar_${email}`, String(idx)); } catch {} };

/* initials for an avatar — "Dewi Lestari" -> "DL", "studio@x.com" -> "ST" */
const initials = (s) => {
  const t = (s || "").trim();
  if (!t) return "?";
  const parts = t
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
const emptyPipes = () => ({
  MASTER: { active: false, stage: null },
  DESIGN: { active: false, stage: null },
  PRODUCTION: { active: false, stage: null },
});

/* ============================== Brand wordmark ============================== */
function Wordmark({ size = "sm", onDark = false }) {
  const heights = { xs: 24, sm: 32, lg: 40 };
  const h = heights[size] || heights.sm;
  return (
    <img
      src={logoImg}
      alt="Studio OS"
      height={h}
      style={{
        display: "block",
        userSelect: "none",
        filter: onDark ? "invert(1)" : "none",
        objectFit: "contain",
      }}
    />
  );
}

/* ---- minimal line icons (1.6px stroke, currentColor) ---- */
function Icon({ d, size = 16, sw = 1.6, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d ? <path d={d} /> : children}
    </svg>
  );
}
const SearchIcon = (p) => (
  <Icon size={15} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </Icon>
);
const ChevronDown = (p) => <Icon size={13} {...p} d="M6 9l6 6 6-6" />;
const GearIcon = (p) => (
  <Icon size={15} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Icon>
);
const LogoutIcon = (p) => (
  <Icon size={15} {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </Icon>
);
const CalendarIcon = (p) => (
  <Icon size={28} sw={1.3} {...p}>
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9h18M8 2.5v4M16 2.5v4" />
  </Icon>
);

/* ============================== App ============================== */
export default function App() {
  /* identity + role come from Supabase (Google session -> members table) */
  const { status, session, member, role: realRole } = useSession();
  const account = member ? member.email : null;
  const { isMobile, isTablet } = useViewport();

  /* role drives all UI scoping; identity always comes from the real account
     (server RLS/RPCs run as the signed-in user regardless). */
  const role = realRole;

  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  /* prefer the live members row (reflects name edits via realtime) over the session snapshot */
  const me =
    members.find(
      (m) =>
        account && m.email && m.email.toLowerCase() === account.toLowerCase(),
    ) || member;
  const [view, setView] = useState("overview"); // overview | board | members
  const [boardPipe, setBoardPipe] = useState("MASTER"); // which board is shown
  const [jumpStage, setJumpStage] = useState(null); // stage id to scroll-to on board open
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [query, setQuery] = useState("");
  const [fType, setFType] = useState(""); // filter: project type ("" = all)
  const [fStatus, setFStatus] = useState("all"); // filter: all | active | attention | hold | done
  const [filterOpen, setFilterOpen] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [detail, setDetail] = useState(null); // { p, pk } project open in the detail modal
  const [notifs, setNotifs] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unassignedOpen, setUnassignedOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  /* read-state for derived deadline alerts (DB notifs track their own) — persisted
     so a reminder you've seen stops pulsing until its date changes or a new one lands */
  const [deadlineRead, setDeadlineRead] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("studioos.deadlineRead") || "{}");
    } catch {
      return {};
    }
  });

  /* header gains a shadow once the page scrolls */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Escape closes the open filter popover */
  useEffect(() => {
    if (!filterOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setFilterOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filterOpen]);

  /* when a session becomes ready: choose a sensible starting board for the role */
  useEffect(() => {
    if (status !== "ready" || !role) return;
    setBoardPipe(allowedPipelines(role)[0]);
    setView(isMasterLike(role) ? "overview" : "board");
  }, [status, role]);

  /* load projects + members from Supabase, and keep them live via realtime */
  useEffect(() => {
    if (status !== "ready") return;
    let alive = true;
    const reloadProjects = () =>
      api
        .fetchProjects(isMasterLike(realRole))
        .then((d) => {
          if (alive) {
            setProjects(d);
            setBoardPipe((cur) => {
              const hasActive = d.some((p) => p.pipelines[cur] && p.pipelines[cur].active);
              if (hasActive) return cur;
              const fallback = PIPE_ORDER.find((pk) => d.some((p) => p.pipelines[pk] && p.pipelines[pk].active));
              return fallback || cur;
            });
          }
        })
        .catch((e) => console.error("[studioos] fetchProjects error:", e));
    const reloadMembers = () =>
      api
        .listMembers()
        .then((d) => {
          if (alive) setMembers(d);
        })
        .catch(() => {});
    const reloadNotifs = () =>
      api
        .fetchNotifications()
        .then((d) => {
          if (alive) setNotifs(d);
        })
        .catch(() => {});
    reloadProjects();
    reloadMembers();
    reloadNotifs();
    const unsubP = api.subscribeBoard(reloadProjects);
    const unsubM = api.subscribeMembers(reloadMembers);
    const unsubN = api.subscribeNotifications(reloadNotifs);
    return () => {
      alive = false;
      unsubP();
      unsubM();
      unsubN();
    };
  }, [status]); // eslint-disable-line

  /* keep board pipeline within the current role's reach */
  useEffect(() => {
    if (!role) return;
    const allow = allowedPipelines(role);
    if (!allow.includes(boardPipe)) setBoardPipe(allow[0]);
  }, [role]); // eslint-disable-line

  const logout = async () => {
    setView("overview");
    setQuery("");
    setFType("");
    setFStatus("all");
    setNotifs([]);
    setNotifOpen(false);
    await api.signOut();
  };

  /* refetch helper for reconciling after a failed optimistic write */
  const refetch = () =>
    api
      .fetchProjects(isMasterLike(realRole))
      .then(setProjects)
      .catch(() => {});

  /* ---- member management (Master only); realtime applies the change ---- */
  const addMember = async (email, name, r) => {
    try {
      await api.addMember(email, name, r);
    } catch (e) {
      alert(e.message);
    }
  };
  const updateMember = async (id, patch) => {
    const m = members.find((x) => x.id === id);
    if (!m) return;
    try {
      await api.setMember(id, patch.role ?? m.role, patch.active ?? m.active);
    } catch (e) {
      alert(e.message);
    }
  };
  const removeMember = async (id) => {
    try {
      await api.deleteMember(id);
    } catch (e) {
      alert(e.message);
    }
  };
  const saveMyName = async (name) => {
    await api.updateMyName(name);
  }; // realtime refreshes `members` → `me`

  /* ---- project mutations: optimistic local update + server RPC; realtime reconciles ---- */
  const saveProject = async (p, contextPipe) => {
    setEditing(null);
    try {
      let id = p.id;
      if (p.id) {
        await api.updateProject(p, contextPipe);
        if (Array.isArray(p.labels)) await api.setProjectLabels(p.id, p.labels);
      } else {
        id = await api.createProject(p, contextPipe);
        if (id && Array.isArray(p.labels) && p.labels.length > 0)
          await api.setProjectLabels(id, p.labels);
      }
      /* same guarantee as the board's auto-handover: editing a project straight
         into Master's "Production On Going" must also land it on Production,
         unless it's flagged Master-only */
      if (
        id &&
        contextPipe === "MASTER" &&
        p.stage === "prod_ongoing" &&
        !(p.pipelines?.PRODUCTION?.active) &&
        !(p.labels || []).includes(MASTER_ONLY_LABEL)
      ) {
        await api.handover(id, "PRODUCTION", "production").catch(() => {});
      }
      await refetch();
    } catch (e) {
      alert(e.message);
    }
  };

  const moveStage = (id, pk, stageId) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              pipelines: {
                ...p.pipelines,
                [pk]: { ...p.pipelines[pk], stage: stageId },
                /* Production reaching Done auto-closes the loop on Master too,
                   mirroring the server-side move_stage RPC so the two boards
                   never show conflicting Done states. */
                ...(pk === "PRODUCTION" && stageId === "done"
                  ? { MASTER: { ...p.pipelines.MASTER, active: true, stage: "done" } }
                  : {}),
              },
            }
          : p,
      ),
    );
    api.moveStage(id, pk, stageId).catch((e) => {
      alert(e.message);
      refetch();
    });

    /* Master stage reaching "Production On Going" pulls the project onto
       the Production board automatically, if it isn't there yet — unless
       it's flagged Master-only, which is meant to stay off division boards */
    if (pk === "MASTER" && stageId === "prod_ongoing") {
      const current = projects.find((p) => p.id === id);
      if (current && !current.pipelines.PRODUCTION.active && !isMasterOnly(current)) {
        handover(id, "PRODUCTION", "production");
      }
    }
  };

  /* set the project's assignees (array of member emails; [] clears) */
  const setAssignees = (id, emails) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, assignees: emails } : p)),
    );
    setDetail((dt) =>
      dt && dt.p.id === id ? { ...dt, p: { ...dt.p, assignees: emails } } : dt,
    );
    api.setAssignees(id, emails).catch((e) => {
      alert(
        e.message ||
          "Could not set assignees. Has migration_features.sql been run?",
      );
      refetch();
    });
  };

  const handover = (id, targetKey, stageId) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              pipelines: {
                ...p.pipelines,
                [targetKey]: { active: true, stage: stageId },
              },
            }
          : p,
      ),
    );
    api.handover(id, targetKey, stageId).catch((e) => {
      alert(e.message);
      refetch();
    });
  };

  const markMasterDone = (id) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              pipelines: {
                ...p.pipelines,
                MASTER: { active: true, stage: "done" },
              },
            }
          : p,
      ),
    );
    api.markMasterDone(id).catch((e) => {
      alert(e.message);
      refetch();
    });
  };

  const removeFromBoard = (id, pk) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              pipelines: {
                ...p.pipelines,
                [pk]: { active: false, stage: null },
              },
            }
          : p,
      ),
    );
    api.removeFromBoard(id, pk).catch((e) => {
      alert(e.message);
      refetch();
    });
  };

  const doDelete = () => {
    if (!confirmDel) return;
    const { p, pk } = confirmDel;
    if (pk === "MASTER") {
      setProjects((prev) => prev.filter((x) => x.id !== p.id));
      api.deleteProject(p.id).catch((e) => {
        alert(e.message);
        refetch();
      });
    } else {
      removeFromBoard(p.id, pk);
    }
    setConfirmDel(null);
  };

  /* ---- search + filter + scope ---- */
  const scopePipe = isMasterLike(role) ? boardPipe : role;
  const ctxPipe = view === "board" ? boardPipe : scopePipe; // pipeline the status filter reads
  const stageKindIn = (p, pk) => {
    const cell = p.pipelines[pk];
    if (!cell || !cell.active) return null;
    return findStage(pk, cell.stage).kind;
  };
  const matches = (p) => {
    const q = query.trim().toLowerCase();
    if (
      q &&
      ![p.name, p.client, p.location, p.type]
        .join(" ")
        .toLowerCase()
        .includes(q)
    )
      return false;
    if (fType && p.type !== fType) return false;
    if (fStatus !== "all") {
      const kind = stageKindIn(p, ctxPipe);
      if (fStatus === "attention" && kind !== "attention") return false;
      if (fStatus === "hold" && kind !== "hold") return false;
      if (fStatus === "done" && kind !== "done") return false;
      if (
        fStatus === "active" &&
        (kind == null || kind === "done" || kind === "hold")
      )
        return false;
    }
    return true;
  };
  const visibleRaw = role !== "MASTER" ? projects.filter((p) => !isMasterOnly(p)) : projects;
  const visible = visibleRaw.filter(matches);
  const allow = role ? allowedPipelines(role) : [];
  const filterCount = (fType ? 1 : 0) + (fStatus !== "all" ? 1 : 0);
  /* projects not active in ANY pipeline — likely forgotten during intake */
  const orphanedProjects = visibleRaw.filter(
    (p) => !PIPE_ORDER.some((k) => p.pipelines[k].active),
  );

  const openNew = () => {
    const pk = view === "board" ? boardPipe : scopePipe || "MASTER";
    setEditing({ _new: true, _pipe: pk });
  };

  /* open the rich detail modal for a card; pk = the pipeline context it was opened from */
  const openDetail = (p) =>
    setDetail({
      p,
      pk:
        view === "board" ? boardPipe : isMasterLike(role) ? "MASTER" : scopePipe,
    });

  /* ---- notifications ---- */
  /* deadline reminders are derived from the loaded projects, then merged with the
     persisted assign/mention notifications into one chronological list for the bell */
  const deadlineAlerts = useMemo(
    () =>
      deadlineAlertsFor(projects, role, account).map((n) => ({
        ...n,
        read: !!deadlineRead[n.key],
      })),
    [projects, role, account, deadlineRead],
  );
  const supervisorAlerts = useMemo(
    () =>
      supervisorAlertsFor(projects, role).map((n) => ({
        ...n,
        read: !!deadlineRead[n.key],
      })),
    [projects, role, deadlineRead],
  );
  const allNotifs = useMemo(
    () => [...deadlineAlerts, ...supervisorAlerts, ...notifs].sort((a, b) => b.ts - a.ts),
    [deadlineAlerts, supervisorAlerts, notifs],
  );
  const unreadCount = allNotifs.filter((n) => !n.read).length;
  const toggleNotifs = () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (opening && unreadCount > 0) {
      setNotifs((ns) => ns.map((n) => ({ ...n, read: true }))); // optimistic
      api.markAllNotificationsRead().catch(() => {});
      if (deadlineAlerts.some((n) => !n.read) || supervisorAlerts.some((n) => !n.read)) {
        setDeadlineRead((prev) => {
          const next = { ...prev };
          deadlineAlerts.forEach((n) => {
            next[n.key] = true;
          });
          supervisorAlerts.forEach((n) => {
            next[n.key] = true;
          });
          try {
            localStorage.setItem("studioos.deadlineRead", JSON.stringify(next));
          } catch {
            /* ignore */
          }
          return next;
        });
      }
    }
  };
  const openNotif = (n) => {
    setNotifOpen(false);
    const p = visibleRaw.find((x) => x.id === n.projectId);
    if (p) openDetail(p);
  };

  /* gate: Google session -> members lookup -> scoped app */
  if (status === "loading")
    return (
      <div
        style={{
          minHeight: "100vh",
          background: PALETTE.canvas,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: `3px solid ${PALETTE.line}`,
            borderTopColor: PALETTE.clay,
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  if (status === "signed-out") return <Login onGoogle={api.signInWithGoogle} />;
  if (status === "no-access")
    return (
      <NoAccess
        email={session && session.user ? session.user.email : ""}
        onSignOut={api.signOut}
      />
    );

  const sbW = isMobile ? 0 : (sidebarExpanded ? 220 : 60);

  return (
    <div
      className="app-bg"
      style={{
        minHeight: "100vh",
        color: PALETTE.ink,
        fontFamily: FONT_SANS,
        letterSpacing: "-0.006em",
        display: "flex",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@100;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; user-select: none; }
        ::selection { background: ${PALETTE.clay}; color: #fff; }
        h1, h2, h3, h4, h5, h6 { cursor: default; user-select: none; }
        input, textarea, [contenteditable] { user-select: text; }
        .serif { font-family: ${FONT_SERIF}; font-optical-sizing: auto; }
        .mono { font-family: ${FONT_MONO}; font-feature-settings: "tnum" 1; }
        .tnum { font-variant-numeric: tabular-nums; }

        /* PEARL canvas — subtle radial light at top */
        .app-bg {
          background-color: ${PALETTE.canvas};
          background-image:
            radial-gradient(ellipse 80vw 48vh at 50% -6%, #EDE8DE 0%, transparent 72%),
            radial-gradient(ellipse 56vw 36vh at 82% 110%, #E5DDD4 0%, transparent 64%);
        }

        /* ── Cards ── float, lift on hover, spring entrance */
        .card {
          box-shadow: 0 1px 3px rgba(27,26,23,.05), 0 8px 28px -12px rgba(27,26,23,.09);
          transition: border-color .22s ease, box-shadow .28s cubic-bezier(.2,.7,.2,1), background .22s ease;
          will-change: box-shadow;
          position: relative;
          overflow: hidden;
        }
        .card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.18) 48%, rgba(255,255,255,0) 65%);
          background-size: 300% 300%;
          background-position: 220% 220%;
          opacity: 0;
          transition: opacity .6s ease, background-position .9s cubic-bezier(.25,.8,.25,1);
          pointer-events: none;
          z-index: 1;
          border-radius: inherit;
        }
        .card:hover::before {
          opacity: 1;
          background-position: 55% 55%;
        }
        .card:hover {
          border-color: rgba(27,26,23,.28) !important;
          box-shadow: 0 2px 8px -2px rgba(27,26,23,.10), 0 12px 32px -10px rgba(27,26,23,.16);
          background: #FDFCF9 !important;
        }
        .card:active { opacity: 0.88; }

        /* ── Buttons ── */
        .btn {
          transition: transform .16s cubic-bezier(.2,.8,.2,1), box-shadow .22s ease,
                      filter .16s ease, background .16s ease, color .15s ease, border-color .15s ease, opacity .15s ease;
          cursor: pointer; border: none; font-family: inherit;
        }
        .btn:hover { filter: brightness(0.97); }
        .btn:active { transform: scale(.96) !important; }

        /* Primary — warm ink gradient, tosca glow on hover */
        .btn-primary {
          background: linear-gradient(145deg, #2A2825 0%, ${PALETTE.ink} 100%) !important;
          box-shadow: 0 2px 8px -2px rgba(27,26,23,.28), 0 1px 2px rgba(27,26,23,.18);
          transition: background .28s ease, transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .28s ease;
        }
        .btn-primary:hover {
          background: linear-gradient(135deg, #0e7a7a 0%, #14b8a8 60%, #2dd4bf 100%) !important;
          transform: translateY(-1.5px) !important;
          box-shadow: 0 6px 24px -4px rgba(20,184,168,.45), 0 2px 8px rgba(20,184,168,.25) !important;
        }
        .btn-primary:active { transform: translateY(0) scale(.975) !important; }

        /* Danger */
        .btn-danger {
          background: linear-gradient(145deg, #C0392B, ${PALETTE.terra}) !important;
          color: #fff !important;
          box-shadow: 0 2px 8px -2px rgba(192,57,43,.32);
        }
        .btn-danger:hover { box-shadow: 0 6px 18px -4px rgba(192,57,43,.44) !important; transform: translateY(-1.5px) !important; }

        /* ── Nav tabs — pill active state ── */
        .navtab { position: relative; transition: color .16s ease, background .16s ease; border-radius: 8px; }
        .navtab::after {
          content: ""; position: absolute; left: 50%; right: 50%; bottom: -1px; height: 2.5px;
          background: linear-gradient(90deg, ${PALETTE.clay}, ${PALETTE.terra});
          border-radius: 2px;
          transition: left .26s cubic-bezier(.2,.8,.2,1), right .26s cubic-bezier(.2,.8,.2,1);
        }
        .navtab:hover { color: ${PALETTE.ink}; background: ${PALETTE.bone}55; }
        .navtab.active { color: ${PALETTE.ink} !important; }
        .navtab.active::after { left: 10px; right: 10px; }

        /* ── Reveal row actions on hover ── */
        .row-actions { opacity: 0; transition: opacity .18s ease; }
        .card:hover .row-actions, .row-actions:focus-within { opacity: 1; }

        /* ── Data rows ── */
        .drow { transition: background .14s ease; border-radius: 7px; }
        .drow:hover { background: ${PALETTE.bg}; }

        /* ── Comment actions reveal ── */
        .feed-row:hover .feed-actions, .feed-row .feed-actions:focus-within { opacity: 1 !important; }

        /* ── Pill search bar ── */
        .search {
          display: flex; align-items: center; gap: 7px;
          padding: 7px 14px; border-radius: 24px;
          background: ${PALETTE.paper};
          border: 1px solid ${PALETTE.line};
          box-shadow: 0 1px 4px rgba(27,26,23,.05);
          transition: border-color .2s ease, box-shadow .2s ease, background .2s ease;
        }
        .search:focus-within {
          border-color: ${PALETTE.clay};
          box-shadow: 0 0 0 3px ${PALETTE.claySoft}, 0 2px 8px rgba(27,26,23,.06);
          background: ${PALETTE.paper};
        }
        .search svg { color: ${PALETTE.inkFaint}; transition: color .2s ease; flex-shrink: 0; }
        .search:focus-within svg { color: ${PALETTE.clay}; }
        .search input { border: none; background: transparent; outline: none; width: 130px; font-size: 13px; color: ${PALETTE.ink}; transition: width .3s cubic-bezier(.2,.8,.2,1); }
        .search input::placeholder { color: ${PALETTE.inkFaint}; }
        .search input:focus { width: 190px; }

        /* ── Dropdown menu ── */
        .menu-item { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; padding: 9px 13px; background: transparent; font-size: 13px; font-weight: 500; color: ${PALETTE.ink}; transition: background .14s ease; border-radius: 8px; }
        .menu-item:hover { background: ${PALETTE.bg}; }
        .menu-item.danger { color: ${PALETTE.terra}; }

        /* ── Inputs + focus — pill-er radius, clay glow ── */
        input, select, textarea { font-family: inherit; transition: border-color .18s ease, box-shadow .22s ease, background .16s ease; }
        input:focus, select:focus, textarea:focus {
          border-color: ${PALETTE.clay} !important;
          box-shadow: 0 0 0 3.5px ${PALETTE.claySoft}, 0 1px 4px rgba(27,26,23,.06) !important;
          background: ${PALETTE.paper} !important;
        }
        :focus-visible { outline: none; }

        /* ── Entrance animations ── */
        .fade { animation: fade .45s cubic-bezier(.16,.84,.44,1) both; }
        @keyframes fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .rise { animation: rise .48s cubic-bezier(.16,.84,.44,1) both; }
        @keyframes rise { from { opacity: 0; transform: translateY(14px) scale(.99); } to { opacity: 1; transform: none; } }
        .ovf { animation: pop .32s cubic-bezier(.16,.84,.44,1) both; }
        @keyframes pop { from { opacity: 0; transform: translateY(10px) scale(.975); } to { opacity: 1; transform: none; } }

        /* Staggered card entrance in columns */
        .card-enter { animation: cardIn .38s cubic-bezier(.16,.84,.44,1) both; }
        @keyframes cardIn { from { opacity: 0; transform: translateY(16px) scale(.97); } to { opacity: 1; transform: none; } }

        /* ── Header ── */
        .app-header { transition: box-shadow .3s ease, backdrop-filter .3s ease, border-color .3s ease; }
        .app-header.scrolled {
          box-shadow: 0 1px 0 ${PALETTE.line}, 0 8px 32px -16px rgba(27,26,23,.18);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
        }

        /* ── Drag ghost ── */
        .drag-ghost { opacity: .35; transform: rotate(2deg) scale(.97); filter: blur(0.5px); }

        /* ── Stripe shimmer on service-type bands ── */
        @keyframes stripeShimmer {
          0%   { background-position: -400% center, 0 0; }
          100% { background-position: 400% center, 0 0; }
        }
        .stripe-shimmer {
          background-size: 400% 100%, 100% 100%;
          animation: stripeShimmer 9s ease-in-out infinite;
          transition: height .25s cubic-bezier(.2,.8,.2,1), filter .25s ease, transform .25s cubic-bezier(.2,.8,.2,1);
        }
        .card:hover .stripe-shimmer {
          height: 42px !important;
          filter: brightness(1.1) saturate(1.15);
          animation-duration: 2s;
        }

        /* ── Notifications ── */
        .notif-badge { box-shadow: 0 0 0 2px ${PALETTE.paper}, 0 0 0 4px #E5484D55; animation: notifPulse 2s ease-in-out infinite; }
        @keyframes notifPulse {
          0%, 100% { box-shadow: 0 0 0 2px ${PALETTE.paper}, 0 0 0 0 #E5484D66; }
          50%       { box-shadow: 0 0 0 2px ${PALETTE.paper}, 0 0 0 7px #E5484D00; }
        }
        .notif-bell-on { color: #E5484D; }
        .notif-bell-on svg { animation: notifRing 2.6s ease-in-out infinite; transform-origin: 50% 4px; }
        @keyframes notifRing {
          0%, 88%, 100% { transform: rotate(0); }
          90% { transform: rotate(14deg); } 92% { transform: rotate(-12deg); }
          94% { transform: rotate(9deg); }  96% { transform: rotate(-5deg); } 98% { transform: rotate(2deg); }
        }

        /* ── Scrollbars ── */
        .col-scroll::-webkit-scrollbar { height: 10px; width: 10px; }
        .col-scroll::-webkit-scrollbar-track { background: rgba(27,26,23,0.09); border-radius: 99px; margin: 0 6px; }
        .col-scroll::-webkit-scrollbar-thumb { background: rgba(27,26,23,0.32); border-radius: 99px; border: 2px solid transparent; background-clip: padding-box; }
        .col-scroll::-webkit-scrollbar-thumb:hover { background: rgba(27,26,23,0.55); border: 2px solid transparent; background-clip: padding-box; }
        .col-scroll::-webkit-scrollbar-button { display: none; }

        /* Global scrollbar */
        ::-webkit-scrollbar { height: 12px; width: 12px; }
        ::-webkit-scrollbar-track { background: ${PALETTE.bone}; border-radius: 99px; }
        ::-webkit-scrollbar-thumb { background: ${PALETTE.inkSoft}; border-radius: 99px; border: 3px solid ${PALETTE.bone}; background-clip: padding-box; }
        ::-webkit-scrollbar-thumb:hover { background: ${PALETTE.ink}; border: 3px solid ${PALETTE.bone}; background-clip: padding-box; }
        ::-webkit-scrollbar-button { display: none; }

        /* ── Progress bar pulse when active ── */
        @keyframes progressPulse {
          0%, 100% { opacity: 1; } 50% { opacity: .75; }
        }

        /* ── Tooltip-style hover chip ── */
        .chip-hover { transition: transform .16s cubic-bezier(.2,.8,.2,1), box-shadow .16s ease, filter .14s ease; }
        .chip-hover:hover { transform: translateY(-1px) scale(1.04); filter: brightness(1.06); }

        /* ── Column drop highlight ── */
        @keyframes dropPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(140,111,88,.0); }
          50%       { box-shadow: 0 0 0 4px rgba(140,111,88,.18); }
        }

        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: .001ms !important; transition-duration: .001ms !important; scroll-behavior: auto !important; }
        }
        @media (hover: none) {
          .row-actions, .feed-actions { opacity: 1 !important; }
        }
        .nav-scroll { overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; }
        .nav-scroll::-webkit-scrollbar { display: none; }

        /* ── Vertical Sidebar ── */
        .sidebar { transition: width .22s cubic-bezier(.2,.8,.2,1); overflow: hidden; }
        .sidebar-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 10px; cursor: pointer;
          border: none; background: transparent; font-family: inherit;
          width: 100%; text-align: left; white-space: nowrap; overflow: hidden;
          transition: background .14s ease, color .14s ease;
          color: ${PALETTE.inkSoft}; font-size: 13px; font-weight: 500;
        }
        .sidebar-item:hover { background: ${PALETTE.bg}; color: ${PALETTE.ink}; }
        .sidebar-item.active { background: ${PALETTE.ink}; color: #fff !important; }
        .sidebar-item.active .sidebar-icon { color: #fff !important; }
        .sidebar-icon { flex-shrink: 0; color: ${PALETTE.inkFaint}; transition: color .14s ease; display: flex; align-items: center; justify-content: center; position: relative; }
        .sidebar-icon svg { display: block; }
        .sidebar-item:hover .sidebar-icon { color: ${PALETTE.ink}; }
        .notif-dot { position: absolute; top: -3px; right: -3px; width: 8px; height: 8px; border-radius: 50%; background: #E5484D; border: 2px solid ${PALETTE.paper}; pointer-events: none; }
        .sidebar-section-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.14em;
          text-transform: uppercase; color: ${PALETTE.inkFaint};
          padding: 0 13px; margin: 8px 0 2px; white-space: nowrap;
          font-family: ${FONT_MONO};
        }
        .sidebar-badge {
          margin-left: auto; min-width: 18px; height: 18px; padding: 0 5px;
          border-radius: 9px; background: #E5484D; color: #fff;
          font-size: 10px; font-weight: 700; display: grid; place-items: center;
          font-family: ${FONT_MONO}; flex-shrink: 0;
        }
        .sidebar-item.active .sidebar-badge { background: rgba(255,255,255,.28); }
        .sidebar-tooltip {
          position: absolute; left: calc(100% + 10px); top: 50%; transform: translateY(-50%);
          background: ${PALETTE.ink}; color: #fff; font-size: 12px; font-weight: 500;
          padding: 5px 10px; border-radius: 7px; white-space: nowrap; pointer-events: none;
          opacity: 0; transition: opacity .15s ease; z-index: 200;
          box-shadow: 0 4px 14px rgba(0,0,0,.18);
        }
        .sidebar-item-wrap { position: relative; }
        .sidebar-item-wrap:hover .sidebar-tooltip { opacity: 1; }
      `}</style>

      {/* ── Mobile drawer backdrop ── */}
      {(isMobile || isTablet) && drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.38)", zIndex: 25, backdropFilter: "blur(2px)" }}
        />
      )}

      {/* ── Vertical Sidebar ── */}
      <aside
        className="sidebar"
        style={{
          position: "fixed",
          top: 0,
          left: (isMobile || isTablet) ? (drawerOpen ? 0 : -240) : 0,
          height: "100vh",
          width: (isMobile || isTablet) ? 220 : sbW,
          background: PALETTE.paper,
          borderRight: `1px solid ${PALETTE.line}`,
          zIndex: 26,
          display: "flex",
          flexDirection: "column",
          transition: "left .25s cubic-bezier(.2,.8,.2,1), width .22s cubic-bezier(.2,.8,.2,1)",
          overflowY: "auto",
          overflowX: "hidden",
          boxShadow: (isMobile || isTablet) && drawerOpen ? "4px 0 32px -8px rgba(27,26,23,.22)" : "none",
        }}
      >
        {/* Logo area */}
        <div style={{
          padding: sidebarExpanded || (isMobile || isTablet) ? "18px 16px 14px" : "14px 10px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: `1px solid ${PALETTE.lineSoft}`,
          flexShrink: 0,
        }}>
          {(sidebarExpanded || (isMobile || isTablet)) ? (
            <button className="btn" onClick={() => setView("overview")} style={{ padding: 0, background: "transparent", border: "none", cursor: "pointer", display: "flex" }}>
              <Wordmark size="sm" />
            </button>
          ) : (
            <button className="btn" onClick={() => setView("overview")} style={{ padding: 0, background: "transparent", border: "none", cursor: "pointer", display: "flex" }}>
              <img src="/favicon.png" alt="T" width={32} height={32} style={{ display: "block", flexShrink: 0 }} />
            </button>
          )}
          {(sidebarExpanded || (isMobile || isTablet)) && (
            <button
              className="btn"
              onClick={() => { if (isMobile || isTablet) setDrawerOpen(false); else setSidebarExpanded(false); }}
              style={{ marginLeft: "auto", padding: 4, color: PALETTE.inkFaint, display: "flex" }}
              title="Collapse sidebar"
            >
              <Icon size={16} d="M15 18l-6-6 6-6" />
            </button>
          )}
          {!sidebarExpanded && !(isMobile || isTablet) && (
            <button
              className="btn"
              onClick={() => setSidebarExpanded(true)}
              style={{ padding: 4, color: PALETTE.inkFaint, display: "flex" }}
              title="Expand sidebar"
            >
              <Icon size={16} d="M9 18l6-6-6-6" />
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {(sidebarExpanded || (isMobile || isTablet)) && (
            <div className="sidebar-section-label">Workspace</div>
          )}
          {!sidebarExpanded && !(isMobile || isTablet) && <div style={{ height: 6 }} />}

          {/* Overview */}
          <div className="sidebar-item-wrap">
            <button
              className={`sidebar-item${view === "overview" ? " active" : ""}`}
              onClick={() => { setView("overview"); if (isMobile || isTablet) setDrawerOpen(false); }}
            >
              <span className="sidebar-icon">
                <Icon size={17} sw={1.7}>
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </Icon>
              </span>
              {(sidebarExpanded || (isMobile || isTablet)) && <span>Overview</span>}
            </button>
            {!sidebarExpanded && !(isMobile || isTablet) && <div className="sidebar-tooltip">Overview</div>}
          </div>

          {/* Board pipes (Master / Design / Production) */}
          {allow.map((pk) => {
            const pipeIcon = pk === "MASTER"
              ? <Icon size={17} sw={1.7} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              : pk === "DESIGN"
              ? <Icon size={17} sw={1.7} d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              : <Icon size={17} sw={1.7} d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />;
            const isActive = view === "board" && boardPipe === pk;
            return (
              <div key={pk} className="sidebar-item-wrap">
                <button
                  className={`sidebar-item${isActive ? " active" : ""}`}
                  onClick={() => { setView("board"); setBoardPipe(pk); if (isMobile || isTablet) setDrawerOpen(false); }}
                >
                  <span className="sidebar-icon">{pipeIcon}</span>
                  {(sidebarExpanded || (isMobile || isTablet)) && <span>{PIPELINES[pk].short}</span>}
                </button>
                {!sidebarExpanded && !(isMobile || isTablet) && <div className="sidebar-tooltip">{PIPELINES[pk].short}</div>}
              </div>
            );
          })}

          {/* Analytics (MASTER + SALES) */}
          {isMasterLike(role) && (
            <div className="sidebar-item-wrap">
              <button
                className={`sidebar-item${view === "analytics" ? " active" : ""}`}
                onClick={() => { setView("analytics"); if (isMobile || isTablet) setDrawerOpen(false); }}
              >
                <span className="sidebar-icon">
                  <Icon size={17} sw={1.7}>
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </Icon>
                </span>
                {(sidebarExpanded || (isMobile || isTablet)) && <span>Analytics</span>}
              </button>
              {!sidebarExpanded && !(isMobile || isTablet) && <div className="sidebar-tooltip">Analytics</div>}
            </div>
          )}

        </nav>

        {/* Decorative illustration — only when sidebar is expanded */}
        {(sidebarExpanded || (isMobile || isTablet)) && (
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", overflow: "hidden", pointerEvents: "none" }}>
            <img
              src={navbarExpandedSvg}
              alt=""
              aria-hidden="true"
              style={{ width: "100%", display: "block" }}
            />
          </div>
        )}

        {/* Bottom: members + profile + logout + user */}
        <div style={{ padding: "12px 8px 16px", borderTop: `1px solid ${PALETTE.lineSoft}`, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {/* Members (MASTER only) */}
          {role === "MASTER" && (
            <div className="sidebar-item-wrap">
              <button
                className={`sidebar-item${view === "members" ? " active" : ""}`}
                onClick={() => { setView("members"); if (isMobile || isTablet) setDrawerOpen(false); }}
              >
                <span className="sidebar-icon"><Users size={17} strokeWidth={1.7} /></span>
                {(sidebarExpanded || (isMobile || isTablet)) && <span>Members</span>}
              </button>
              {!sidebarExpanded && !(isMobile || isTablet) && <div className="sidebar-tooltip">Members</div>}
            </div>
          )}
          {/* Profile */}
          <div className="sidebar-item-wrap">
            <button
              className={`sidebar-item${view === "profile" ? " active" : ""}`}
              onClick={() => { setView("profile"); if (isMobile || isTablet) setDrawerOpen(false); }}
            >
              <span className="sidebar-icon"><GearIcon /></span>
              {(sidebarExpanded || (isMobile || isTablet)) && <span>Profile</span>}
            </button>
            {!sidebarExpanded && !(isMobile || isTablet) && <div className="sidebar-tooltip">Profile</div>}
          </div>
          <div className="sidebar-item-wrap">
            <button className="sidebar-item" onClick={logout} style={{ color: PALETTE.terra }}>
              <span className="sidebar-icon" style={{ color: PALETTE.terra }}><LogoutIcon /></span>
              {(sidebarExpanded || (isMobile || isTablet)) && <span>Log out</span>}
            </button>
            {!sidebarExpanded && !(isMobile || isTablet) && <div className="sidebar-tooltip">Log out</div>}
          </div>
          {(sidebarExpanded || (isMobile || isTablet)) ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: PALETTE.bg }}>
              {(() => { const idx = getAvatarIdx(account); return idx !== null && AVATAR_OPTIONS[idx]
                ? <img src={AVATAR_OPTIONS[idx]} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0, background: PALETTE.bone }} />
                : <span style={{ width: 28, height: 28, borderRadius: "50%", background: PALETTE.ink, color: "#fff", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 11, flexShrink: 0 }} className="mono">{ROLES[realRole].tag}</span>; })()}
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{me ? me.name : ROLES[realRole].label}</span>
                <span className="mono" style={{ display: "block", fontSize: 10, color: PALETTE.inkFaint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{account || ""}</span>
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "center" }}>
              {(() => { const idx = getAvatarIdx(account); return idx !== null && AVATAR_OPTIONS[idx]
                ? <img src={AVATAR_OPTIONS[idx]} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", background: PALETTE.bone }} />
                : <span style={{ width: 32, height: 32, borderRadius: "50%", background: PALETTE.ink, color: "#fff", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 12 }} className="mono">{ROLES[realRole].tag}</span>; })()}
            </div>
          )}
        </div>
      </aside>

      {/* ── Content wrapper (flex sibling of sidebar) ── */}
      <div style={{ flex: 1, minWidth: 0, marginLeft: (isMobile || isTablet) ? 0 : sbW, transition: "margin-left .22s cubic-bezier(.2,.8,.2,1)", display: "flex", flexDirection: "column", minHeight: "100vh" }}>

        {/* Mobile top bar with hamburger */}
        {(isMobile || isTablet) && (
          <div style={{ position: "sticky", top: 0, zIndex: 20, background: `${PALETTE.paper}e6`, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", borderBottom: `1px solid ${PALETTE.line}`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn" onClick={() => setDrawerOpen(true)} style={{ padding: 6, color: PALETTE.inkSoft, display: "flex" }}>
              <Icon size={20} sw={1.8}>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </Icon>
            </button>
            <button className="btn" onClick={() => setView("overview")} style={{ padding: 0, background: "transparent", border: "none", cursor: "pointer", display: "flex" }}>
              <Wordmark size="sm" />
            </button>
          </div>
        )}

        {/* Toolbar: search + filter + new project */}
        {view !== "members" && view !== "profile" && view !== "analytics" && (
          <div style={{ padding: isMobile ? "12px 14px 0" : isTablet ? "14px 20px 0" : "10px 32px 0", display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, flexWrap: "wrap" }}>
            <div className="search">
              <SearchIcon />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={isMobile ? "Search" : "Search projects"} autoComplete="new-password" name="studioos-proj-search" style={isMobile ? { width: 96 } : undefined} />
            </div>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button className="btn" onClick={() => setFilterOpen((o) => !o)} aria-haspopup="true" aria-expanded={filterOpen} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: `1px solid ${filterCount ? PALETTE.clay : PALETTE.line}`, background: filterCount ? PALETTE.claySoft : "transparent", color: filterCount ? PALETTE.clay : PALETTE.inkSoft }}>
                <Filter size={14} strokeWidth={1.9} />
                Filter
                {filterCount > 0 && <span className="mono" style={{ fontSize: 10, fontWeight: 700, minWidth: 15, height: 15, padding: "0 4px", borderRadius: 8, background: PALETTE.clay, color: "#fff", display: "grid", placeItems: "center" }}>{filterCount}</span>}
              </button>
              {filterOpen && (
                <>
                  <div onClick={() => setFilterOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
                  <div className="ovf" style={{ position: "absolute", left: 0, top: "calc(100% + 9px)", width: 220, background: PALETTE.paper, border: `1px solid ${PALETTE.line}`, borderRadius: 13, boxShadow: "0 14px 40px -12px rgba(28,26,23,.22)", overflow: "hidden", zIndex: 31, padding: "14px 14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span className="mono" style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: PALETTE.inkFaint, fontWeight: 600 }}>Filters</span>
                      {filterCount > 0 && <button className="btn" onClick={() => { setFType(""); setFStatus("all"); }} style={{ fontSize: 11.5, fontWeight: 500, color: PALETTE.clay, background: "transparent", padding: 0 }}>Clear all</button>}
                    </div>
                    <Field label="Status">
                      <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={inp}>
                        <option value="all">All statuses</option>
                        <option value="active">In progress</option>
                        <option value="attention">Needs attention</option>
                        <option value="hold">On hold</option>
                        <option value="done">Done</option>
                      </select>
                    </Field>
                    <div style={{ height: 10 }} />
                    <Field label="Project type">
                      <select value={fType} onChange={(e) => setFType(e.target.value)} style={inp}>
                        <option value="">All types</option>
                        {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </Field>
                  </div>
                </>
              )}
            </div>
            {/* Notification bell — toolbar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                className="btn"
                onClick={toggleNotifs}
                style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, border: `1px solid ${notifOpen ? PALETTE.clay : unreadCount > 0 ? "#E9A19E" : PALETTE.line}`, background: notifOpen ? PALETTE.claySoft : unreadCount > 0 ? "#F6D9D8" : "transparent", color: notifOpen ? PALETTE.clay : unreadCount > 0 ? "#E5484D" : PALETTE.inkSoft }}
              >
                <Bell size={16} strokeWidth={unreadCount > 0 ? 2.2 : 1.7} fill={unreadCount > 0 && !notifOpen ? "#E5484D22" : "none"} />
                {unreadCount > 0 && !notifOpen && (
                  <span className="mono" style={{ position: "absolute", top: -9, right: -9, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: "#E5484D", color: "#fff", fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center", border: "2px solid #fff" }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div onClick={() => setNotifOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
                  <div className="ovf" style={{ position: "absolute", right: 0, top: "calc(100% + 9px)", width: 340, maxHeight: "60vh", overflowY: "auto", background: PALETTE.paper, border: `1px solid ${PALETTE.line}`, borderRadius: 13, boxShadow: "0 14px 40px -12px rgba(28,26,23,.22)", zIndex: 31 }}>
                    <div style={{ padding: "13px 15px 11px", borderBottom: `1px solid ${PALETTE.lineSoft}`, position: "sticky", top: 0, background: PALETTE.paper, zIndex: 1 }}>
                      <span className="mono" style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: PALETTE.inkFaint, fontWeight: 600 }}>Notifications</span>
                    </div>
                    {allNotifs.length === 0 ? (
                      <p style={{ fontSize: 12.5, color: PALETTE.inkFaint, textAlign: "center", padding: "28px 16px" }}>You're all caught up.</p>
                    ) : allNotifs.map((n) => (
                      <button key={n.id} className="btn" onClick={() => openNotif(n)} style={{ width: "100%", display: "flex", gap: 11, alignItems: "center", padding: "10px 15px 10px 12px", borderBottom: `1px solid ${PALETTE.lineSoft}`, borderLeft: `3px solid ${n.read ? "transparent" : "#E5484D"}`, textAlign: "left", background: n.read ? "transparent" : "#E5484D0f" }}>
                        <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: "grid", placeItems: "center", background: n.type === "deadline" ? (n.daysLeft < 0 ? "#9E6A521f" : "#E5484D14") : n.type === "supervisor" ? "#9E6A521f" : n.type === "mention" ? PALETTE.claySoft : PALETTE.bone, color: n.type === "deadline" ? (n.daysLeft < 0 ? PALETTE.terra : "#E5484D") : n.type === "supervisor" ? PALETTE.terra : n.type === "mention" ? PALETTE.clay : PALETTE.inkSoft }}>
                          {n.type === "deadline" ? <CalendarClock size={16} strokeWidth={2} /> : n.type === "supervisor" ? <Users size={16} strokeWidth={2} /> : n.type === "mention" ? <AtSign size={16} strokeWidth={2} /> : <UserPlus size={16} strokeWidth={2} />}
                        </span>
                        <span style={{ minWidth: 0, flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontSize: 12.5, fontWeight: 600, color: PALETTE.ink }}>
                          {n.body}{n.projectName ? ` — ${n.projectName}` : ""}{` · ${fmtStamp(n.ts)}`}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Needs Assignment — projects not active in any pipeline */}
            {isMasterLike(role) && (
              <div style={{ position: "relative", flexShrink: 0 }}>
                <button
                  className="btn"
                  onClick={() => setUnassignedOpen((o) => !o)}
                  title="Needs Assignment"
                  style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, border: `1px solid ${unassignedOpen ? PALETTE.clay : orphanedProjects.length > 0 ? "#E9A19E" : PALETTE.line}`, background: unassignedOpen ? PALETTE.claySoft : orphanedProjects.length > 0 ? "#F6D9D8" : "transparent", color: unassignedOpen ? PALETTE.clay : orphanedProjects.length > 0 ? "#E5484D" : PALETTE.inkSoft }}
                >
                  <FolderX size={16} strokeWidth={orphanedProjects.length > 0 ? 2.2 : 1.7} />
                  {orphanedProjects.length > 0 && !unassignedOpen && (
                    <span className="mono" style={{ position: "absolute", top: -9, right: -9, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: "#E5484D", color: "#fff", fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center", border: "2px solid #fff" }}>
                    {orphanedProjects.length > 9 ? "9+" : orphanedProjects.length}
                  </span>
                  )}
                </button>
                {unassignedOpen && (
                  <>
                    <div onClick={() => setUnassignedOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
                    <div className="ovf" style={{ position: "absolute", right: 0, top: "calc(100% + 9px)", width: 320, maxHeight: "60vh", overflowY: "auto", background: PALETTE.paper, border: `1px solid ${PALETTE.line}`, borderRadius: 13, boxShadow: "0 14px 40px -12px rgba(28,26,23,.22)", zIndex: 31 }}>
                      <div style={{ padding: "13px 15px 11px", borderBottom: `1px solid ${PALETTE.lineSoft}`, position: "sticky", top: 0, background: PALETTE.paper, zIndex: 1 }}>
                        <span className="mono" style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: PALETTE.inkFaint, fontWeight: 600 }}>
                          Needs Assignment · {orphanedProjects.length}
                        </span>
                      </div>
                      {orphanedProjects.length === 0 ? (
                        <p style={{ fontSize: 12.5, color: PALETTE.inkFaint, textAlign: "center", padding: "28px 16px" }}>Every project is assigned to a pipeline ✦</p>
                      ) : orphanedProjects.map((p) => (
                        <button
                          key={p.id}
                          className="btn"
                          onClick={() => { openDetail(p); setUnassignedOpen(false); }}
                          style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, padding: "10px 15px", borderBottom: `1px solid ${PALETTE.lineSoft}`, textAlign: "left" }}
                        >
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: PALETTE.ink }}>{p.name}</span>
                          <span style={{ fontSize: 11, color: PALETTE.inkFaint }}>
                            {[p.client, p.type].filter(Boolean).join(" · ") || "No details yet"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <button className="btn btn-primary" onClick={openNew} title="New Project" style={{ padding: isMobile ? "7px 10px" : "7px 13px", borderRadius: 8, background: PALETTE.ink, color: "#fff", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, letterSpacing: "-0.01em", whiteSpace: "nowrap", flexShrink: 0 }}>
              <span style={{ fontSize: 15, marginTop: -1, opacity: 0.85 }}>+</span>
              {isMobile ? "" : " New Project"}
            </button>
          </div>
        )}

      {/* BEGIN: old header placeholder */}
      <div style={{ display: "none" }}>
        <div
          style={{
            maxWidth: 1340,
            margin: "0 auto",
            padding: isMobile ? "8px 14px" : isTablet ? "10px 20px" : "0 26px",
            minHeight: isMobile ? 56 : 80,
            display: "flex",
            alignItems: "center",
            gap: isTablet ? 12 : 34,
            flexWrap: isTablet ? "wrap" : "nowrap",
            rowGap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 15,
              flexShrink: 0,
            }}
          >
            <Wordmark size={isMobile ? "sm" : "lg"} />
            <span
              style={{
                fontSize: 9,
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: PALETTE.inkFaint,
                fontWeight: 600,
                paddingTop: 3,
              }}
              className="mono"
            ></span>
          </div>

          {/* role-aware nav — slim underline tabs (scrolls sideways on mobile, on its own row) */}
          <nav
            className="nav-scroll"
            style={{
              display: "flex",
              gap: 4,
              alignSelf: "stretch",
              alignItems: "stretch",
              order: isTablet ? 3 : 0,
              flexBasis: isTablet ? "100%" : "auto",
              minWidth: 0,
            }}
          >
            <NavTab
              active={view === "overview"}
              onClick={() => setView("overview")}
            >
              Overview
            </NavTab>
            {allow.map((pk) => (
              <NavTab
                key={pk}
                active={view === "board" && boardPipe === pk}
                onClick={() => {
                  setView("board");
                  setBoardPipe(pk);
                }}
              >
                {PIPELINES[pk].short}
              </NavTab>
            ))}
            {isMasterLike(role) && (
              <NavTab
                active={view === "analytics"}
                onClick={() => setView("analytics")}
              >
                Analytics
              </NavTab>
            )}
          </nav>

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: isMobile ? 8 : isTablet ? 12 : 18,
              alignItems: "center",
              flexWrap: isTablet ? "wrap" : "nowrap",
              justifyContent: "flex-end",
            }}
          >
            {view !== "members" &&
              view !== "profile" &&
              view !== "analytics" && (
                <>
                  <div className="search">
                    <SearchIcon />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={isMobile ? "Search" : "Search projects"}
                      style={isMobile ? { width: 96 } : undefined}
                    />
                  </div>

                  {/* filter — type + status */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <button
                      className="btn"
                      onClick={() => setFilterOpen((o) => !o)}
                      aria-haspopup="true"
                      aria-expanded={filterOpen}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 11px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                        border: `1px solid ${filterCount ? PALETTE.clay : PALETTE.line}`,
                        background: filterCount
                          ? PALETTE.claySoft
                          : "transparent",
                        color: filterCount ? PALETTE.clay : PALETTE.inkSoft,
                      }}
                    >
                      <Filter size={14} strokeWidth={1.9} />
                      Filter
                      {filterCount > 0 && (
                        <span
                          className="mono"
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            minWidth: 15,
                            height: 15,
                            padding: "0 4px",
                            borderRadius: 8,
                            background: PALETTE.clay,
                            color: "#fff",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          {filterCount}
                        </span>
                      )}
                    </button>
                    {filterOpen && (
                      <>
                        <div
                          onClick={() => setFilterOpen(false)}
                          style={{ position: "fixed", inset: 0, zIndex: 30 }}
                        />
                        <div
                          className="ovf"
                          style={{
                            position: "absolute",
                            right: 0,
                            top: "calc(100% + 9px)",
                            width: 244,
                            background: PALETTE.paper,
                            border: `1px solid ${PALETTE.line}`,
                            borderRadius: 13,
                            boxShadow: "0 14px 40px -12px rgba(28,26,23,.22)",
                            zIndex: 31,
                            padding: 14,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: 12,
                            }}
                          >
                            <span
                              className="mono"
                              style={{
                                fontSize: 9.5,
                                letterSpacing: "0.14em",
                                textTransform: "uppercase",
                                color: PALETTE.inkFaint,
                                fontWeight: 600,
                              }}
                            >
                              Filter
                            </span>
                            {filterCount > 0 && (
                              <button
                                className="btn"
                                onClick={() => {
                                  setFType("");
                                  setFStatus("all");
                                }}
                                style={{
                                  fontSize: 11.5,
                                  fontWeight: 500,
                                  color: PALETTE.clay,
                                  background: "transparent",
                                  padding: 0,
                                }}
                              >
                                Clear all
                              </button>
                            )}
                          </div>
                          <Field label="Status">
                            <select
                              value={fStatus}
                              onChange={(e) => setFStatus(e.target.value)}
                              style={inp}
                            >
                              <option value="all">All statuses</option>
                              <option value="active">In progress</option>
                              <option value="attention">Needs attention</option>
                              <option value="hold">On hold</option>
                              <option value="done">Done</option>
                            </select>
                          </Field>
                          <div style={{ height: 10 }} />
                          <Field label="Project type">
                            <select
                              value={fType}
                              onChange={(e) => setFType(e.target.value)}
                              style={inp}
                            >
                              <option value="">All types</option>
                              {TYPES.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </Field>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={openNew}
                    title="New Project"
                    style={{
                      padding: isMobile ? "7px 10px" : "7px 13px",
                      borderRadius: 8,
                      background: PALETTE.ink,
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      letterSpacing: "-0.01em",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{ fontSize: 15, marginTop: -1, opacity: 0.85 }}
                    >
                      +
                    </span>
                    {isMobile ? "" : " New Project"}
                  </button>
                </>
              )}

            {/* notifications bell — persisted, so unread items show up whenever you return */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                className={`btn${unreadCount > 0 ? " notif-bell-on" : ""}`}
                onClick={toggleNotifs}
                aria-haspopup="true"
                aria-expanded={notifOpen}
                title={
                  unreadCount > 0
                    ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                    : "Notifications"
                }
                style={{
                  position: "relative",
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background:
                    unreadCount > 0
                      ? "#E5484D14"
                      : notifOpen
                        ? PALETTE.bone
                        : "transparent",
                  color: unreadCount > 0 ? "#E5484D" : PALETTE.inkSoft,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Bell
                  size={18}
                  strokeWidth={unreadCount > 0 ? 2.1 : 1.8}
                  fill={unreadCount > 0 ? "#E5484D22" : "none"}
                />
                {unreadCount > 0 && (
                  <span
                    className="mono notif-badge"
                    style={{
                      position: "absolute",
                      top: 1,
                      right: 1,
                      minWidth: 16,
                      height: 16,
                      padding: "0 4px",
                      borderRadius: 8,
                      background: "#E5484D",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div
                    onClick={() => setNotifOpen(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 30 }}
                  />
                  <div
                    className="ovf"
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 9px)",
                      width: 344,
                      maxHeight: 420,
                      overflowY: "auto",
                      background: PALETTE.paper,
                      border: `1px solid ${PALETTE.line}`,
                      borderRadius: 13,
                      boxShadow: "0 14px 40px -12px rgba(28,26,23,.22)",
                      zIndex: 31,
                    }}
                  >
                    <div
                      style={{
                        padding: "13px 15px 11px",
                        borderBottom: `1px solid ${PALETTE.lineSoft}`,
                        position: "sticky",
                        top: 0,
                        background: PALETTE.paper,
                        zIndex: 1,
                      }}
                    >
                      <span
                        className="mono"
                        style={{
                          fontSize: 9.5,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: PALETTE.inkFaint,
                          fontWeight: 600,
                        }}
                      >
                        Notifications
                      </span>
                    </div>
                    {allNotifs.length === 0 ? (
                      <p
                        style={{
                          fontSize: 12.5,
                          color: PALETTE.inkFaint,
                          textAlign: "center",
                          padding: "28px 16px",
                        }}
                      >
                        You're all caught up.
                      </p>
                    ) : (
                      allNotifs.map((n) => (
                        <button
                          key={n.id}
                          className="btn"
                          onClick={() => openNotif(n)}
                          style={{
                            width: "100%",
                            display: "flex",
                            gap: 11,
                            alignItems: "center",
                            padding: "11px 15px 11px 12px",
                            borderBottom: `1px solid ${PALETTE.lineSoft}`,
                            borderLeft: `3px solid ${n.read ? "transparent" : "#E5484D"}`,
                            textAlign: "left",
                            background: n.read ? "transparent" : "#E5484D0f",
                          }}
                        >
                          <span
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 10,
                              flexShrink: 0,
                              display: "grid",
                              placeItems: "center",
                              background:
                                n.type === "deadline"
                                  ? n.daysLeft < 0
                                    ? "#9E6A521f"
                                    : "#E5484D14"
                                  : n.type === "mention"
                                    ? PALETTE.claySoft
                                    : PALETTE.bone,
                              color:
                                n.type === "deadline"
                                  ? n.daysLeft < 0
                                    ? PALETTE.terra
                                    : "#E5484D"
                                  : n.type === "mention"
                                    ? PALETTE.clay
                                    : PALETTE.inkSoft,
                            }}
                          >
                            {n.type === "deadline" ? (
                              <CalendarClock size={15} strokeWidth={2} />
                            ) : n.type === "mention" ? (
                              <AtSign size={15} strokeWidth={2} />
                            ) : (
                              <UserPlus size={15} strokeWidth={2} />
                            )}
                          </span>
                          <span style={{ minWidth: 0, flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontSize: 12.5, fontWeight: 600, color: PALETTE.ink }}>
                            {n.body}{n.projectName ? ` — ${n.projectName}` : ""}{` · ${fmtStamp(n.ts)}`}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* signed-in identity — click for menu */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                className="btn"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="true"
                aria-expanded={menuOpen}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 7px 5px 5px",
                  borderRadius: 9,
                  background: menuOpen ? PALETTE.bone : "transparent",
                }}
              >
                <span
                  style={{
                    width: 27,
                    height: 27,
                    borderRadius: "50%",
                    background: PALETTE.ink,
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 600,
                    fontSize: 11,
                    flexShrink: 0,
                  }}
                  className="mono"
                >
                  {ROLES[realRole].tag}
                </span>
                {!isMobile && (
                  <span
                    style={{
                      textAlign: "left",
                      lineHeight: 1.2,
                      maxWidth: 140,
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {me ? me.name : ROLES[realRole].label}
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontSize: 10,
                        color: PALETTE.inkFaint,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      className="mono"
                    >
                      {account || ""}
                    </span>
                  </span>
                )}
                {!isMobile && (
                  <span
                    style={{
                      color: PALETTE.inkFaint,
                      transform: menuOpen ? "rotate(180deg)" : "none",
                      transition: "transform .2s ease",
                      display: "grid",
                    }}
                  >
                    <ChevronDown />
                  </span>
                )}
              </button>

              {menuOpen && (
                <>
                  <div
                    onClick={() => setMenuOpen(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 30 }}
                  />
                  <div
                    className="ovf"
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 9px)",
                      width: 248,
                      background: PALETTE.paper,
                      border: `1px solid ${PALETTE.line}`,
                      borderRadius: 13,
                      boxShadow: "0 14px 40px -12px rgba(28,26,23,.22)",
                      overflow: "hidden",
                      zIndex: 31,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 11,
                        padding: "14px 14px 13px",
                      }}
                    >
                      <span
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: PALETTE.ink,
                          color: "#fff",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 600,
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                        className="mono"
                      >
                        {ROLES[realRole].tag}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span
                          style={{
                            display: "block",
                            fontSize: 13.5,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {me ? me.name : ROLES[realRole].label}
                        </span>
                        <span
                          className="mono"
                          style={{
                            display: "block",
                            fontSize: 10.5,
                            color: PALETTE.inkFaint,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {account || ""}
                        </span>
                      </span>
                    </div>
                    <div
                      style={{
                        display: "inline-flex",
                        margin: "0 14px 11px",
                        padding: "3px 9px",
                        borderRadius: 20,
                        background: PALETTE.claySoft,
                        color: PALETTE.clay,
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                      className="mono"
                    >
                      {ROLES[realRole].label}
                    </div>

                    <div
                      style={{
                        borderTop: `1px solid ${PALETTE.lineSoft}`,
                        padding: 5,
                      }}
                    >
                      {realRole === "MASTER" && (
                        <button
                          className="btn menu-item"
                          onClick={() => {
                            setMenuOpen(false);
                            setView("members");
                          }}
                          style={{ borderRadius: 8 }}
                        >
                          <Users size={16} strokeWidth={1.8} /> Members
                        </button>
                      )}
                      <button
                        className="btn menu-item"
                        onClick={() => {
                          setMenuOpen(false);
                          setView("profile");
                        }}
                        style={{ borderRadius: 8 }}
                      >
                        <GearIcon /> Profile settings
                      </button>
                      <button
                        className="btn menu-item danger"
                        onClick={() => {
                          setMenuOpen(false);
                          logout();
                        }}
                        style={{ borderRadius: 8 }}
                      >
                        <LogoutIcon /> Log out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>{/* END: old header placeholder */}

      <main
        style={{
          padding: view === "board"
            ? (isMobile ? "14px 14px 0" : isTablet ? "18px 20px 0" : "10px 32px 0")
            : (isMobile ? "22px 14px 72px" : isTablet ? "28px 20px 90px" : "36px 32px 90px"),
          flex: 1,
        }}
      >
        {view === "overview" ? (
          <Overview
            projects={visible}
            role={role}
            scopePipe={scopePipe}
            allow={allow}
            members={members}
            me={me}
            sidebarExpanded={sidebarExpanded}
            onOpen={openDetail}
            onEdit={(p, pk) => setEditing({ ...p, _pipe: pk })}
            onJump={(pk, stageId) => {
              setView("board");
              setBoardPipe(pk);
              setJumpStage(stageId || null);
            }}
          />
        ) : view === "analytics" && isMasterLike(role) ? (
          <Analytics projects={projects} members={members} />
        ) : view === "members" && role === "MASTER" ? (
          <MembersAdmin
            members={members}
            currentEmail={account}
            onAdd={addMember}
            onUpdate={updateMember}
            onRemove={removeMember}
          />
        ) : view === "profile" ? (
          <ProfileSettings
            me={me}
            role={role}
            account={account}
            onSaveName={saveMyName}
            onSaveAvatar={(idx) => { setAvatarIdx(account, idx); }}
            onSignOut={logout}
            onBack={() => setView("overview")}
          />
        ) : (
          <Board
            key={boardPipe}
            projects={visible}
            allProjects={visibleRaw}
            pipe={boardPipe}
            role={role}
            members={members}
            onOpen={openDetail}
            dragId={dragId}
            setDragId={setDragId}
            dragOver={dragOver}
            setDragOver={setDragOver}
            moveStage={moveStage}
            handover={handover}
            markMasterDone={markMasterDone}
            jumpStage={jumpStage}
            onJumpStageClear={() => setJumpStage(null)}
            onEdit={(p) => setEditing({ ...p, _pipe: boardPipe })}
            onDelete={(p) => setConfirmDel({ p, pk: boardPipe })}
          />
        )}
      </main>

      {detail && (
        <ProjectDetail
          project={detail.p}
          pipe={detail.pk}
          role={role}
          me={me}
          account={account}
          members={members}
          onChanged={refetch}
          onClose={() => setDetail(null)}
          onSetAssignees={(emails) => setAssignees(detail.p.id, emails)}
          onEdit={() => {
            const p = detail.p,
              pk = detail.pk;
            setDetail(null);
            setEditing({ ...p, _pipe: pk });
          }}
          onMoveStage={(stageId) => {
            const { p, pk } = detail;
            moveStage(p.id, pk, stageId);
            setDetail({
              pk,
              p: {
                ...p,
                pipelines: {
                  ...p.pipelines,
                  [pk]: { ...p.pipelines[pk], stage: stageId },
                },
              },
            });
          }}
          onManageMembers={
            role === "MASTER"
              ? () => {
                  setDetail(null);
                  setView("members");
                }
              : null
          }
        />
      )}

      {editing && (
        <ProjectModal
          project={editing}
          role={role}
          members={members}
          projects={projects}
          contextPipe={
            editing._pipe || (view === "board" ? boardPipe : scopePipe)
          }
          onSave={saveProject}
          onClose={() => setEditing(null)}
        />
      )}
      {confirmDel && (
        <ConfirmDelete
          entry={confirmDel}
          role={role}
          onConfirm={doDelete}
          onClose={() => setConfirmDel(null)}
        />
      )}
      </div>{/* end content wrapper */}
    </div>
  );
}

function NavTab({ active, onClick, children }) {
  return (
    <button
      className={`btn navtab${active ? " active" : ""}`}
      onClick={onClick}
      style={{
        padding: "0 13px",
        height: "100%",
        minHeight: 40,
        display: "flex",
        alignItems: "center",
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        letterSpacing: "-0.01em",
        background: active ? PALETTE.bone : "transparent",
        whiteSpace: "nowrap",
        flexShrink: 0,
        color: active ? PALETTE.ink : PALETTE.inkSoft,
        borderRadius: 8,
      }}
    >
      {children}
    </button>
  );
}

/* count-up for dashboard numbers — animates from the previous value, so live
   realtime updates tick smoothly rather than snapping */
function CountUp({ value }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    const to = Number(value) || 0;
    prev.current = to;
    if (from === to) {
      setDisplay(to);
      return;
    }
    let raf, start;
    const dur = 650;
    const tick = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{display}</>;
}

/* ============================== Overview ============================== */
function DeadlineRow({ p, i, list, onRowClick }) {
  const RED = "#9E6A52";
  const overdue = p.d < 0;
  const urgent = p.d <= 7;
  const soon = p.d <= 14;
  const c = urgent ? RED : soon ? PALETTE.clay : PALETTE.inkSoft;
  const weight = urgent ? 700 : 600;
  const pct = Math.max(0, Math.min(100, Number(p.progress) || 0));
  return (
    <button
      className="btn drow"
      onClick={onRowClick}
      style={{
        width: "100%",
        textAlign: "left",
        background: "transparent",
        border: "none",
        display: "block",
        padding: "10px 8px",
        borderRadius: 6,
        borderBottom:
          i < list.length - 1 ? `1px solid ${PALETTE.lineSoft}` : "none",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: PALETTE.ink,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
            fontFamily: FONT_SANS,
          }}
        >
          {p.name}
        </span>
        <span
          className="mono tnum"
          style={{
            fontSize: 11.5,
            fontWeight: weight,
            color: c,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {overdue
            ? `${Math.abs(p.d)}d over`
            : p.d === 0
              ? "today"
              : `${p.d}d left`}
        </span>
      </div>
      <div
        className="mono"
        style={{ fontSize: 10.5, color: PALETTE.inkFaint, marginTop: 3 }}
      >
        {fmtDate(p.due)}
        {p.type ? ` · ${p.type}` : ""}
      </div>
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}
      >
        <div
          style={{
            flex: 1,
            height: 4,
            background: PALETTE.bone,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: urgent ? RED : PALETTE.clay,
              borderRadius: 2,
              transition: "width .5s cubic-bezier(.2,.7,.2,1)",
            }}
          />
        </div>
        <span
          className="mono tnum"
          style={{
            fontSize: 10,
            color: PALETTE.inkFaint,
            minWidth: 26,
            textAlign: "right",
          }}
        >
          {pct}%
        </span>
      </div>
    </button>
  );
}

function Overview({
  projects,
  role,
  scopePipe,
  allow,
  members,
  me,
  sidebarExpanded,
  onEdit,
  onJump,
  onOpen,
}) {
  const { isMobile, isTablet } = useViewport();
  const effectiveScopePipe = isMasterLike(role)
    ? (projects.some((p) => p.pipelines[scopePipe].active) ? scopePipe
      : PIPE_ORDER.find((pk) => projects.some((p) => p.pipelines[pk].active)) || scopePipe)
    : scopePipe;
  const pipe = PIPELINES[effectiveScopePipe];
  const inPipe = projects.filter((p) => p.pipelines[effectiveScopePipe].active);
  const [deadlineModal, setDeadlineModal] = useState(false);
  const [stagePipe, setStagePipe] = useState(scopePipe);
  const stagePipeDef = PIPELINES[stagePipe];
  const stageInPipe = projects.filter((p) => p.pipelines[stagePipe].active);
  const byStage = stagePipeDef.stages.map((st) => ({
    ...st,
    count: stageInPipe.filter((p) => p.pipelines[stagePipe].stage === st.id).length,
  }));
  const maxCount = Math.max(1, ...byStage.map((b) => b.count));

  const portfolio = projects.reduce((s, p) => s + (Number(p.budget) || 0), 0);
  const activePortfolio = inPipe
    .filter((p) => !["done"].includes(p.pipelines[effectiveScopePipe].stage))
    .reduce((s, p) => s + (Number(p.budget) || 0), 0);

  /* upcoming deadlines across ALL visible projects (any project still pending
     in at least one active pipeline), not just the current division. */
  const upcoming = projects
    .filter(
      (p) =>
        p.due &&
        PIPE_ORDER.some(
          (k) => p.pipelines[k].active && p.pipelines[k].stage !== "done",
        ),
    )
    .map((p) => ({ ...p, d: daysUntil(p.due) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 6);

  /* master cross-division snapshot */
  const counts = {
    MASTER: projects.filter(
      (p) => p.pipelines.MASTER.active && p.pipelines.MASTER.stage !== "done",
    ).length,
    DESIGN: projects.filter(
      (p) => p.pipelines.DESIGN.active && p.pipelines.DESIGN.stage !== "done",
    ).length,
    PRODUCTION: projects.filter(
      (p) =>
        p.pipelines.PRODUCTION.active &&
        p.pipelines.PRODUCTION.stage !== "done",
    ).length,
  };

  const cells =
    isMasterLike(role)
      ? [
          {
            label: "Master",
            value: counts.MASTER,
            dot: ROLES.MASTER.color,
            onClick: () => onJump("MASTER"),
          },
          {
            label: "Design",
            value: counts.DESIGN,
            dot: ROLES.DESIGN.color,
            onClick: () => onJump("DESIGN"),
          },
          {
            label: "Production",
            value: counts.PRODUCTION,
            dot: ROLES.PRODUCTION.color,
            onClick: () => onJump("PRODUCTION"),
          },
          {
            label: "Portfolio",
            money: isMobile ? fmtMoneyShort(portfolio) : fmtMoney(portfolio),
            sub: "all projects",
          },
        ]
      : [
          { label: "On board", value: inPipe.length, sub: "this division" },
          {
            label: "Active",
            value: inPipe.filter((p) => p.pipelines[effectiveScopePipe].stage !== "done")
              .length,
            sub: "in progress",
          },
          {
            label: "Completed",
            value: inPipe.filter((p) => p.pipelines[effectiveScopePipe].stage === "done")
              .length,
            sub: "delivered",
          },
          {
            label: "Attention",
            value: inPipe.filter((p) =>
              ["need_info", "perbaikan", "hold"].includes(
                p.pipelines[effectiveScopePipe].stage,
              ),
            ).length,
            sub: "flagged",
          },
        ];

  /* ---- phase-band summary (what the user asked for) ----
     Group the current pipeline's stages into phase bands and count how many
     projects are sitting in each band. Exclude done/hold from "ongoing" total
     at the top, but still show them in the breakdown so nothing is hidden. */
  const phaseData = (() => {
    // Build ordered list of unique phase bands in pipeline order
    const order = [];
    const byKind = {};
    pipe.stages.forEach((st) => {
      if (!byKind[st.kind]) {
        byKind[st.kind] = [];
        order.push(st.kind);
      }
      byKind[st.kind].push(st);
    });
    return order.map((kind) => {
      const stages = byKind[kind];
      const count = inPipe.filter((p) =>
        stages.some((st) => st.id === p.pipelines[effectiveScopePipe].stage),
      ).length;
      const stageBreakdown = stages
        .map((st) => ({
          ...st,
          count: inPipe.filter((p) => p.pipelines[effectiveScopePipe].stage === st.id)
            .length,
        }))
        .filter((st) => st.count > 0);
      return {
        kind,
        label: PHASES[kind] || kind,
        color: KINDS[kind]?.color || PALETTE.inkSoft,
        tint: KINDS[kind]?.tint || PALETTE.bone,
        count,
        stageBreakdown,
      };
    });
  })();

  const totalOngoing = inPipe.filter(
    (p) =>
      !["done", "hold", "catatan"].includes(
        p.pipelines[effectiveScopePipe].stage,
      ),
  ).length;

  const list = isMasterLike(role) ? projects : inPipe;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return "Good Morning";
    if (h >= 12 && h < 18) return "Good Afternoon";
    return "Good Evening";
  })();
  const firstName = (me?.name || "").split(" ")[0] || "there";

  return (
    <div className="fade">
      {/* page header */}
      <div style={{ marginBottom: 26, position: "relative" }}>
        {/* Decorative overview illustrations — top-right */}
        {!isMobile && (() => {
          // When sidebar expands, content area shrinks 160px — assets drift left.
          // Compensate by reducing right values so they stay near the right edge.
          const s = sidebarExpanded ? 160 : 0;
          return (
            <>
              <img src={lamp1Svg} alt="" aria-hidden="true" style={{ position: "absolute", top: -100, right: Math.max(0, 500 - s), width: 200, pointerEvents: "none", zIndex: -1 }} />
              <img src={lamp2Svg} alt="" aria-hidden="true" style={{ position: "absolute", top: -120, right: Math.max(0, 120 - s), width: 200, pointerEvents: "none", zIndex: -1 }} />
              <img src={geometryOverviewSvg} alt="" aria-hidden="true" style={{ position: "absolute", top: -40, right: Math.max(0, 800 - s), width: 120, pointerEvents: "none", opacity: 0.9, zIndex: -1 }} />
            </>
          );
        })()}
        <div
          className="mono"
          style={{
            fontSize: 10.5,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: PALETTE.inkFaint,
            fontWeight: 600,
          }}
        >
          {isMasterLike(role)
            ? "Studio · All divisions"
            : `${pipe.short} Division`}
        </div>
        <h1
          className="serif"
          style={{
            fontSize: isMobile ? 28 : 38,
            fontWeight: 500,
            margin: "11px 0 0",
            letterSpacing: "-0.025em",
            lineHeight: 1.04,
          }}
        >
          {greeting}, {firstName}!
        </h1>
        <p style={{ color: PALETTE.inkSoft, margin: "9px 0 0", fontSize: 14 }}>
          {isMasterLike(role)
            ? "Everything in motion across the studio."
            : `Your division snapshot — ${pipe.label}.`}
        </p>
      </div>

      {/* ── Active by Phase ──────────────────────────────────────────────── */}
      <div className="rise" style={{ marginBottom: 30, position: "relative" }}>
        {!isMobile && !isTablet && (
          <img
            src={overviewSvg}
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: -40,
              right: 0,
              height: 150,
              width: "auto",
              maxWidth: "40%",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
        )}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 10,
            position: "relative",
            zIndex: 1,
          }}
        >
          <div>
            <span
              className="serif"
              style={{
                fontSize: 17,
                fontWeight: 500,
                color: PALETTE.ink,
                letterSpacing: "-0.015em",
              }}
            >
              Active Projects
            </span>
            <span
              className="mono"
              style={{
                marginLeft: 12,
                fontSize: 10.5,
                color: PALETTE.inkFaint,
                letterSpacing: "0.1em",
              }}
            >
              {totalOngoing} ONGOING
            </span>
          </div>
          <button
            className="btn"
            onClick={() => onJump(effectiveScopePipe)}
            style={{
              fontSize: 11.5,
              color: PALETTE.clay,
              fontWeight: 600,
              background: "transparent",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 0",
            }}
          >
            See board <span style={{ fontSize: 14, marginTop: -1 }}>→</span>
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))",
            gap: 10,
            position: "relative",
            zIndex: 1,
          }}
        >
          {phaseData.map((ph) => {
            const isIdle = ph.kind === "done" || ph.kind === "hold";
            return (
              <div
                key={ph.kind}
                onClick={() =>
                  onJump(
                    effectiveScopePipe,
                    ph.stageBreakdown.length === 1 ? ph.stageBreakdown[0].id : undefined,
                  )
                }
                style={{
                  background: PALETTE.paper,
                  border: `1px solid ${PALETTE.line}`,
                  borderRadius: 11,
                  padding: "14px 15px 13px",
                  boxShadow: SOFT_SHADOW,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  position: "relative",
                  overflow: "hidden",
                  cursor: "pointer",
                }}
              >
                {/* coloured left stripe */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    background: ph.color,
                    borderRadius: "11px 0 0 11px",
                    opacity: ph.count ? 1 : 0.3,
                  }}
                />
                <div style={{ paddingLeft: 6 }}>
                  <div
                    style={{
                      display: "flex",
                      align: "center",
                      gap: 7,
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: ph.color,
                        display: "inline-block",
                        marginTop: 2,
                        flexShrink: 0,
                        opacity: ph.count ? 1 : 0.35,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: ph.count ? PALETTE.inkSoft : PALETTE.inkFaint,
                      }}
                      className="mono"
                    >
                      {ph.label}
                    </span>
                  </div>
                  {/* big number */}
                  <div
                    className="mono tnum"
                    style={{
                      fontSize: 36,
                      fontWeight: 500,
                      lineHeight: 1,
                      letterSpacing: "-0.04em",
                      color: ph.count ? PALETTE.ink : PALETTE.inkFaint,
                    }}
                  >
                    <CountUp value={ph.count} />
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: PALETTE.inkFaint,
                      marginTop: 5,
                      fontWeight: 500,
                    }}
                  >
                    {ph.count === 0
                      ? "all clear ✦"
                      : ph.count === 1
                        ? "project"
                        : "projects"}
                  </div>
                </div>
                {/* stage breakdown chips */}
                {ph.stageBreakdown.length > 0 && (
                  <div
                    style={{
                      paddingLeft: 6,
                      borderTop: `1px solid ${PALETTE.lineSoft}`,
                      paddingTop: 9,
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                    }}
                  >
                    {ph.stageBreakdown.map((st) => (
                      <div
                        key={st.id}
                        onClick={(e) => { e.stopPropagation(); onJump(effectiveScopePipe, st.id); }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          cursor: "pointer",
                          borderRadius: 4,
                          padding: "1px 3px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            color: PALETTE.inkSoft,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            minWidth: 0,
                          }}
                        >
                          {st.label}
                        </span>
                        <span
                          className="mono tnum"
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: ph.color,
                            flexShrink: 0,
                          }}
                        >
                          {st.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Lead Status (Hot / Warm / Cold) — Master + Sales ─────────────── */}
      {isMasterLike(role) && (() => {
        const LEAD_KEYS = ["hot", "warm", "cold", "follow_up", "priority", "on_hold"];
        const leadCounts = LEAD_KEYS.map((key) => ({
          ...MASTER_LABEL_MAP[key],
          count: projects.filter((p) => (p.labels || []).includes(key)).length,
        }));
        const hasAny = leadCounts.some((l) => l.count > 0);
        return (
          <div style={{ marginBottom: 28, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, position: "relative", zIndex: 1 }}>
              <div>
                <span className="serif" style={{ fontSize: 17, fontWeight: 500, color: PALETTE.ink, letterSpacing: "-0.015em" }}>
                  Lead Status
                </span>
                <span className="mono" style={{ marginLeft: 12, fontSize: 10.5, color: PALETTE.inkFaint, letterSpacing: "0.1em" }}>
                  {projects.filter((p) => LEAD_KEYS.some((k) => (p.labels || []).includes(k))).length} TAGGED
                </span>
              </div>
              <button className="btn" onClick={() => onJump("MASTER")} style={{ fontSize: 11.5, color: PALETTE.clay, fontWeight: 600, background: "transparent", border: "none", display: "flex", alignItems: "center", gap: 4, padding: "4px 0" }}>
                See board <span style={{ fontSize: 14, marginTop: -1 }}>→</span>
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, position: "relative", zIndex: 1 }}>
              {leadCounts.map((l) => (
                <div
                  key={l.key}
                  onClick={() => onJump("MASTER")}
                  style={{
                    background: l.count > 0 ? l.bg : PALETTE.paper,
                    border: `1px solid ${l.count > 0 ? "transparent" : PALETTE.line}`,
                    borderRadius: 11,
                    padding: "14px 15px 13px",
                    boxShadow: SOFT_SHADOW,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    opacity: l.count === 0 ? 0.55 : 1,
                  }}
                >
                  <span className="mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: l.count > 0 ? l.text : PALETTE.inkFaint }}>
                    {l.label}
                  </span>
                  <span className="mono tnum" style={{ fontSize: 32, fontWeight: 500, lineHeight: 1, letterSpacing: "-0.04em", color: l.count > 0 ? l.text : PALETTE.inkFaint }}>
                    <CountUp value={l.count} />
                  </span>
                  <span style={{ fontSize: 11, color: l.count > 0 ? l.text : PALETTE.inkFaint, opacity: 0.75 }}>
                    {l.count === 1 ? "project" : "projects"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isTablet ? "1fr" : "1.35fr 1fr",
          gap: 20,
          alignItems: "stretch",
        }}
      >
        {/* analytical by-stage table */}
        <Panel
          title={`${stagePipeDef.short} — By Stage`}
          action={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {isMasterLike(role) && (
                <div style={{ display: "flex", gap: 4 }}>
                  {PIPE_ORDER.map((k) => (
                    <button
                      key={k}
                      className="btn"
                      onClick={() => setStagePipe(k)}
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "3px 9px",
                        borderRadius: 20,
                        border: `1px solid ${stagePipe === k ? PALETTE.ink : PALETTE.line}`,
                        background: stagePipe === k ? PALETTE.ink : "transparent",
                        color: stagePipe === k ? "#fff" : PALETTE.inkSoft,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {PIPELINES[k].short}
                    </button>
                  ))}
                </div>
              )}
              <span className="mono" style={{ fontSize: 10, color: PALETTE.inkFaint, letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
                {stageInPipe.length} ACTIVE
              </span>
            </div>
          }
        >
          <div>
            {byStage.map((b, i) => {
              const c = kindOf(b.kind);
              const share = inPipe.length
                ? Math.round((b.count / inPipe.length) * 100)
                : 0;
              return (
                <div
                  key={b.id}
                  className="drow"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "7px 8px",
                    borderRadius: 6,
                    borderBottom:
                      i < byStage.length - 1
                        ? `1px solid ${PALETTE.lineSoft}`
                        : "none",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: c.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      flex: "0 0 132px",
                      fontSize: 12.5,
                      color: PALETTE.ink,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {b.label}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 3,
                      background: PALETTE.bone,
                      borderRadius: 2,
                      overflow: "hidden",
                      minWidth: 24,
                    }}
                  >
                    <div
                      style={{
                        width: `${(b.count / maxCount) * 100}%`,
                        height: "100%",
                        background: b.count ? c.color : "transparent",
                        borderRadius: 2,
                        transition: "width .6s cubic-bezier(.2,.7,.2,1)",
                      }}
                    />
                  </div>
                  <span
                    className="mono tnum"
                    style={{
                      width: 22,
                      textAlign: "right",
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: b.count ? PALETTE.ink : PALETTE.inkFaint,
                    }}
                  >
                    {b.count}
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* upcoming deadlines — capped at 4, "See all" opens modal */}
        <>
          {deadlineModal &&
            createPortal(
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 9000,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "20px",
                }}
              >
                <div
                  onClick={() => setDeadlineModal(false)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(27,26,23,0.38)",
                    backdropFilter: "blur(4px)",
                    WebkitBackdropFilter: "blur(4px)",
                  }}
                />
                <div
                  className="ovf"
                  style={{
                    position: "relative",
                    width: "100%",
                    maxWidth: 560,
                    maxHeight: "80vh",
                    background: PALETTE.paper,
                    border: `1px solid ${PALETTE.line}`,
                    borderRadius: 16,
                    boxShadow: "0 24px 60px -12px rgba(27,26,23,0.30)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 20px",
                      borderBottom: `1px solid ${PALETTE.lineSoft}`,
                      flexShrink: 0,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 10.5,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          color: PALETTE.inkSoft,
                          fontWeight: 600,
                          marginBottom: 4,
                          fontFamily: FONT_SANS,
                        }}
                      >
                        Upcoming Deadlines
                      </div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 500,
                          color: PALETTE.ink,
                          letterSpacing: "-0.02em",
                          fontFamily: FONT_SANS,
                        }}
                      >
                        {upcoming.length} Projects
                      </div>
                    </div>
                    <button
                      className="btn"
                      onClick={() => setDeadlineModal(false)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: PALETTE.bg,
                        border: `1px solid ${PALETTE.line}`,
                        display: "grid",
                        placeItems: "center",
                        color: PALETTE.inkSoft,
                        flexShrink: 0,
                      }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <div
                    className="col-scroll"
                    style={{
                      overflowY: "auto",
                      padding: "8px 12px 16px",
                      flex: 1,
                    }}
                  >
                    {upcoming.map((p, i) => (
                      <DeadlineRow
                        key={p.id}
                        p={p}
                        i={i}
                        list={upcoming}
                        onRowClick={() => {
                          setDeadlineModal(false);
                          onOpen ? onOpen(p) : onEdit(p, scopePipe);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>,
              document.body,
            )}

          <Panel
            title="Upcoming Deadlines"
            action={
              upcoming.length > 4 ? (
                <button
                  className="btn"
                  onClick={() => setDeadlineModal(true)}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: PALETTE.clay,
                    background: "transparent",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 0",
                  }}
                >
                  See all {upcoming.length}{" "}
                  <span style={{ fontSize: 13 }}>→</span>
                </button>
              ) : null
            }
          >
            {upcoming.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  padding: "30px 22px 26px",
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: PALETTE.bg,
                    border: `1px solid ${PALETTE.line}`,
                    display: "grid",
                    placeItems: "center",
                    color: PALETTE.clay,
                    marginBottom: 14,
                  }}
                >
                  <CalendarIcon />
                </div>
                <div
                  style={{ fontSize: 16, fontWeight: 500, color: PALETTE.ink }}
                >
                  All clear
                </div>
                <p
                  style={{
                    fontSize: 12.5,
                    color: PALETTE.inkSoft,
                    margin: "6px 0 0",
                    lineHeight: 1.55,
                    maxWidth: 230,
                  }}
                >
                  No pending deadlines right now.
                </p>
              </div>
            ) : (
              <div>
                {upcoming.slice(0, 4).map((p, i) => (
                  <DeadlineRow
                    key={p.id}
                    p={p}
                    i={i}
                    list={upcoming.slice(0, 4)}
                    onRowClick={() =>
                      onOpen ? onOpen(p) : onEdit(p, scopePipe)
                    }
                  />
                ))}
                {upcoming.length > 4 && (
                  <button
                    className="btn"
                    onClick={() => setDeadlineModal(true)}
                    style={{
                      width: "100%",
                      marginTop: 10,
                      padding: "9px 12px",
                      borderRadius: 8,
                      background: PALETTE.bg,
                      border: `1px solid ${PALETTE.line}`,
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: PALETTE.inkSoft,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    + {upcoming.length - 4} more{" "}
                    <span style={{ fontSize: 14 }}>→</span>
                  </button>
                )}
              </div>
            )}
          </Panel>
        </>
      </div>

      {/* project directory */}
      <div style={{ marginTop: 36 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h2
            className="serif"
            style={{
              fontSize: 22,
              fontWeight: 500,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            {isMasterLike(role) ? "All Projects" : `${pipe.short} Projects`}
          </h2>
          <span
            className="mono"
            style={{
              fontSize: 10.5,
              color: PALETTE.inkFaint,
              letterSpacing: "0.12em",
            }}
          >
            {list.length} TOTAL
          </span>
        </div>
        {list.length === 0 ? (
          <Empty text="No projects match your search." big />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 14,
            }}
          >
            {list.map((p) => (
              <ProjectCard
                key={p.id}
                p={p}
                pipe={isMasterLike(role) ? "MASTER" : scopePipe}
                role={role}
                members={members}
                onEdit={(pp) =>
                  onEdit(pp, isMasterLike(role) ? "MASTER" : scopePipe)
                }
                onOpen={onOpen}
                detailed
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Panel({ title, action, children }) {
  return (
    <section
      style={{
        background: PALETTE.paper,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: 12,
        boxShadow: SOFT_SHADOW,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "12px 16px",
          borderBottom: `1px solid ${PALETTE.lineSoft}`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 10.5,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: PALETTE.inkSoft,
            fontWeight: 600,
          }}
        >
          {title}
        </span>
        {action}
      </div>
      <div style={{ padding: "10px 12px", flex: 1 }}>{children}</div>
    </section>
  );
}

function Empty({ text, big }) {
  return (
    <div
      style={{
        padding: big ? "56px 20px" : "20px 12px",
        textAlign: "center",
        color: PALETTE.inkFaint,
        fontSize: 13,
        border: `1px dashed ${PALETTE.line}`,
        borderRadius: 10,
        background: PALETTE.bg,
      }}
    >
      {text}
    </div>
  );
}

/* ============================== Board ============================== */
function Board({
  projects,
  allProjects,
  pipe,
  role,
  members,
  dragId,
  setDragId,
  dragOver,
  setDragOver,
  moveStage,
  handover,
  markMasterDone,
  jumpStage,
  onJumpStageClear,
  onEdit,
  onDelete,
  onOpen,
}) {
  const { isMobile, isTablet } = useViewport();
  const colW = isMobile ? 220 : 264;
  const cardMin = isMobile ? 200 : 248;
  const writable = canWrite(role, pipe);
  const stageColRefs = useRef({});
  useEffect(() => {
    if (!jumpStage) return;
    const el = stageColRefs.current[jumpStage];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    onJumpStageClear && onJumpStageClear();
  }, [jumpStage]); // eslint-disable-line
  const def = PIPELINES[pipe];
  const onBoard = projects
    .filter((p) => p.pipelines[pipe].active)
    .filter((p) => role === "MASTER" || !isMasterOnly(p));
  const pipeIdx = PIPE_ORDER.indexOf(pipe);
  const unassigned = (allProjects || projects)
    .filter((p) => !p.pipelines[pipe].active)
    // already moved further along another pipeline (e.g. active in Production
    // while looking at the Design board) — no longer relevant to assign here
    .filter(
      (p) => !PIPE_ORDER.some((k, i) => i > pipeIdx && p.pipelines[k].active),
    )
    .filter((p) => role === "MASTER" || !isMasterOnly(p));
  const [trayOpen, setTrayOpen] = React.useState(false);
  const [collapsedCols, setCollapsedCols] = useState({});
  const toggleCol = (id) => setCollapsedCols((c) => ({ ...c, [id]: !c[id] }));
  const mainPadH = isMobile ? 14 : 24; // mirrors <main> horizontal padding

  const dropProps = (stageId) => ({
    onDragOver: (e) => {
      if (writable) {
        e.preventDefault();
        setDragOver(stageId);
      }
    },
    onDragLeave: () => setDragOver((o) => (o === stageId ? null : o)),
    onDrop: () => {
      if (writable && dragId) moveStage(dragId, pipe, stageId);
      setDragId(null);
      setDragOver(null);
    },
  });

  const renderCard = (p) => (
    <div
      key={p.id}
      draggable={writable}
      onDragStart={() => writable && setDragId(p.id)}
      onDragEnd={() => {
        setDragId(null);
        setDragOver(null);
      }}
      className={dragId === p.id ? "drag-ghost" : "card-enter"}
      style={{ cursor: writable ? "grab" : "default" }}
    >
      <BoardCard
        p={p}
        pipe={pipe}
        role={role}
        members={members}
        onOpen={onOpen}
        onEdit={onEdit}
        onDelete={onDelete}
        handover={handover}
        markMasterDone={markMasterDone}
      />
    </div>
  );

  /* annotate each stage with whether it's the first of its phase group */
  const stagesFlat = def.stages.map((st, i) => ({
    ...st,
    isFirstOfPhase: i === 0 || def.stages[i - 1].kind !== st.kind,
  }));

  const pipeConfig = {
    MASTER:     { src: masterSvg,     right: 0,  height: 100 },
    DESIGN:     { src: designSvg,     right: 10, height: 100 },
    PRODUCTION: { src: productionSvg, right: 10, height: 100},
  };
  const pipeIllus = pipeConfig[pipe] || pipeConfig.MASTER;

  return (
    <div className="fade" style={{ position: "relative" }}>
      {/* ── Decorative cat — bottom-left, behind cards ──────────────── */}
      {!isMobile && (
        <img
          src={catSvg}
          alt=""
          aria-hidden="true"
          style={{
            position: "fixed",
            bottom: 40,
            left: isMobile || isTablet ? 60 : 15,
            width: 320,
            pointerEvents: "none",
            zIndex: 0,
            opacity: 0.85,
          }}
        />
      )}

      {/* ── Board header ─────────────────────────────────────────────── */}
      <div
        style={{
          marginBottom: 12,
          position: "relative",
          zIndex: 1,
          minHeight: !isMobile ? 80 : undefined,
        }}
      >
        {/* Illustration — absolute top-right, position independent of the badge below */}
        {!isMobile && (
          <img
            src={pipeIllus.src}
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -40,
              right: pipeIllus.right,
              height: pipeIllus.height,
              width: "auto",
              objectFit: "contain",
              pointerEvents: "none",
            }}
          />
        )}
        {/* Badge — fixed position, doesn't move when the illustration is nudged */}
        {!isMobile && pipe !== "MASTER" && (
          <span
            className="mono"
            style={{
              position: "absolute",
              top: 44,
              right: pipeIllus.right,
              fontSize: 10,
              fontWeight: 600,
              color: PALETTE.clay,
              background: PALETTE.claySoft,
              padding: "5px 11px",
              borderRadius: 20,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {def.short}
          </span>
        )}

        <div>
          <div
            className="mono"
            style={{
              fontSize: 10.5,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: PALETTE.inkFaint,
              fontWeight: 600,
            }}
          >
            {isMasterLike(role) ? "Pipeline" : `${def.short} Division`}
          </div>
          <h1
            className="serif"
            style={{
              fontSize: 28,
              fontWeight: 500,
              margin: "4px 0 0",
              letterSpacing: "-0.025em",
              lineHeight: 1.06,
            }}
          >
            {def.label}
          </h1>
          <p
            style={{ color: PALETTE.inkSoft, margin: "4px 0 0", fontSize: 13 }}
          >
            {writable
              ? "Drag cards between columns to move them."
              : "Read-only — you don't manage this pipeline."}
          </p>
        </div>
      </div>

      {/* ── Unassigned tray — hidden on Master board ─────────────────── */}
      {unassigned.length > 0 && pipe !== "MASTER" && (
        <div
          style={{
            marginBottom: 10,
            border: `1px solid ${PALETTE.line}`,
            borderRadius: 12,
            background: PALETTE.paper,
            overflow: "hidden",
            boxShadow: SOFT_SHADOW,
          }}
        >
          <button
            className="btn"
            onClick={() => setTrayOpen((o) => !o)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "13px 16px",
              background: PALETTE.paper,
              borderBottom: trayOpen ? `1px solid ${PALETTE.lineSoft}` : "none",
              textAlign: "left",
            }}
          >
            <span
              style={{
                color: PALETTE.inkFaint,
                display: "grid",
                transform: trayOpen ? "none" : "rotate(-90deg)",
                transition: "transform .2s ease",
              }}
            >
              <ChevronDown />
            </span>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: PALETTE.inkFaint,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: PALETTE.inkSoft,
                letterSpacing: "-0.01em",
              }}
            >
              Not assigned yet
            </span>
            <span
              className="mono tnum"
              style={{
                marginLeft: "auto",
                fontSize: 11.5,
                fontWeight: 600,
                color: PALETTE.inkFaint,
                background: PALETTE.bg,
                border: `1px solid ${PALETTE.line}`,
                borderRadius: 20,
                padding: "2px 10px",
              }}
            >
              {unassigned.length}
            </span>
          </button>
          {trayOpen && (
            <div style={{ padding: 14, background: PALETTE.bg }}>
              <p
                style={{
                  fontSize: 12,
                  color: PALETTE.inkFaint,
                  margin: "0 0 12px",
                  lineHeight: 1.5,
                }}
              >
                Click the button to add to the early stage
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(auto-fill, minmax(${cardMin}px, 1fr))`,
                  gap: 10,
                }}
              >
                {unassigned.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: PALETTE.paper,
                      border: `1px solid ${PALETTE.line}`,
                      borderRadius: 10,
                      padding: "13px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 9,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: PALETTE.ink,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {p.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: PALETTE.inkFaint,
                          marginTop: 3,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {p.client}
                        {p.type ? ` · ${p.type}` : ""}
                      </div>
                    </div>
                    {p.location && (
                      <div
                        style={{
                          fontSize: 11,
                          color: PALETTE.inkFaint,
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <MapPin size={10} /> {p.location}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {PIPE_ORDER.filter((k) => p.pipelines[k].active).map(
                        (k) => (
                          <span
                            key={k}
                            className="mono"
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: PALETTE.inkSoft,
                              background: PALETTE.bone,
                              borderRadius: 4,
                              padding: "2px 7px",
                            }}
                          >
                            {PIPELINES[k].short} ·{" "}
                            {findStage(k, p.pipelines[k].stage).label}
                          </span>
                        ),
                      )}
                      {!PIPE_ORDER.some((k) => p.pipelines[k].active) && (
                        <span
                          className="mono"
                          style={{
                            fontSize: 9,
                            color: PALETTE.inkFaint,
                            letterSpacing: "0.06em",
                          }}
                        >
                          Not in any pipeline yet
                        </span>
                      )}
                    </div>
                    {writable && (
                      <button
                        className="btn"
                        onClick={() =>
                          handover(
                            p.id,
                            pipe,
                            pipe === "PRODUCTION" &&
                              p.pipelines.MASTER.stage === "prod_ongoing"
                              ? "production"
                              : def.stages[0].id,
                          )
                        }
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          borderRadius: 8,
                          background: PALETTE.ink,
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        <span style={{ fontSize: 14, opacity: 0.85 }}>+</span>{" "}
                        Add to {def.short}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Full-width horizontal Trello board ───────────────────────── */}
      {/* Break out of <main>'s horizontal padding so the board uses the full viewport */}
      <div style={{ marginLeft: -mainPadH, marginRight: -mainPadH }}>
        <div
          className="col-scroll"
          style={{
            display: "flex",
            alignItems: "flex-start",
            overflowX: "auto",
            overflowY: "hidden",
            paddingLeft: mainPadH,
            paddingRight: mainPadH + 40,
            paddingBottom: 0,
            gap: 0,
            height: `calc(100vh - ${unassigned.length > 0 && pipe !== "MASTER" ? 210 : 156}px)`,
            boxSizing: "border-box",
          }}
        >
          {stagesFlat.map((st, idx) => {
            const items = onBoard.filter(
              (p) => p.pipelines[pipe].stage === st.id,
            );
            const isOver = dragOver === st.id;
            const sc = kindOf(st.kind);
            const phaseLabel = PHASES[st.kind];
            const isCollapsed = !!collapsedCols[st.id];
            /* wider gap between phase groups, tighter between siblings */
            const gapBefore = idx === 0 ? 0 : st.isFirstOfPhase ? 20 : 10;
            return (
              <React.Fragment key={st.id}>
                {idx > 0 && <div style={{ width: gapBefore, flexShrink: 0 }} />}
                <div
                  ref={(el) => { stageColRefs.current[st.id] = el; }}
                  style={{
                    width: isCollapsed ? 40 : colW,
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    transition: "width .22s cubic-bezier(.2,.7,.2,1)",
                  }}
                >
                  {/* Phase label row — only on the first stage of each phase, hidden when collapsed */}
                  <div
                    style={{
                      height: 20,
                      display: "flex",
                      alignItems: "center",
                      marginBottom: 5,
                      opacity: isCollapsed ? 0 : 1,
                      transition: "opacity .15s ease",
                    }}
                  >
                    {st.isFirstOfPhase && !isCollapsed && (
                      <>
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: sc.color,
                            flexShrink: 0,
                            marginRight: 6,
                          }}
                        />
                        <span
                          className="mono"
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                            color: sc.color,
                          }}
                        >
                          {phaseLabel}
                        </span>
                      </>
                    )}
                  </div>

                  {isCollapsed ? (
                    /* ── Collapsed: thin vertical strip ── */
                    <button
                      className="btn"
                      onClick={() => toggleCol(st.id)}
                      style={{
                        width: 40,
                        flex: 1,
                        minHeight: 120,
                        background: PALETTE.ink,
                        border: `1px solid ${PALETTE.line}`,
                        borderRadius: 12,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 0",
                        cursor: "pointer",
                        gap: 0,
                      }}
                      title={`Expand ${st.label}`}
                    >
                      {/* ↔ expand icon */}
                      <span
                        style={{ color: "#fff", opacity: 0.5, fontSize: 11 }}
                      >
                        ↔
                      </span>
                      {/* rotated label */}
                      <span
                        style={{
                          writingMode: "vertical-rl",
                          transform: "rotate(180deg)",
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#fff",
                          opacity: 0.85,
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "8px 0",
                        }}
                      >
                        {st.label}
                      </span>
                      {/* count badge */}
                      <span
                        className="mono tnum"
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#fff",
                          opacity: 0.6,
                        }}
                      >
                        {items.length}
                      </span>
                    </button>
                  ) : (
                    /* ── Expanded: normal column ── */
                    <div
                      {...dropProps(st.id)}
                      style={{
                        background: isOver ? sc.tint : PALETTE.bg,
                        border: `1px solid ${isOver ? sc.color : PALETTE.line}`,
                        borderRadius: 12,
                        padding: 9,
                        transition:
                          "background .18s ease, border-color .18s ease",
                        minHeight: 120,
                        maxHeight: "calc(100vh - 310px)",
                        overflowY: "auto",
                      }}
                    >
                      {/* Column header */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          marginBottom: 8,
                          paddingBottom: 7,
                          borderBottom: `1px solid ${PALETTE.lineSoft}`,
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: sc.color,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: PALETTE.ink,
                            flex: 1,
                            letterSpacing: "-0.005em",
                            lineHeight: 1.25,
                            wordBreak: "break-word",
                          }}
                        >
                          {st.label}
                        </span>
                        <span
                          className="mono tnum"
                          style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: PALETTE.inkFaint,
                            background: PALETTE.paper,
                            border: `1px solid ${PALETTE.line}`,
                            borderRadius: 10,
                            padding: "1px 7px",
                            flexShrink: 0,
                          }}
                        >
                          {items.length}
                        </span>
                        {/* Collapse toggle */}
                        <button
                          className="btn"
                          onClick={() => toggleCol(st.id)}
                          title="Collapse column"
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 5,
                            background: "transparent",
                            color: PALETTE.inkFaint,
                            fontSize: 11,
                            display: "grid",
                            placeItems: "center",
                            flexShrink: 0,
                            marginLeft: 2,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = PALETTE.bone;
                            e.currentTarget.style.color = PALETTE.ink;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = PALETTE.inkFaint;
                          }}
                        >
                          ↔
                        </button>
                      </div>

                      {/* Cards stack */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          minHeight: 52,
                        }}
                      >
                        {items.map(renderCard)}
                        {items.length === 0 && (
                          <div
                            style={{
                              fontSize: 11,
                              color: PALETTE.inkFaint,
                              textAlign: "center",
                              padding: "22px 0",
                              opacity: 0.55,
                            }}
                          >
                            {writable ? "Drop here" : "—"}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================== Project Card ============================== */
function ProjectCard({
  p,
  pipe,
  role,
  members,
  compact,
  detailed,
  onEdit,
  onDelete,
  handover,
  markMasterDone,
  onOpen,
}) {
  const assignees = (members || []).filter(
    (m) =>
      m.email &&
      (p.assignees || []).some(
        (e) => e.toLowerCase() === m.email.toLowerCase(),
      ),
  );
  const writable = canWrite(role, pipe);
  const st = findStage(pipe, p.pipelines[pipe].stage);
  const c = kindOf(st.kind);
  const d = daysUntil(p.due);
  const pct = Math.max(0, Math.min(100, Number(p.progress) || 0));
  const spentPct = p.budget
    ? Math.min(100, Math.round((p.spent / p.budget) * 100))
    : 0;

  /* cross-division membership chips (shown on Master cards) */
  const memberships =
    pipe === "MASTER"
      ? PIPE_ORDER.filter((k) => k !== "MASTER" && p.pipelines[k].active).map(
          (k) => ({
            k,
            label: PIPELINES[k].short,
            stage: findStage(k, p.pipelines[k].stage).label,
          }),
        )
      : [];

  /* contextual handover actions */
  const actions = [];
  if (writable && handover) {
    const prodEntryStage =
      p.pipelines.MASTER.stage === "prod_ongoing" ? "production" : "new";
    if (pipe === "MASTER") {
      if (!p.pipelines.DESIGN.active)
        actions.push({
          t: "→ Design",
          fn: () => handover(p.id, "DESIGN", "new"),
        });
      if (!p.pipelines.PRODUCTION.active)
        actions.push({
          t: "→ Production",
          fn: () => handover(p.id, "PRODUCTION", prodEntryStage),
        });
    } else if (pipe === "DESIGN") {
      if (
        ["approved_qs", "handover"].includes(st.id) &&
        !p.pipelines.PRODUCTION.active
      )
        actions.push({
          t: "→ Production",
          fn: () => handover(p.id, "PRODUCTION", prodEntryStage),
        });
    } else if (pipe === "PRODUCTION") {
      if (
        ["handover", "done"].includes(st.id) &&
        p.pipelines.MASTER.active &&
        p.pipelines.MASTER.stage !== "done" &&
        markMasterDone
      )
        actions.push({ t: "✓ Done in Master", fn: () => markMasterDone(p.id) });
    }
  }

  return (
    <div
      className="card"
      onClick={() => onOpen && onOpen(p)}
      style={{
        background: PALETTE.paper,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: 10,
        padding: compact ? 13 : 16,
        cursor: onOpen ? "pointer" : "default",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: c.color,
                flexShrink: 0,
              }}
            />
            <span
              className="mono"
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: PALETTE.inkSoft,
                whiteSpace: "nowrap",
              }}
            >
              {st.label}
            </span>
            <span
              style={{
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: PALETTE.line,
              }}
            />
            <span
              className="mono"
              style={{
                fontSize: 9.5,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: PALETTE.inkFaint,
                whiteSpace: "nowrap",
              }}
            >
              {p.type || "Project"}
            </span>
          </div>
          <h3
            className="serif"
            style={{
              fontSize: compact ? 16 : 17.5,
              fontWeight: 500,
              margin: 0,
              lineHeight: 1.22,
              letterSpacing: "-0.01em",
            }}
          >
            {p.name}
          </h3>
          <div style={{ fontSize: 12.5, color: PALETTE.inkSoft, marginTop: 3 }}>
            {p.client}
          </div>
        </div>
        <div
          className="row-actions"
          style={{ display: "flex", gap: 2, flexShrink: 0 }}
        >
          {writable && (
            <IconBtn label="Edit" onClick={() => onEdit(p)} symbol="✎" />
          )}
          {writable && onDelete && (
            <IconBtn
              label={pipe === "MASTER" ? "Delete" : "Remove from board"}
              onClick={() => onDelete(p)}
              symbol="✕"
              danger
            />
          )}
        </div>
      </div>

      {(() => {
        /* Master card shows every division's labels; a division-scoped card shows only its own. */
        const shown = (p.labels || []).filter((k) =>
          k !== MASTER_ONLY_LABEL && (pipe === "MASTER"
            ? true
            : pipe === "PRODUCTION"
              ? PROD_LABEL_MAP[k]
              : pipe === "DESIGN"
                ? DESIGN_LABEL_MAP[k]
                : ALL_LABEL_MAP[k]),
        );
        return shown.length > 0 ? (
          <div
            style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 10 }}
          >
            {shown.map((k) => (
              <LabelChip key={k} k={k} small />
            ))}
          </div>
        ) : null;
      })()}

      {memberships.length > 0 && (
        <div
          style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}
        >
          {memberships.map((m) => (
            <span
              key={m.k}
              className="mono"
              style={{
                fontSize: 9.5,
                fontWeight: 500,
                letterSpacing: "0.04em",
                color: PALETTE.inkSoft,
                border: `1px solid ${PALETTE.line}`,
                borderRadius: 5,
                padding: "2px 7px",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: ROLES[m.k].color,
                  marginRight: 5,
                  verticalAlign: "middle",
                }}
              />
              {m.label}: {m.stage}
            </span>
          ))}
        </div>
      )}

      {detailed && p.location && (
        <div
          style={{
            fontSize: 12,
            color: PALETTE.inkSoft,
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: PALETTE.inkFaint,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {p.location}
          </span>
        </div>
      )}

      {detailed && ((p.mandors && p.mandors.length > 0) || p.supervisor) && (
        <div
          style={{
            fontSize: 12,
            color: PALETTE.inkSoft,
            marginTop: 6,
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {p.mandors && p.mandors.length > 0 && (
            <span style={{ whiteSpace: "nowrap" }}>
              Mandor: <strong style={{ color: PALETTE.ink, fontWeight: 500 }}>{p.mandors.join(", ")}</strong>
            </span>
          )}
          {p.supervisor && (
            <span style={{ whiteSpace: "nowrap" }}>
              Supervisor: <strong style={{ color: PALETTE.ink, fontWeight: 500 }}>{p.supervisor}</strong>
            </span>
          )}
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 9.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: PALETTE.inkFaint,
              fontWeight: 600,
            }}
          >
            Progress
          </span>
          <span
            className="mono tnum"
            style={{ fontSize: 11, fontWeight: 600, color: PALETTE.inkSoft }}
          >
            {pct}%
          </span>
        </div>
        <div
          style={{
            height: 7,
            background: PALETTE.bone,
            borderRadius: 99,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: `linear-gradient(90deg, #F5C842, #F97316)`,
              borderRadius: 99,
              transition: "width .5s cubic-bezier(.2,.7,.2,1)",
            }}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          alignItems: "flex-end",
          gap: 10,
        }}
      >
        {canEditFinance(role) && (
          <div style={{ minWidth: 0 }}>
            <div
              className="mono"
              style={{
                fontSize: 9.5,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: PALETTE.inkFaint,
                fontWeight: 600,
              }}
            >
              Budget
            </div>
            <div
              className="mono tnum"
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                marginTop: 3,
                color: PALETTE.ink,
              }}
            >
              {fmtMoney(p.budget)}
            </div>
            {p.budget > 0 && (
              <div
                className="mono tnum"
                style={{
                  fontSize: 10.5,
                  color:
                    spentPct > 90 ? KINDS.attention.color : PALETTE.inkFaint,
                  marginTop: 2,
                }}
              >
                {fmtMoney(p.spent)} · {spentPct}%
              </div>
            )}
          </div>
        )}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
          }}
        >
          {p.due && (
            <div style={{ textAlign: "right" }}>
              <div
                className="mono"
                style={{
                  fontSize: 9.5,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: PALETTE.inkFaint,
                  fontWeight: 600,
                }}
              >
                Due
              </div>
              <div
                className="mono tnum"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  marginTop: 3,
                  color: d !== null && d < 0 ? KINDS.attention.color : d !== null && d <= 7 ? PALETTE.clay : PALETTE.ink,
                }}
              >
                {fmtDate(p.due)}
              </div>
              {d !== null && st.id !== "done" && (
                <div
                  className="mono tnum"
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    marginTop: 3,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 7px",
                    borderRadius: 99,
                    background:
                      d < 0
                        ? `${KINDS.attention.color}18`
                        : d === 0
                          ? `${PALETTE.clay}22`
                          : d <= 7
                            ? `${PALETTE.clay}14`
                            : "transparent",
                    color:
                      d < 0
                        ? KINDS.attention.color
                        : d === 0
                          ? PALETTE.clay
                          : d <= 7
                            ? PALETTE.clay
                            : PALETTE.inkFaint,
                  }}
                >
                  {d < 0 ? "⚠ " : d === 0 ? "⚡ " : d <= 7 ? "● " : ""}
                  {d < 0
                    ? `${Math.abs(d)}d overdue`
                    : d === 0
                      ? "due today"
                      : `${d}d left`}
                </div>
              )}
            </div>
          )}
          {assignees.length > 0 && (
            <AvatarStack
              people={assignees.map((m) => m.name || m.email)}
              size={26}
            />
          )}
        </div>
      </div>

      {detailed && p.notes && (
        <p
          style={{
            fontSize: 12,
            color: PALETTE.inkSoft,
            marginTop: 13,
            marginBottom: 0,
            lineHeight: 1.55,
            borderTop: `1px solid ${PALETTE.lineSoft}`,
            paddingTop: 11,
          }}
        >
          {p.notes}
        </p>
      )}

      {actions.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 7,
            flexWrap: "wrap",
            marginTop: 13,
            paddingTop: 12,
            borderTop: `1px solid ${PALETTE.lineSoft}`,
          }}
        >
          {actions.map((a) => (
            <button
              key={a.t}
              className="btn"
              onClick={(e) => {
                e.stopPropagation();
                a.fn();
              }}
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: "5px 10px",
                borderRadius: 7,
                background: "transparent",
                border: `1px solid ${PALETTE.line}`,
                color: PALETTE.ink,
              }}
            >
              {a.t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* round initials avatar — reused on cards and in the detail/feed */
function Avatar({ name, size = 22, title, ring }) {
  return (
    <span
      title={title || name || "Unassigned"}
      className="mono"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: name ? PALETTE.ink : "transparent",
        color: name ? "#fff" : PALETTE.inkFaint,
        border: name ? "none" : `1.5px dashed ${PALETTE.line}`,
        boxShadow: ring ? `0 0 0 2px ${PALETTE.paper}` : "none",
        display: "grid",
        placeItems: "center",
        fontSize: Math.round(size * 0.4),
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {name ? initials(name) : ""}
    </span>
  );
}

/* overlapping row of avatars for multiple assignees, with a +N overflow chip */
function AvatarStack({ people, size = 22, max = 3 }) {
  if (!people || people.length === 0) return null;
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  const overlap = Math.round(size * 0.32);
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center" }}
      title={people.join(", ")}
    >
      {shown.map((nm, i) => (
        <span key={i} style={{ marginLeft: i === 0 ? 0 : -overlap }}>
          <Avatar name={nm} size={size} ring />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="mono"
          style={{
            marginLeft: -overlap,
            width: size,
            height: size,
            borderRadius: "50%",
            background: PALETTE.bone,
            color: PALETTE.inkSoft,
            boxShadow: `0 0 0 2px ${PALETTE.paper}`,
            display: "grid",
            placeItems: "center",
            fontSize: Math.round(size * 0.36),
            fontWeight: 600,
          }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}

/* small calendar due badge — red overdue, clay if within two weeks, muted otherwise */
function DueBadge({ due, stageId, small }) {
  if (!due) return null;
  const d = daysUntil(due);
  const done = stageId === "done";
  const over = d < 0 && !done;
  const soon = d >= 0 && d <= 14 && !done;
  const bg = over
    ? KINDS.attention.color + "1a"
    : soon
      ? PALETTE.claySoft
      : PALETTE.bone;
  const fg = done
    ? PALETTE.inkFaint
    : over
      ? KINDS.attention.color
      : soon
        ? PALETTE.clay
        : PALETTE.inkSoft;
  const label = done
    ? fmtDate(due)
    : over
      ? `${Math.abs(d)}d over`
      : d === 0
        ? "Today"
        : `${d}d left`;
  return (
    <span
      className="mono tnum"
      title={`Due ${fmtDate(due)}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: small ? 9.5 : 10.5,
        fontWeight: 600,
        color: fg,
        background: bg,
        borderRadius: 6,
        padding: small ? "2px 6px" : "3px 8px",
        whiteSpace: "nowrap",
      }}
    >
      <CalendarClock size={small ? 10 : 11} strokeWidth={2} /> {label}
    </span>
  );
}

/* Lean, balanced card for the kanban board — calmer than the detailed overview card.
   The stage is conveyed by the column it sits in, so it's dropped here for a
   stage-colored left accent instead. */
function BoardCard({
  p,
  pipe,
  role,
  members,
  onEdit,
  onDelete,
  handover,
  markMasterDone,
  onOpen,
}) {
  const { isMobile } = useViewport();
  const assignees = (members || []).filter(
    (m) =>
      m.email &&
      (p.assignees || []).some(
        (e) => e.toLowerCase() === m.email.toLowerCase(),
      ),
  );
  const cl = p.checklist || { total: 0, done: 0 };
  const hasCl = cl.total > 0;
  const writable = canWrite(role, pipe);
  const st = findStage(pipe, p.pipelines[pipe].stage);
  const c = kindOf(st.kind);
  const d = daysUntil(p.due);
  const pct = Math.max(0, Math.min(100, Number(p.progress) || 0));
  /* the card's bar tracks checklist completion when a checklist exists, else manual progress */
  const barPct = hasCl ? Math.round((cl.done / cl.total) * 100) : pct;
  const barColor = hasCl && barPct === 100 ? PALETTE.sage : c.color;

  const memberships =
    pipe === "MASTER"
      ? PIPE_ORDER.filter((k) => k !== "MASTER" && p.pipelines[k].active).map(
          (k) => ({
            k,
            label: PIPELINES[k].short,
            stage: findStage(k, p.pipelines[k].stage).label,
          }),
        )
      : [];

  const actions = [];
  if (writable && handover) {
    const prodEntryStage =
      p.pipelines.MASTER.stage === "prod_ongoing" ? "production" : "new";
    if (pipe === "MASTER") {
      if (!p.pipelines.DESIGN.active)
        actions.push({
          t: "→ Design",
          fn: () => handover(p.id, "DESIGN", "new"),
        });
      if (!p.pipelines.PRODUCTION.active)
        actions.push({
          t: "→ Production",
          fn: () => handover(p.id, "PRODUCTION", prodEntryStage),
        });
    } else if (pipe === "DESIGN") {
      if (
        ["approved_qs", "handover"].includes(st.id) &&
        !p.pipelines.PRODUCTION.active
      )
        actions.push({
          t: "→ Production",
          fn: () => handover(p.id, "PRODUCTION", prodEntryStage),
        });
    } else if (pipe === "PRODUCTION") {
      if (
        ["handover", "done"].includes(st.id) &&
        p.pipelines.MASTER.active &&
        p.pipelines.MASTER.stage !== "done" &&
        markMasterDone
      )
        actions.push({ t: "✓ Done in Master", fn: () => markMasterDone(p.id) });
    }
  }

  const svcKey = (p.labels || []).find((k) => k.startsWith("svc:"));
  const svc = svcKey ? SERVICE_TYPE_MAP[svcKey] : null;

  return (
    <div
      className="card"
      onClick={() => onOpen && onOpen(p)}
      style={{
        background: PALETTE.paper,
        border: `1px solid ${PALETTE.line}`,
        borderLeft: svc ? `1px solid ${PALETTE.line}` : `3px solid ${c.color}`,
        borderRadius: 9,
        padding: 0,
        cursor: onOpen ? "pointer" : "default",
        overflow: "hidden",
      }}
    >
      {/* Trello-style service-type stripe — shimmer */}
      {svc && (
        <div
          className="stripe-shimmer"
          style={{
            height: 18,
            background: `linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.11) 50%, transparent 65%), ${svc.stripe}`,
            display: "flex",
            alignItems: "center",
            paddingLeft: 12,
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: svc.textColor,
              opacity: 0.92,
            }}
          >
            {svc.label}
          </span>
        </div>
      )}

      <div style={{ padding: isMobile ? "7px 9px 7px" : "7px 10px 7px" }}>
        {/* Name + action buttons (hidden until hover) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <div style={{ minWidth: 0 }}>
            {/* Top row: Master Only badge + project code */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4, flexWrap: "wrap" }}>
              {role === "MASTER" && isMasterOnly(p) && (
                <span style={{
                  display: "inline-block",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  background: PALETTE.clay,
                  color: "#fff",
                  borderRadius: 4,
                  padding: "1px 5px",
                }}>Master Only</span>
              )}
              {p.code && (
                <span
                  className="mono"
                  style={{
                    display: "inline-block",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    background: PALETTE.bone,
                    color: PALETTE.ink,
                    borderRadius: 5,
                    padding: "2px 7px",
                    border: `1px solid ${PALETTE.line}`,
                  }}
                >
                  {p.code}
                </span>
              )}
            </div>
            <h3
              className="serif"
              style={{
                fontSize: isMobile ? 13 : 14,
                fontWeight: 600,
                margin: 0,
                lineHeight: 1.15,
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {p.name}
            </h3>
            <div
              style={{
                fontSize: 11,
                color: PALETTE.inkSoft,
                marginTop: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {p.client}
            </div>
          </div>
          {writable && (
            <div
              className="row-actions"
              style={{ display: "flex", gap: 2, flexShrink: 0 }}
            >
              <IconBtn label="Edit" onClick={() => onEdit(p)} symbol="✎" />
              {onDelete && (
                <IconBtn
                  label={pipe === "MASTER" ? "Delete" : "Remove from board"}
                  onClick={() => onDelete(p)}
                  symbol="✕"
                  danger
                />
              )}
            </div>
          )}
        </div>

        {/* Label chips — skip svc: stripes, show cx: custom + division labels */}
        {(() => {
          const shown = (p.labels || []).filter((k) => {
            if (k === MASTER_ONLY_LABEL) return false;
            if (k.startsWith("svc:")) return false;
            if (k.startsWith("cx:")) return true;
            return pipe === "MASTER"
              ? true
              : pipe === "PRODUCTION"
                ? !!PROD_LABEL_MAP[k]
                : pipe === "DESIGN"
                  ? !!DESIGN_LABEL_MAP[k]
                  : !!ALL_LABEL_MAP[k];
          });
          return shown.length > 0 ? (
            <div
              style={{
                display: "flex",
                gap: 5,
                flexWrap: "wrap",
                marginTop: 6,
              }}
            >
              {shown.map((k) => (
                <LabelChip key={k} k={k} small />
              ))}
            </div>
          ) : null;
        })()}

        {/* Progress bar — thin, minimal */}
        <div
          style={{
            marginTop: 5,
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          {hasCl && barPct === 100 ? (
            /* All done — show green checkmark badge */
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: PALETTE.sage,
                borderRadius: 20,
                padding: "2px 8px 2px 5px",
              }}
            >
              <Check size={10} strokeWidth={3} color={PALETTE.sageText} />
              <span
                className="mono tnum"
                style={{ fontSize: 9.5, fontWeight: 700, color: PALETTE.sageText }}
              >
                {cl.done}/{cl.total}
              </span>
            </div>
          ) : (
            <>
              {hasCl && (
                <ListChecks
                  size={11}
                  strokeWidth={2}
                  color={PALETTE.inkFaint}
                  style={{ flexShrink: 0 }}
                />
              )}
              <div
                style={{
                  flex: 1,
                  height: 3,
                  background: PALETTE.bone,
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${barPct}%`,
                    height: "100%",
                    background: barColor,
                    borderRadius: 2,
                    transition: "width .5s cubic-bezier(.2,.7,.2,1)",
                  }}
                />
              </div>
              <span
                className="mono tnum"
                style={{
                  fontSize: 9.5,
                  fontWeight: 600,
                  color: PALETTE.inkFaint,
                  minWidth: 26,
                  textAlign: "right",
                }}
              >
                {hasCl ? `${cl.done}/${cl.total}` : `${pct}%`}
              </span>
            </>
          )}
        </div>

        {/* Footer: due badge + avatars */}
        <div
          style={{
            marginTop: 5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
          }}
        >
          <DueBadge due={p.due} stageId={st.id} small />
          <AvatarStack
            people={assignees.map((m) => m.name || m.email)}
            size={20}
          />
        </div>

        {/* Handover / done actions */}
        {actions.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginTop: 8,
              paddingTop: 7,
              borderTop: `1px solid ${PALETTE.lineSoft}`,
            }}
          >
            {actions.map((a) => (
              <button
                key={a.t}
                className="btn"
                onClick={(e) => {
                  e.stopPropagation();
                  a.fn();
                }}
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "5px 10px",
                  borderRadius: 7,
                  background: "transparent",
                  border: `1px solid ${PALETTE.line}`,
                  color: PALETTE.ink,
                }}
              >
                {a.t}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({ symbol, onClick, label, danger }) {
  return (
    <button
      className="btn"
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        width: 25,
        height: 25,
        borderRadius: 6,
        background: "transparent",
        color: danger ? PALETTE.terra : PALETTE.inkFaint,
        fontSize: 12.5,
        display: "grid",
        placeItems: "center",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? PALETTE.terra + "1f"
          : PALETTE.bone;
        e.currentTarget.style.color = danger ? PALETTE.terra : PALETTE.ink;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = danger ? PALETTE.terra : PALETTE.inkFaint;
      }}
    >
      {symbol}
    </button>
  );
}

/* shared full-screen shell for the auth screens (own font import, since the
   main app's <style> isn't mounted yet) */
function AuthShell({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        color: PALETTE.ink,
        fontFamily: FONT_SANS,
        display: "grid",
        placeItems: "center",
        padding: 20,
        letterSpacing: "-0.006em",
        backgroundColor: PALETTE.canvas,
        backgroundImage: `radial-gradient(900px 540px at 50% -18%, #EFEBE2, transparent 62%)`,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@100;400;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { -webkit-font-smoothing: antialiased; }
        ::selection { background: ${PALETTE.ink}; color: #fff; }
        .serif { font-family: ${FONT_SERIF}; }
        .mono { font-family: ${FONT_MONO}; }
        .btn { transition: transform .15s ease, box-shadow .22s ease, filter .2s ease; cursor: pointer; border: none; font-family: inherit; }
        .btn:hover { filter: brightness(1.03); }
        .btn:active { transform: scale(.97); }
        .gbtn:hover { transform: translateY(-1px); box-shadow: 0 12px 26px -12px rgba(27,26,23,.4) !important; }
        :focus-visible { outline: 2px solid ${PALETTE.clay}; outline-offset: 2px; border-radius: 6px; }
        .ovf { animation: pop .42s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes pop { from { opacity: 0; transform: translateY(14px) scale(.985); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { * { animation-duration: .001ms !important; transition-duration: .001ms !important; } }
      `}</style>
      <div
        className="ovf"
        style={{
          width: "min(420px, 96vw)",
          background: PALETTE.paper,
          border: `1px solid ${PALETTE.line}`,
          borderRadius: 20,
          boxShadow: "0 30px 80px rgba(27,26,23,.18)",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <span
      style={{
        fontFamily: "Arial, sans-serif",
        fontWeight: 700,
        fontSize: 16,
        lineHeight: 1,
      }}
    >
      <span style={{ color: "#4285F4" }}>G</span>
      <span style={{ color: "#EA4335" }}>o</span>
      <span style={{ color: "#FBBC05" }}>o</span>
      <span style={{ color: "#4285F4" }}>g</span>
      <span style={{ color: "#34A853" }}>l</span>
      <span style={{ color: "#EA4335" }}>e</span>
    </span>
  );
}

/* ============================== Login ============================== */
function Login({ onGoogle }) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (busy) return;
    setBusy(true);
    const { error } = await onGoogle(); // redirects to Google; only returns here on error
    if (error) {
      alert(error.message);
      setBusy(false);
    }
  };
  return (
    <AuthShell>
      <div style={{ padding: "38px 30px 28px", textAlign: "center" }}>
        <div style={{ display: "inline-block", marginBottom: 4 }}>
          <Wordmark size="sm" />
        </div>
        <p
          style={{
            fontSize: 13.5,
            color: PALETTE.inkSoft,
            margin: "20px 0 22px",
            lineHeight: 1.5,
          }}
        >
          Sign in with your Google account.
        </p>

        <button
          className="btn gbtn"
          onClick={go}
          disabled={busy}
          style={{
            width: "100%",
            padding: "13px 20px",
            borderRadius: 10,
            background: "#fff",
            color: PALETTE.ink,
            fontSize: 14.5,
            fontWeight: 600,
            border: `1px solid ${PALETTE.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            opacity: busy ? 0.6 : 1,
            boxShadow: "0 1px 2px rgba(27,26,23,.05)",
          }}
        >
          {busy ? (
            "Redirecting…"
          ) : (
            <>
              Continue with <GoogleMark />
            </>
          )}
        </button>
      </div>
    </AuthShell>
  );
}

/* shown when signed in to Google but the email isn't an active member */
function NoAccess({ email, onSignOut }) {
  return (
    <AuthShell>
      <div style={{ padding: "30px 30px 28px", textAlign: "center" }}>
        <div style={{ display: "inline-block", marginBottom: 20 }}>
          <Wordmark size="sm" />
        </div>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "#ECE4DE",
            color: "#9E6A52",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 14px",
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          !
        </div>
        <h1
          className="serif"
          style={{ fontSize: 23, fontWeight: 600, margin: 0 }}
        >
          Account not registered
        </h1>
        <p
          style={{
            fontSize: 13.5,
            color: PALETTE.inkSoft,
            margin: "9px 0 4px",
            lineHeight: 1.55,
          }}
        >
          You're signed in as{email ? " " : ""}
          <strong style={{ color: PALETTE.ink }}>{email || "—"}</strong>, but
          this email isn't on the member list yet.
        </p>
        <p
          style={{
            fontSize: 13.5,
            color: PALETTE.inkSoft,
            margin: "0 0 22px",
            lineHeight: 1.55,
          }}
        >
          Ask an admin (Master) to add you via the{" "}
          <strong style={{ color: PALETTE.ink }}>Members</strong> screen, then
          sign in again.
        </p>
        <button
          className="btn"
          onClick={onSignOut}
          style={{
            padding: "11px 20px",
            borderRadius: 10,
            background: PALETTE.bone,
            color: PALETTE.ink,
            fontSize: 14,
            fontWeight: 700,
            border: `1px solid ${PALETTE.line}`,
          }}
        >
          Sign out / switch account
        </button>
      </div>
    </AuthShell>
  );
}

/* ============================== Members (Master only) ============================== */
function MembersAdmin({ members, currentEmail, onAdd, onUpdate, onRemove }) {
  const { isMobile } = useViewport();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("DESIGN");
  const [err, setErr] = useState("");

  const activeMasters = members.filter(
    (m) => m.role === "MASTER" && m.active,
  ).length;
  const isSelf = (m) =>
    m.email.toLowerCase() === (currentEmail || "").toLowerCase();
  /* protect against lock-out: can't edit/remove yourself or the last active Master */
  const locked = (m) =>
    isSelf(m) || (m.role === "MASTER" && m.active && activeMasters <= 1);

  const add = () => {
    const e = email.trim().toLowerCase();
    if (!isEmail(e)) {
      setErr("Invalid email address.");
      return;
    }
    if (members.some((m) => m.email.toLowerCase() === e)) {
      setErr("This email is already registered.");
      return;
    }
    onAdd(e, name, role);
    setEmail("");
    setName("");
    setRole("DESIGN");
    setErr("");
  };
  const onKey = (e) => {
    if (e.key === "Enter") add();
  };

  const sorted = [...members].sort(
    (a, b) =>
      ROLE_LIST.indexOf(a.role) - ROLE_LIST.indexOf(b.role) ||
      a.name.localeCompare(b.name),
  );

  return (
    <div className="fade">
      <div style={{ marginBottom: 26, position: "relative" }}>
        <img src={plantSvg} alt="" aria-hidden="true" style={{ position: "absolute", top: -10, left: 150, width: 50, pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1 }}>
        <div
          className="mono"
          style={{
            fontSize: 10.5,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: PALETTE.inkFaint,
            fontWeight: 600,
          }}
        >
          Access control
        </div>
        <h1
          className="serif"
          style={{
            fontSize: 32,
            fontWeight: 500,
            margin: "9px 0 0",
            letterSpacing: "-0.025em",
            lineHeight: 1.04,
          }}
        >
          Members
        </h1>
        <p
          style={{ color: PALETTE.inkSoft, margin: "9px 0 0", fontSize: 13.5 }}
        >
          Add an employee's email and assign their division. When they sign in
          with Google, access is determined by this list.
        </p>
        </div>
      </div>

      <Panel title="Add member">
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div style={{ flex: "2 1 240px" }}>
            <Field label="Email (Google)">
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErr("");
                }}
                onKeyDown={onKey}
                placeholder="name@gmail.com"
                style={inp}
              />
            </Field>
          </div>
          <div style={{ flex: "2 1 180px" }}>
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={onKey}
                placeholder="Full name"
                style={inp}
              />
            </Field>
          </div>
          <div style={{ flex: "1 1 150px" }}>
            <Field label="Division / Role">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={inp}
              >
                {ROLE_LIST.map((r) => (
                  <option key={r} value={r}>
                    {ROLES[r].label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <button
            className="btn btn-primary"
            onClick={add}
            style={{
              padding: "9px 16px",
              borderRadius: 8,
              background: PALETTE.ink,
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              height: 38,
              letterSpacing: "-0.01em",
            }}
          >
            + Add
          </button>
        </div>
        {err && (
          <div
            style={{
              marginTop: 12,
              fontSize: 12.5,
              fontWeight: 500,
              color: PALETTE.terra,
              background: PALETTE.terra + "14",
              border: `1px solid ${PALETTE.terra}33`,
              borderRadius: 8,
              padding: "9px 12px",
            }}
          >
            {err}
          </div>
        )}
      </Panel>

      <div
        style={{
          marginTop: 20,
          background: PALETTE.paper,
          border: `1px solid ${PALETTE.line}`,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: SOFT_SHADOW,
        }}
      >
        <div
          style={{
            display: isMobile ? "none" : "flex",
            alignItems: "center",
            padding: "12px 18px",
            borderBottom: `1px solid ${PALETTE.lineSoft}`,
            fontSize: 10.5,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: PALETTE.inkSoft,
            fontWeight: 600,
          }}
        >
          <span style={{ flex: "1 1 auto" }}>Members · {members.length}</span>
          <span style={{ width: 150, flexShrink: 0 }}>Division</span>
          <span style={{ width: 110, flexShrink: 0 }}>Status</span>
          <span style={{ width: 40, flexShrink: 0 }} />
        </div>
        {sorted.map((m, i) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: isMobile ? "wrap" : "nowrap",
              padding: "12px 18px",
              borderBottom:
                i < sorted.length - 1
                  ? `1px solid ${PALETTE.lineSoft}`
                  : "none",
              gap: 10,
              rowGap: 11,
              opacity: m.active ? 1 : 0.5,
            }}
          >
            {(() => { const idx = getAvatarIdx(m.email); return idx !== null && AVATAR_OPTIONS[idx]
              ? <img src={AVATAR_OPTIONS[idx]} alt="" style={{ width: 33, height: 33, borderRadius: "50%", objectFit: "cover", flexShrink: 0, background: PALETTE.bone }} />
              : <span style={{ width: 33, height: 33, borderRadius: "50%", background: PALETTE.ink, color: "#fff", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 12.5, flexShrink: 0 }} className="mono">{ROLES[m.role].tag}</span>; })()}
            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {m.name}
                </span>
                {isSelf(m) && (
                  <span
                    className="mono"
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: PALETTE.clay,
                      background: PALETTE.claySoft,
                      borderRadius: 20,
                      padding: "2px 8px",
                      flexShrink: 0,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    You
                  </span>
                )}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: PALETTE.inkFaint,
                  marginTop: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {m.email}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flex: isMobile ? "1 1 100%" : "0 0 auto",
              }}
            >
              <div
                style={{
                  width: isMobile ? "auto" : 150,
                  flex: isMobile ? "1 1 130px" : "0 0 150px",
                }}
              >
                <select
                  value={m.role}
                  disabled={locked(m)}
                  onChange={(e) => onUpdate(m.id, { role: e.target.value })}
                  style={{
                    ...inp,
                    padding: "7px 10px",
                    fontSize: 12.5,
                    ...(locked(m) ? roInp : {}),
                  }}
                >
                  {ROLE_LIST.map((r) => (
                    <option key={r} value={r}>
                      {ROLES[r].label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ width: 110, flexShrink: 0 }}>
                <button
                  className="btn"
                  disabled={locked(m)}
                  onClick={() => onUpdate(m.id, { active: !m.active })}
                  title={m.active ? "Deactivate" : "Activate"}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    padding: "6px 12px",
                    borderRadius: 7,
                    border: `1px solid ${m.active ? PALETTE.sage + "66" : PALETTE.line}`,
                    background: m.active ? PALETTE.sage + "33" : "transparent",
                    color: m.active ? PALETTE.sageText : PALETTE.inkSoft,
                    cursor: locked(m) ? "not-allowed" : "pointer",
                    opacity: locked(m) ? 0.5 : 1,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: m.active ? PALETTE.sage : PALETTE.inkFaint,
                    }}
                  />
                  {m.active ? "Active" : "Inactive"}
                </button>
              </div>
              <div
                style={{
                  width: 40,
                  flexShrink: 0,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                {!locked(m) && (
                  <IconBtn
                    label="Remove member"
                    onClick={() => onRemove(m.id)}
                    symbol="✕"
                    danger
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p
        style={{
          fontSize: 12,
          color: PALETTE.inkFaint,
          margin: "16px 2px 0",
          lineHeight: 1.55,
        }}
      >
        Your own account and the last active Master can't be changed or removed,
        so you don't get locked out. Changing someone's division takes effect on
        their next sign-in.
      </p>
    </div>
  );
}

/* ============================== Analytics ============================== */
function Analytics({ projects, members }) {
  const { isTablet } = useViewport();
  const [pk, setPk] = useState("MASTER");
  const [activityPk, setActivityPk] = useState("ALL");
  const [selectedPid, setSelectedPid] = useState(null);
  const [expandedMembers, setExpandedMembers] = useState({});
  const [workloadPk, setWorkloadPk] = useState("ALL");
  const now = nowMs();
  const { holidays } = useIndonesianHolidays();

  /* ---- active projects (exclude done AND hold) ---- */
  const activeProjects = projects.filter((p) =>
    PIPE_ORDER.some(
      (k) =>
        p.pipelines[k].active &&
        p.pipelines[k].stage !== "done" &&
        p.pipelines[k].stage !== "hold",
    ),
  );

  /* ---- selected project for time-spent card ---- */
  const allProjectsSorted = [...projects].sort((a, b) =>
    (a.name || a.code || "").localeCompare(b.name || b.code || ""),
  );
  const selectedProject =
    (selectedPid ? projects.find((p) => p.id === selectedPid) : null) ||
    activeProjects[0] ||
    projects[0] ||
    null;

  /* time spent per stage for selected project */
  const timeSpentPipelines = selectedProject
    ? PIPE_ORDER.map((pipeKey) => {
        if (!selectedProject.pipelines[pipeKey].active) return null;
        const hist = stageHistory(selectedProject, pipeKey);
        if (!hist.length) return null;
        const entries = hist.map((h, i) => {
          const toTs = i < hist.length - 1 ? hist[i + 1].ts : now;
          const s = findStage(pipeKey, h.stage);
          return {
            label: s.label,
            kind: s.kind,
            ms: workingMs(h.ts, toTs, holidays),
            ongoing: i === hist.length - 1,
          };
        });
        return { pipeKey, pipelineLabel: PIPELINES[pipeKey].short, color: ROLES[pipeKey].color, entries };
      }).filter(Boolean)
    : [];

  /* ---- all stage moves (for activity feed) ---- */
  const allMoves = [];
  projects.forEach((p) => {
    const pName = p.name || p.code || "Untitled";
    PIPE_ORDER.forEach((pipeKey) => {
      const hist = stageHistory(p, pipeKey);
      for (let i = 1; i < hist.length; i++) {
        const fromS = findStage(pipeKey, hist[i - 1].stage);
        const toS = findStage(pipeKey, hist[i].stage);
        allMoves.push({
          ts: hist[i].ts,
          projectName: pName,
          projectCode: p.code || "",
          pipeline: pipeKey,
          pipelineLabel: PIPELINES[pipeKey].short,
          pipelineColor: ROLES[pipeKey].color,
          fromStage: fromS.label,
          toStage: toS.label,
          toKind: toS.kind,
          actor: hist[i].actor || "",
        });
      }
    });
  });
  allMoves.sort((a, b) => b.ts - a.ts);
  const filteredMoves = activityPk === "ALL" ? allMoves : allMoves.filter((m) => m.pipeline === activityPk);
  const shownMoves = filteredMoves.slice(0, 20);

  /* ---- bar chart: projects per stage in selected pipeline ---- */
  const barStages = PIPELINES[pk].stages.filter((s) => s.id !== "done" && s.id !== "hold");
  const barData = barStages.map((s) => ({
    ...s,
    count: projects.filter((p) => p.pipelines[pk].active && p.pipelines[pk].stage === s.id).length,
  }));
  const maxBar = Math.max(1, ...barData.map((b) => b.count));

  /* ---- workload per member ---- */
  const workload = members
    .filter((m) => m.active)
    .map((m) => ({
      m,
      myProjects: activeProjects.filter((p) =>
        (p.assignees || []).some((e) => e.toLowerCase() === m.email.toLowerCase()),
      ),
    }))
    .sort((a, b) => b.myProjects.length - a.myProjects.length || (a.m.name || a.m.email).localeCompare(b.m.name || b.m.email));

  const workloadFiltered = workloadPk === "ALL"
    ? workload
    : workload.filter(({ m }) => m.role === workloadPk);

  /* stage progress ratio for a project (in its primary active pipeline) */
  const stageProgress = (p) => {
    for (const k of PIPE_ORDER) {
      if (p.pipelines[k].active) {
        const stages = PIPELINES[k].stages.filter((s) => s.id !== "hold");
        const idx = stages.findIndex((s) => s.id === p.pipelines[k].stage);
        const pct = idx < 0 ? 0 : Math.round((idx / Math.max(1, stages.length - 1)) * 100);
        return { pct, stageName: findStage(k, p.pipelines[k].stage).label, pipeKey: k };
      }
    }
    return { pct: 0, stageName: "—", pipeKey: "MASTER" };
  };

  const toggleMember = (id) =>
    setExpandedMembers((prev) => ({ ...prev, [id]: !prev[id] }));

  /* ---- styles ---- */
  const pill = (active, color) => ({
    padding: "3px 11px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    border: `1px solid ${active ? color : PALETTE.line}`,
    background: active ? color : "transparent",
    color: active ? "#fff" : PALETTE.inkSoft,
    cursor: "pointer",
  });

  const cardStyle = {
    background: PALETTE.paper,
    border: `1px solid ${PALETTE.line}`,
    borderRadius: 14,
    boxShadow: SOFT_SHADOW,
    overflow: "hidden",
  };

  const cardHead = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 18px",
    borderBottom: `1px solid ${PALETTE.lineSoft}`,
    gap: 8,
    flexWrap: "wrap",
  };

  return (
    <div className="fade">
      {/* header */}
      <div style={{ marginBottom: 20, position: "relative" }}>
        <img src={booksSvg} alt="" aria-hidden="true" style={{ position: "absolute", top: -20, left: 300, width: 65, pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: PALETTE.inkFaint, fontWeight: 600 }}>
            Studio · Insights
          </div>
          <h1 className="serif" style={{ fontSize: isTablet ? 24 : 28, fontWeight: 500, margin: "6px 0 0", letterSpacing: "-0.025em", lineHeight: 1.06 }}>
            Analytics Dashboard
          </h1>
        </div>
      </div>

      {/* ── ROW 1: Time Spent per Project | Projects per Stage ── */}
      <div style={{ display: "grid", gridTemplateColumns: isTablet ? "1fr" : "1fr 1.6fr", gap: 14, marginBottom: 14 }}>

        {/* Left: Time Spent per Project */}
        <div style={cardStyle}>
          <div style={cardHead}>
            <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.ink, flexShrink: 0 }}>Time Spent per Project</div>
            <select
              value={selectedProject ? selectedProject.id : ""}
              onChange={(e) => setSelectedPid(e.target.value)}
              style={{
                fontSize: 11.5,
                fontWeight: 500,
                color: PALETTE.ink,
                background: PALETTE.bg,
                border: `1px solid ${PALETTE.line}`,
                borderRadius: 8,
                padding: "4px 8px",
                outline: "none",
                maxWidth: 160,
                minWidth: 0,
                width: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                cursor: "pointer",
              }}
            >
              {allProjectsSorted.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.code || "Untitled"}
                </option>
              ))}
            </select>
          </div>

          <div style={{ padding: "12px 18px 16px", maxHeight: 320, overflowY: "auto" }}>
            {!selectedProject ? (
              <div style={{ color: PALETTE.inkFaint, fontSize: 13, textAlign: "center", padding: "24px 0" }}>No projects yet.</div>
            ) : timeSpentPipelines.length === 0 ? (
              <div style={{ color: PALETTE.inkFaint, fontSize: 12.5, textAlign: "center", padding: "20px 0" }}>No stage history recorded yet for this project.</div>
            ) : (
              timeSpentPipelines.map(({ pipeKey, pipelineLabel, color, entries }) => (
                <div key={pipeKey} style={{ marginBottom: 14 }}>
                  {/* pipeline label */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: PALETTE.inkSoft }}>
                      {pipelineLabel} Pipeline
                    </span>
                  </div>
                  {/* stage rows */}
                  {entries.map((e, i) => {
                    const c = kindOf(e.kind);
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "7px 10px",
                          marginBottom: 4,
                          borderRadius: 8,
                          background: e.ongoing ? color + "12" : PALETTE.bg,
                          border: `1px solid ${e.ongoing ? color + "30" : PALETTE.lineSoft}`,
                        }}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: e.ongoing ? color : c.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12, color: PALETTE.ink, fontWeight: e.ongoing ? 600 : 400, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {e.label}
                        </span>
                        <span className="mono tnum" style={{ fontSize: 11.5, fontWeight: 600, color: e.ongoing ? color : PALETTE.inkSoft, flexShrink: 0 }}>
                          {fmtDur(e.ms)}
                        </span>
                        {e.ongoing && (
                          <span style={{ fontSize: 9.5, fontWeight: 700, color: color, background: color + "20", padding: "1px 6px", borderRadius: 8, letterSpacing: "0.05em", flexShrink: 0 }}>
                            NOW
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Projects per Stage bar chart */}
        <div style={{ ...cardStyle }}>
          <div style={{ ...cardHead }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.ink }}>Projects per Stage</div>
            <div style={{ display: "flex", gap: 5 }}>
              {PIPE_ORDER.map((k) => (
                <button key={k} className="btn" onClick={() => setPk(k)} style={{
                  ...pill(pk === k, ROLES[k].color),
                }}>
                  {PIPELINES[k].short}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: "14px 8px 12px" }}>
            {(() => {
              const VW = 700, VH = 280;
              const leftM = 28, rightM = 8, topM = 30, barBottom = 185;
              const n = barData.length;
              const slotW = (VW - leftM - rightM) / Math.max(n, 1);
              const barW = Math.min(52, slotW * 0.65);
              return (
                <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="240" style={{ display: "block" }} preserveAspectRatio="xMidYMid meet">
                  {[0, 0.5, 1].map((f) => {
                    const y = topM + (1 - f) * (barBottom - topM);
                    return (
                      <g key={f}>
                        <line x1={leftM} y1={y} x2={VW - rightM} y2={y} stroke="rgba(27,26,23,0.1)" strokeWidth={1} strokeDasharray="4 4" />
                        <text x={leftM - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#9B968C" fontFamily="monospace">{Math.round(f * maxBar)}</text>
                      </g>
                    );
                  })}
                  {barData.map((b, i) => {
                    const barH = Math.max(3, (b.count / maxBar) * (barBottom - topM));
                    const cx = leftM + i * slotW + slotW / 2;
                    const x = cx - barW / 2;
                    const y = barBottom - barH;
                    return (
                      <g key={b.id}>
                        <rect x={x} y={y} width={barW} height={barH} rx={7} fill={b.count ? "#8C6F58" : "rgba(27,26,23,0.07)"} />
                        {b.count > 0 && (
                          <text x={cx} y={Math.max(topM - 4, y - 6)} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1B1A17" fontFamily="monospace">{b.count}</text>
                        )}
                        <text x={cx} y={barBottom + 14} textAnchor="end" fontSize="9.5" fill="#6B6760" fontFamily="sans-serif"
                          transform={`rotate(-38, ${cx}, ${barBottom + 14})`}>
                          {b.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── ROW 2: Workload | Recent Activity ── */}
      <div style={{ display: "grid", gridTemplateColumns: isTablet ? "1fr" : "1fr 1.6fr", gap: 14 }}>

        {/* Left: Workload */}
        <div style={cardStyle}>
          <div style={{ ...cardHead, borderBottom: `1px solid ${PALETTE.line}`, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.ink }}>Workload</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
              {["ALL", ...PIPE_ORDER].map((k) => (
                <button key={k} className="btn" onClick={() => setWorkloadPk(k)} style={pill(workloadPk === k, k === "ALL" ? PALETTE.ink : ROLES[k].color)}>
                  {k === "ALL" ? "All" : PIPELINES[k].short}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: "8px 0" }}>
            {workloadFiltered.length === 0 ? (
              <div style={{ padding: "20px 18px", color: PALETTE.inkFaint, fontSize: 13, textAlign: "center" }}>No members yet.</div>
            ) : (
              workloadFiltered.map(({ m, myProjects }) => {
                const expanded = !!expandedMembers[m.id];
                return (
                  <div key={m.id}>
                    {/* member row */}
                    <button
                      className="btn"
                      onClick={() => toggleMember(m.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "9px 16px",
                        background: expanded ? PALETTE.bg : "transparent",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        borderBottom: `1px solid ${PALETTE.lineSoft}`,
                      }}
                    >
                      <Avatar name={m.name || m.email} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: PALETTE.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {m.name || m.email}
                        </div>
                        <div className="mono" style={{ fontSize: 9.5, color: PALETTE.inkFaint }}>
                          {ROLES[m.role].label}
                        </div>
                      </div>
                      <span className="mono tnum" style={{ fontSize: 13, fontWeight: 700, color: myProjects.length ? PALETTE.ink : PALETTE.inkFaint, marginRight: 2 }}>
                        {myProjects.length}
                      </span>
                      <span style={{ fontSize: 11, color: PALETTE.inkFaint }}>project{myProjects.length !== 1 ? "s" : ""}</span>
                      <Icon
                        size={14}
                        d={expanded ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"}
                        style={{ color: PALETTE.inkFaint, flexShrink: 0, marginLeft: 2 }}
                      />
                    </button>

                    {/* expanded: project list */}
                    {expanded && (
                      <div style={{ background: PALETTE.bg, borderBottom: `1px solid ${PALETTE.lineSoft}` }}>
                        {myProjects.length === 0 ? (
                          <div style={{ padding: "10px 18px 12px", fontSize: 12, color: PALETTE.inkFaint }}>No active projects.</div>
                        ) : (
                          myProjects.map((p) => {
                            const { pct, stageName, pipeKey } = stageProgress(p);
                            const pipeColor = ROLES[pipeKey].color;
                            return (
                              <div key={p.id} style={{ padding: "8px 16px 8px 52px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: PALETTE.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      {p.name || p.code || "Untitled"}
                                    </div>
                                    <div style={{ fontSize: 10.5, color: PALETTE.inkSoft, marginTop: 1 }}>{stageName}</div>
                                  </div>
                                  <span className="mono tnum" style={{ fontSize: 11, color: PALETTE.inkFaint, flexShrink: 0 }}>{pct}%</span>
                                </div>
                                <div style={{ height: 5, background: PALETTE.bone, borderRadius: 3, overflow: "hidden" }}>
                                  <div style={{
                                    width: `${pct}%`,
                                    height: "100%",
                                    background: pipeColor,
                                    borderRadius: 3,
                                    transition: "width .5s ease",
                                  }} />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Recent Activity (compact) */}
        <div style={cardStyle}>
          <div style={cardHead}>
            <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.ink }}>Recent Activity</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {["ALL", ...PIPE_ORDER].map((k) => (
                <button key={k} className="btn" onClick={() => setActivityPk(k)} style={pill(activityPk === k, k === "ALL" ? PALETTE.ink : ROLES[k].color)}>
                  {k === "ALL" ? "All" : PIPELINES[k].short}
                </button>
              ))}
            </div>
          </div>

          {shownMoves.length === 0 ? (
            <div style={{ padding: "32px 18px", textAlign: "center", color: PALETTE.inkFaint, fontSize: 13 }}>No stage moves recorded yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              {/* col headers */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1.3fr 1fr 1fr 0.9fr 64px",
                padding: "7px 16px",
                background: PALETTE.bg,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: PALETTE.inkFaint,
                borderBottom: `1px solid ${PALETTE.lineSoft}`,
                minWidth: 480,
              }}>
                <span>Project</span>
                <span>From → To</span>
                <span>Pipeline</span>
                <span>By</span>
                <span style={{ textAlign: "right" }}>When</span>
              </div>

              {shownMoves.map((mv, i) => {
                const toC = kindOf(mv.toKind);
                return (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.3fr 1fr 1fr 0.9fr 64px",
                      alignItems: "center",
                      padding: "8px 16px",
                      background: i % 2 === 0 ? PALETTE.paper : PALETTE.bg,
                      borderBottom: i < shownMoves.length - 1 ? `1px solid ${PALETTE.lineSoft}` : "none",
                      gap: 4,
                      minWidth: 480,
                    }}
                  >
                    {/* project */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: PALETTE.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {mv.projectName}
                      </div>
                      {mv.projectCode && (
                        <div className="mono" style={{ fontSize: 9, color: PALETTE.inkFaint }}>{mv.projectCode}</div>
                      )}
                    </div>
                    {/* from → to */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 10.5, color: PALETTE.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {mv.fromStage}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 1 }}>
                        <span style={{ fontSize: 9.5, color: PALETTE.inkFaint }}>→</span>
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: toC.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {mv.toStage}
                        </span>
                      </div>
                    </div>
                    {/* pipeline badge */}
                    <div>
                      <span style={{
                        display: "inline-block",
                        padding: "1px 7px",
                        borderRadius: 8,
                        fontSize: 9.5,
                        fontWeight: 700,
                        background: mv.pipelineColor + "1a",
                        color: mv.pipelineColor,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}>
                        {mv.pipelineLabel}
                      </span>
                    </div>
                    {/* by */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 10.5, color: PALETTE.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {mv.actor || <span style={{ color: PALETTE.inkFaint }}>—</span>}
                      </div>
                    </div>
                    {/* time */}
                    <div className="mono" style={{ fontSize: 9.5, color: PALETTE.inkFaint, textAlign: "right", whiteSpace: "nowrap" }}>
                      {fmtStamp(mv.ts)}
                    </div>
                  </div>
                );
              })}

              {filteredMoves.length > 20 && (
                <div style={{ padding: "8px 16px", textAlign: "center", fontSize: 11, color: PALETTE.inkFaint, borderTop: `1px solid ${PALETTE.lineSoft}` }}>
                  Showing 20 of {filteredMoves.length} moves
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================== Profile Settings ============================== */
function ProfileSettings({ me, role, account, onSaveName, onSaveAvatar, onSignOut, onBack }) {
  const [name, setName] = useState(me ? me.name : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarIdx, setAvatarIdxState] = useState(() => getAvatarIdx(account));
  useEffect(() => {
    setName(me ? me.name : "");
  }, [me && me.name]); // eslint-disable-line
  const dirty = name.trim() && name.trim() !== (me ? me.name : "");

  const handlePickAvatar = (idx) => {
    setAvatarIdxState(idx);
    if (idx === null) { try { localStorage.removeItem(`studioos_avatar_${account}`); } catch {} }
    else onSaveAvatar(idx);
  };

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setSaved(false);
    try {
      await onSaveName(name.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (e) {
      alert(e.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const rowLabel = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: PALETTE.inkSoft,
  };

  return (
    <div className="fade" style={{ maxWidth: "100%", position: "relative" }}>
      {/* Decorative profile illustration — right side */}
      <img
        src={profileSvg}
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -40,
          right: 100,
          width: 550,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div style={{ maxWidth: 600, position: "relative", zIndex: 1 }}>
      <button
        className="btn"
        onClick={onBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "transparent",
          color: PALETTE.inkSoft,
          fontSize: 12.5,
          fontWeight: 500,
          marginBottom: 18,
          padding: 0,
        }}
      >
        <Icon size={14} d="M15 18l-6-6 6-6" /> Back
      </button>

      <div style={{ marginBottom: 26 }}>
        <div
          className="mono"
          style={{
            fontSize: 10.5,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: PALETTE.inkFaint,
            fontWeight: 600,
          }}
        >
          Account
        </div>
        <h1
          className="serif"
          style={{
            fontSize: 32,
            fontWeight: 500,
            margin: "9px 0 0",
            letterSpacing: "-0.025em",
            lineHeight: 1.04,
          }}
        >
          Profile Settings
        </h1>
        <p
          style={{ color: PALETTE.inkSoft, margin: "9px 0 0", fontSize: 13.5 }}
        >
          Manage how you appear across the studio workspace.
        </p>
      </div>

      {/* identity card */}
      <div
        style={{
          background: PALETTE.paper,
          border: `1px solid ${PALETTE.line}`,
          borderRadius: 12,
          boxShadow: SOFT_SHADOW,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 15,
            padding: "20px 22px",
            borderBottom: `1px solid ${PALETTE.lineSoft}`,
          }}
        >
          {avatarIdx !== null && AVATAR_OPTIONS[avatarIdx]
            ? <img src={AVATAR_OPTIONS[avatarIdx]} alt="" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0, background: PALETTE.bone }} />
            : <span style={{ width: 52, height: 52, borderRadius: "50%", background: PALETTE.ink, color: "#fff", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 19, flexShrink: 0 }} className="mono">{ROLES[role].tag}</span>
          }
          <div style={{ minWidth: 0 }}>
            <div
              className="serif"
              style={{
                fontSize: 19,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {name || (me ? me.name : "")}
            </div>
            <div
              className="mono"
              style={{ fontSize: 11.5, color: PALETTE.inkFaint, marginTop: 2 }}
            >
              {account}
            </div>
          </div>
          <span
            className="mono"
            style={{
              marginLeft: "auto",
              flexShrink: 0,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "4px 11px",
              borderRadius: 20,
              background: PALETTE.claySoft,
              color: PALETTE.clay,
            }}
          >
            {ROLES[role].label}
          </span>
        </div>

        <div
          style={{
            padding: "20px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div>
            <div style={{ ...rowLabel, marginBottom: 7 }}>Display name</div>
            <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                }}
                placeholder="Your name"
                style={{ ...inp, flex: 1 }}
              />
              <button
                className="btn btn-primary"
                onClick={save}
                disabled={!dirty || saving}
                style={{
                  padding: "9px 18px",
                  borderRadius: 8,
                  background: PALETTE.ink,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 500,
                  opacity: dirty && !saving ? 1 : 0.45,
                  cursor: dirty && !saving ? "pointer" : "default",
                  whiteSpace: "nowrap",
                }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: saved ? PALETTE.sageText : PALETTE.inkFaint,
                marginTop: 8,
              }}
            >
              {saved
                ? "✓ Saved — visible to your team."
                : "Shown on your cards, comments and the activity log."}
            </div>
          </div>

          {/* Avatar picker */}
          <div>
            <div style={{ ...rowLabel, marginBottom: 10 }}>Avatar</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {AVATAR_OPTIONS.map((src, i) => (
                <button
                  key={i}
                  className="btn"
                  onClick={() => handlePickAvatar(i)}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    padding: 0,
                    border: avatarIdx === i ? `3px solid ${PALETTE.ink}` : `2px solid ${PALETTE.line}`,
                    background: PALETTE.bg,
                    overflow: "hidden",
                    flexShrink: 0,
                    boxShadow: avatarIdx === i ? `0 0 0 2px ${PALETTE.paper}, 0 0 0 4px ${PALETTE.ink}` : "none",
                    transition: "box-shadow 0.15s, border-color 0.15s",
                  }}
                >
                  <img src={src} alt={`Avatar ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
              ))}
              {avatarIdx !== null && (
                <button
                  className="btn"
                  onClick={() => handlePickAvatar(null)}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    border: `2px dashed ${PALETTE.line}`,
                    background: "transparent",
                    fontSize: 10,
                    fontWeight: 600,
                    color: PALETTE.inkFaint,
                    letterSpacing: "0.04em",
                    flexShrink: 0,
                  }}
                >
                  None
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px" }}>
              <div style={{ ...rowLabel, marginBottom: 6 }}>Email · Google</div>
              <div
                className="mono"
                style={{ fontSize: 13, color: PALETTE.ink }}
              >
                {account}
              </div>
              <div
                style={{ fontSize: 11, color: PALETTE.inkFaint, marginTop: 3 }}
              >
                Managed by your Google account.
              </div>
            </div>
            <div style={{ flex: "1 1 160px" }}>
              <div style={{ ...rowLabel, marginBottom: 6 }}>
                Division / Access
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: PALETTE.ink,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: PALETTE.clay,
                  }}
                />
                {ROLES[role].label}
              </div>
              <div
                style={{ fontSize: 11, color: PALETTE.inkFaint, marginTop: 3 }}
              >
                {isMasterLike(role)
                  ? "All divisions."
                  : "Set by an admin (Master)."}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* session */}
      <div
        style={{
          marginTop: 18,
          background: PALETTE.paper,
          border: `1px solid ${PALETTE.line}`,
          borderRadius: 12,
          boxShadow: SOFT_SHADOW,
          padding: "16px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: PALETTE.ink }}>
            Sign out
          </div>
          <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginTop: 2 }}>
            End your session on this device.
          </div>
        </div>
        <button
          className="btn"
          onClick={onSignOut}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            borderRadius: 8,
            background: "transparent",
            border: `1px solid ${PALETTE.terra}55`,
            color: PALETTE.terra,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <LogoutIcon /> Log out
        </button>
      </div>
      </div>{/* end maxWidth 600 wrapper */}
    </div>
  );
}

/* ============================== Project Detail ============================== */
function DetailSection({ icon: I, title, action, children, top }) {
  return (
    <section style={{ marginTop: top ? 0 : 26 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {I && <I size={13} strokeWidth={1.8} color={PALETTE.inkFaint} />}
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: PALETTE.inkSoft,
            }}
          >
            {title}
          </span>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function DBadge({ children, dot, icon: I }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11.5,
        color: PALETTE.inkSoft,
        background: PALETTE.bg,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: 7,
        padding: "4px 9px",
        whiteSpace: "nowrap",
        maxWidth: 220,
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: dot,
            flexShrink: 0,
          }}
        />
      )}
      {I && <I size={12} strokeWidth={1.8} color={PALETTE.inkFaint} />}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
        {children}
      </span>
    </span>
  );
}

const LINK_ICON = { doc: FileText, sheet: FileSpreadsheet, link: Link2 };

/* ---- Custom label editor (used inside ProjectDetail edit mode) ---- */
function CustomLabelEditor({ labels, onChange }) {
  const [text, setText] = useState("");
  const [color, setColor] = useState(CUSTOM_LABEL_COLORS[0]);

  const customLabels = (labels || [])
    .filter((k) => k.startsWith("cx:"))
    .map((k) => ({ key: k, ...parseCustomLabel(k) }))
    .filter((x) => x.text);

  const add = () => {
    const t = text.trim();
    if (!t) return;
    const key = `cx:${t}:${color}`;
    if (!labels.includes(key)) onChange([...labels, key]);
    setText("");
  };

  const remove = (key) => onChange((labels || []).filter((k) => k !== key));

  return (
    <div style={{ marginTop: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 11,
        }}
      >
        <Tag size={13} strokeWidth={2} color={PALETTE.inkSoft} />
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: PALETTE.inkSoft,
          }}
        >
          Label Kustom
        </span>
      </div>
      {customLabels.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 11,
          }}
        >
          {customLabels.map(({ key, text: t, bg }) => (
            <span
              key={key}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: contrastColor(bg),
                background: bg,
                borderRadius: 5,
                padding: "3px 7px 3px 9px",
              }}
            >
              {t}
              <button
                onClick={() => remove(key)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0 1px",
                  lineHeight: 1,
                  color: contrastColor(bg),
                  opacity: 0.65,
                  fontSize: 11,
                }}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Nama label…"
          style={{
            padding: "8px 11px",
            borderRadius: 8,
            border: `1px solid ${PALETTE.line}`,
            background: PALETTE.bg,
            fontSize: 13,
            color: PALETTE.ink,
            outline: "none",
            flex: "1 1 130px",
            minWidth: 110,
          }}
        />
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {CUSTOM_LABEL_COLORS.map((hex) => (
            <button
              key={hex}
              className="btn"
              onClick={() => setColor(hex)}
              title={"#" + hex}
              style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                background: "#" + hex,
                border:
                  color === hex
                    ? `2.5px solid ${PALETTE.ink}`
                    : "2.5px solid transparent",
                padding: 0,
                flexShrink: 0,
              }}
            />
          ))}
        </div>
        <button
          className="btn btn-primary"
          onClick={add}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            background: PALETTE.ink,
            color: "#fff",
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          + Tambah
        </button>
      </div>
    </div>
  );
}

function ProjectDetail({
  project: p,
  pipe,
  role,
  me,
  account,
  members,
  onClose,
  onEdit,
  onMoveStage,
  onSetAssignees,
  onManageMembers,
  onChanged,
}) {
  const { w } = useViewport();
  const stack = w <= 820; // stack the two panes vertically on tablets/phones
  const st = findStage(pipe, p.pipelines[pipe].stage);
  const c = kindOf(st.kind);
  const d = daysUntil(p.due);
  const writable = canWrite(role, pipe);
  const myName = (me && me.name) || account || ROLES[role].label;

  /* documentation fields — real (Supabase) with graceful fallback to mock */
  const [doc, setDoc] = useState(() => ({
    code:
      (p.code && p.code.trim()) ||
      "TRC-" +
        String(p.id || "0000")
          .replace(/[^a-z0-9]/gi, "")
          .slice(-4)
          .toUpperCase()
          .padStart(4, "0"),
    existing:
      (p.existing && p.existing.trim()) ||
      (p.notes && p.notes.trim()) ||
      DETAIL_MOCK.existing,
    scope: p.scope && p.scope.length ? p.scope : DETAIL_MOCK.scope,
    timeline:
      p.timeline &&
      (p.timeline.note || typeof p.timeline.flexible === "boolean")
        ? p.timeline
        : DETAIL_MOCK.timeline,
  }));
  const [links, setLinks] = useState(DETAIL_MOCK.links);
  const [files, setFiles] = useState(DETAIL_MOCK.files);
  const [labels, setLabels] = useState(p.labels || []);
  const [comments, setComments] = useState([]);
  const [checklist, setChecklist] = useState([]); // [{ id?, text, done }]
  const [newItem, setNewItem] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [mention, setMention] = useState(null); // { query } while typing @… in the comment box
  const draftRef = useRef(null);
  const canLabel =
    p.pipelines.PRODUCTION.active && canWrite(role, "PRODUCTION");
  const canDesignLabel = p.pipelines.DESIGN.active && canWrite(role, "DESIGN");
  const canMasterLabel = canWrite(role, "MASTER");

  /* edit mode (documentation + attachments) */
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [linkForm, setLinkForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [stagePick, setStagePick] = useState(false); // quick "Change stage" popover
  const fileRef = useRef(null);

  const startEdit = () => {
    setForm({
      code: doc.code,
      existing: doc.existing,
      scope: [...doc.scope],
      timeline: {
        status: timelineStatus(doc.timeline),
        flexible: !!(doc.timeline && doc.timeline.flexible),
        note: (doc.timeline && doc.timeline.note) || "",
      },
      labels: [...labels],
    });
    setLinkForm(
      links.map((l) => ({
        label: l.label || "",
        url: l.url || "",
        kind: l.kind || "link",
      })),
    );
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setForm(null);
    setLinkForm(null);
  };
  const setF = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const subFor = (k) =>
    k === "doc" ? "Google Docs" : k === "sheet" ? "Google Sheets" : "Link";
  const saveEdit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const scope = form.scope.map((s) => s.trim()).filter(Boolean);
      const payload = {
        code: form.code.trim(),
        existing: form.existing,
        scope,
        timeline: form.timeline,
      };
      const cleanLinks = (linkForm || [])
        .filter((l) => (l.label || l.url || "").trim())
        .map((l) => ({
          label: l.label.trim() || l.url,
          url: l.url.trim(),
          kind: l.kind,
          sub: subFor(l.kind),
        }));
      const nextLabels = Array.isArray(form.labels) ? form.labels : labels;
      await api.updateProjectDetail(p.id, payload);
      await api.setProjectLinks(p.id, cleanLinks);
      if (canMasterLabel || canLabel || canDesignLabel)
        await api.setProjectLabels(p.id, nextLabels);
      /* reflect saved values locally so the modal updates immediately */
      setDoc({
        code: payload.code,
        existing: payload.existing,
        scope,
        timeline: payload.timeline,
      });
      setLinks(cleanLinks);
      setLabels(nextLabels);
      cancelEdit();
      if (onChanged) onChanged(); // refresh board cards (labels show there)
    } catch (e) {
      alert(e.message || "Could not save. Has migration_detail.sql been run?");
    } finally {
      setBusy(false);
    }
  };

  const onUpload = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (e.target) e.target.value = "";
    if (!f) return;
    setBusy(true);
    try {
      const row = await api.uploadProjectFile(p.id, f);
      setFiles((fs) => [...fs, row]);
    } catch (err) {
      alert(
        err.message ||
          "Upload failed — is the storage bucket set up (migration_detail.sql)?",
      );
    } finally {
      setBusy(false);
    }
  };
  const removeFile = async (f) => {
    if (!f.id) {
      setFiles((fs) => fs.filter((x) => x !== f));
      return;
    }
    setBusy(true);
    try {
      await api.removeProjectFile(f.id);
      setFiles((fs) => fs.filter((x) => x.id !== f.id));
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  /* load attachments + comments from Supabase (fallback to mock attachments) */
  useEffect(() => {
    let alive = true;
    api
      .fetchProjectExtras(p.id)
      .then((ex) => {
        if (!alive) return;
        if (ex.links.length) setLinks(ex.links);
        if (ex.files.length) setFiles(ex.files);
        setComments(ex.comments);
        setChecklist(ex.checklist || []);
      })
      .catch(() => {
        /* tables not migrated yet → keep mock attachments, no comments */
      });
    return () => {
      alive = false;
    };
  }, [p.id]);

  const images = files.filter((f) => f.kind === "image");
  const pdfs = files.filter((f) => f.kind !== "image");
  const memberships = PIPE_ORDER.filter((k) => p.pipelines[k].active).map(
    (k) => ({
      k,
      label: PIPELINES[k].short,
      stage: findStage(k, p.pipelines[k].stage).label,
      color: kindOf(findStage(k, p.pipelines[k].stage).kind).color,
    }),
  );

  const reloadComments = () =>
    api
      .fetchProjectExtras(p.id)
      .then((ex) => setComments(ex.comments))
      .catch(() => {});

  /* ---- assignees (multiple per project) ---- */
  const assignableMembers = (members || []).filter((m) => m.active);
  const isAssigned = (m) =>
    (p.assignees || []).some((e) => e.toLowerCase() === m.email.toLowerCase());
  const assignedMembers = assignableMembers.filter(isAssigned);
  const toggleAssignee = (m) => {
    if (!onSetAssignees) return;
    const cur = p.assignees || [];
    const next = isAssigned(m)
      ? cur.filter((e) => e.toLowerCase() !== m.email.toLowerCase())
      : [...cur, m.email];
    onSetAssignees(next);
  };

  /* ---- checklist (replace-all persistence, mirrors links) ---- */
  const clDone = checklist.filter((x) => x.done).length;
  const clPct = checklist.length
    ? Math.round((clDone / checklist.length) * 100)
    : 0;
  const persistChecklist = (items) => {
    setChecklist(items);
    api
      .setChecklist(
        p.id,
        items.map(({ text, done }) => ({ text, done })),
      )
      .then(() => onChanged && onChanged()) // refresh board-card counts
      .catch((e) =>
        alert(
          e.message ||
            "Could not save checklist. Has migration_features.sql been run?",
        ),
      );
  };
  const addChecklistItem = () => {
    const t = newItem.trim();
    if (!t) return;
    persistChecklist([...checklist, { text: t, done: false }]);
    setNewItem("");
  };
  const toggleChecklistItem = (i) =>
    persistChecklist(
      checklist.map((x, j) => (j === i ? { ...x, done: !x.done } : x)),
    );
  const removeChecklistItem = (i) =>
    persistChecklist(checklist.filter((_, j) => j !== i));

  /* ---- @mention autocomplete inside the comment box ---- */
  const onDraftChange = (e) => {
    const val = e.target.value;
    setDraft(val);
    const upto = val.slice(0, e.target.selectionStart);
    const m = upto.match(/(?:^|\s)@(\w*)$/);
    setMention(m ? { query: m[1].toLowerCase() } : null);
  };
  const mentionMatches = mention
    ? assignableMembers
        .filter((mm) =>
          (mm.name || mm.email).toLowerCase().includes(mention.query),
        )
        .slice(0, 5)
    : [];
  const pickMention = (mm) => {
    const tag = (mm.name || mm.email).split(/\s+/)[0]; // single token keeps @Name parseable
    setDraft((d) => d.replace(/@(\w*)$/, "@" + tag + " "));
    setMention(null);
    if (draftRef.current) draftRef.current.focus();
  };

  const addComment = async () => {
    const t = draft.trim();
    if (!t || sending) return;
    const optimistic = {
      id: "tmp-" + Date.now(),
      email: account,
      author: myName,
      role,
      body: t,
      ts: Date.now(),
    };
    setComments((cs) => [...cs, optimistic]);
    setDraft("");
    setSending(true);
    try {
      await api.addComment(p.id, t);
      await reloadComments(); // swap optimistic for the real row (gets a real id)
    } catch (e) {
      setComments((cs) => cs.filter((x) => x.id !== optimistic.id));
      setDraft(t);
      alert(e.message || "Could not post comment.");
    } finally {
      setSending(false);
    }
  };

  const editComment = async (id, body) => {
    const t = (body || "").trim();
    if (!t) return;
    const prev = comments;
    setComments((cs) => cs.map((c) => (c.id === id ? { ...c, body: t } : c)));
    try {
      await api.editComment(id, t);
    } catch (e) {
      setComments(prev);
      alert(e.message || "Could not edit comment.");
    }
  };
  const deleteComment = async (id) => {
    const prev = comments;
    setComments((cs) => cs.filter((c) => c.id !== id));
    try {
      await api.deleteComment(id);
    } catch (e) {
      setComments(prev);
      alert(e.message || "Could not delete comment.");
    }
  };
  const isMine = (cm) =>
    cm.email && account && cm.email.toLowerCase() === account.toLowerCase();

  const feed = [
    ...comments.map((cm) => ({
      kind: "comment",
      id: cm.id,
      email: cm.email,
      mine: isMine(cm),
      author: cm.author,
      role: cm.role,
      text: cm.body,
      ts: cm.ts,
    })),
    ...(p.log || []).map((l) => ({
      kind: "system",
      author: l.actor || (ROLES[l.role] || ROLES.MASTER).label,
      role: l.role,
      text: l.text,
      ts: l.ts,
    })),
  ].sort((a, b) => b.ts - a.ts);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []); // eslint-disable-line

  return (
    <div onClick={onClose} style={overlay}>
      <div
        className="ovf"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: PALETTE.paper,
          borderRadius: 16,
          width: "min(1040px, 96vw)",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: stack ? "column" : "row",
          overflow: stack ? "auto" : "hidden",
          border: `1px solid ${PALETTE.line}`,
          boxShadow: "0 40px 90px -28px rgba(28,26,23,.42)",
        }}
      >
        {/* ---------- LEFT · documentation (≈65%) ---------- */}
        <div
          style={{
            flex: stack ? "0 0 auto" : "1.85 1 0",
            minWidth: 0,
            overflowY: stack ? "visible" : "auto",
            padding: stack ? "22px 18px 26px" : "26px 32px 36px",
          }}
        >
          <div style={{ marginBottom: 4 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              {editing ? (
                <input
                  value={form.code}
                  onChange={(e) => setF("code", e.target.value)}
                  placeholder="Project code"
                  className="mono"
                  style={{
                    ...inp,
                    width: 180,
                    padding: "5px 9px",
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                />
              ) : (
                <div
                  className="mono"
                  style={{
                    fontSize: 10.5,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: PALETTE.inkFaint,
                    fontWeight: 600,
                  }}
                >
                  {doc.code}
                </div>
              )}
              {writable &&
                (editing ? (
                  <div style={{ display: "flex", gap: 7 }}>
                    <button
                      className="btn"
                      onClick={cancelEdit}
                      disabled={busy}
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: PALETTE.inkSoft,
                        padding: "6px 12px",
                        borderRadius: 7,
                        border: `1px solid ${PALETTE.line}`,
                        background: "transparent",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={saveEdit}
                      disabled={busy}
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#fff",
                        padding: "6px 14px",
                        borderRadius: 7,
                        background: PALETTE.ink,
                      }}
                    >
                      {busy ? "Saving…" : "Save"}
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn"
                    onClick={startEdit}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 500,
                      color: PALETTE.ink,
                      padding: "6px 12px",
                      borderRadius: 7,
                      border: `1px solid ${PALETTE.line}`,
                      background: PALETTE.paper,
                    }}
                  >
                    <Pencil size={13} strokeWidth={1.8} /> Edit
                  </button>
                ))}
            </div>
            <h2
              className="serif"
              style={{
                fontSize: 28,
                fontWeight: 500,
                margin: "10px 0 0",
                letterSpacing: "-0.025em",
                lineHeight: 1.08,
              }}
            >
              {p.name}
            </h2>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 7,
                marginTop: 14,
              }}
            >
              {p.client && <DBadge>{p.client}</DBadge>}
              {p.type && <DBadge>{p.type}</DBadge>}
              <DBadge dot={c.color}>{st.label}</DBadge>
              {p.location && <DBadge icon={MapPin}>{p.location}</DBadge>}
              {p.mandors && p.mandors.length > 0 && <DBadge>Mandor: {p.mandors.join(", ")}</DBadge>}
              {p.supervisor && <DBadge>Supervisor: {p.supervisor}</DBadge>}
            </div>
            {(() => {
              const svcKey = labels.find((k) => k.startsWith("svc:"));
              const svc = svcKey ? SERVICE_TYPE_MAP[svcKey] : null;
              const chips = labels.filter((k) => {
                if (k.startsWith("svc:")) return false;
                return role === "MASTER"
                  ? true
                  : role === "PRODUCTION"
                    ? !!PROD_LABEL_MAP[k]
                    : role === "DESIGN"
                      ? !!DESIGN_LABEL_MAP[k]
                      : true;
              });
              return (
                <>
                  {svc && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 10.5,
                        fontWeight: 700,
                        letterSpacing: "0.07em",
                        textTransform: "uppercase",
                        color: svc.textColor,
                        background: svc.stripe,
                        borderRadius: 6,
                        padding: "4px 10px",
                        marginTop: 10,
                      }}
                    >
                      {svc.label}
                    </span>
                  )}
                  {chips.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginTop: 10,
                      }}
                    >
                      {chips.map((k) => (
                        <LabelChip key={k} k={k} />
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Master Only toggle — MASTER can restrict visibility from Sales */}
          {role === "MASTER" && (
            <div style={{ padding: "10px 0", borderBottom: `1px solid ${PALETTE.sand}` }}>
              <button
                className="btn"
                title="Sembunyikan project ini dari Sales"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${labels.includes(MASTER_ONLY_LABEL) ? PALETTE.clay : PALETTE.line}`,
                  background: labels.includes(MASTER_ONLY_LABEL) ? `${PALETTE.clay}15` : PALETTE.sand,
                  cursor: "pointer",
                  transition: "all 0.18s",
                  textAlign: "left",
                }}
                onClick={async () => {
                  const on = labels.includes(MASTER_ONLY_LABEL);
                  const nextLabels = on
                    ? labels.filter((x) => x !== MASTER_ONLY_LABEL)
                    : [...labels, MASTER_ONLY_LABEL];
                  setLabels(nextLabels);
                  await api.setProjectLabels(p.id, nextLabels);
                  onChanged && onChanged();
                }}
              >
                {(() => { const on = labels.includes(MASTER_ONLY_LABEL); return (<>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: on ? PALETTE.clay : PALETTE.ink }}>Master Only</div>
                  <div style={{ fontSize: 11, color: PALETTE.inkSoft, marginTop: 2 }}>Project ini tidak akan terlihat oleh Sales</div>
                </div>
                <div style={{ width: 40, height: 22, borderRadius: 11, background: on ? PALETTE.clay : PALETTE.line, transition: "background 0.18s", display: "flex", alignItems: "center", padding: "0 3px", flexShrink: 0 }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transform: on ? "translateX(18px)" : "translateX(0)", transition: "transform 0.18s" }} />
                </div>
                </>); })()}
              </button>
            </div>
          )}

          {/* Master lead labels — editable by Master */}
          {editing && canMasterLabel && (
            <DetailSection icon={Tag} title="Lead Status">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {MASTER_LABELS.map((l) => {
                  const on = form.labels.includes(l.key);
                  return (
                    <button
                      key={l.key}
                      className="btn"
                      onClick={() =>
                        setF(
                          "labels",
                          on
                            ? form.labels.filter((x) => x !== l.key)
                            : [...form.labels, l.key],
                        )
                      }
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        borderRadius: 5,
                        padding: "4px 10px",
                        whiteSpace: "nowrap",
                        color: on ? l.text : PALETTE.inkSoft,
                        background: on ? l.bg : "transparent",
                        border: on ? "none" : `1px dashed ${PALETTE.line}`,
                        opacity: on ? 1 : 0.85,
                      }}
                    >
                      {l.label}
                    </button>
                  );
                })}
              </div>
              <div
                className="mono"
                style={{ fontSize: 10, color: PALETTE.inkFaint, marginTop: 9 }}
              >
                Tap a label to add/remove. Shown on the Master board card.
              </div>
            </DetailSection>
          )}

          {/* Production status labels — editable by Production / Master */}
          {editing && canLabel && (
            <DetailSection icon={Tag} title="Production Labels">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {PROD_LABELS.map((l) => {
                  const on = form.labels.includes(l.key);
                  return (
                    <button
                      key={l.key}
                      className="btn"
                      onClick={() =>
                        setF(
                          "labels",
                          on
                            ? form.labels.filter((x) => x !== l.key)
                            : [...form.labels, l.key],
                        )
                      }
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        borderRadius: 5,
                        padding: "4px 10px",
                        whiteSpace: "nowrap",
                        color: on ? l.text : PALETTE.inkSoft,
                        background: on ? l.bg : "transparent",
                        border: on ? "none" : `1px dashed ${PALETTE.line}`,
                        opacity: on ? 1 : 0.85,
                      }}
                    >
                      {l.label}
                    </button>
                  );
                })}
              </div>
              <div
                className="mono"
                style={{ fontSize: 10, color: PALETTE.inkFaint, marginTop: 9 }}
              >
                Tap a label to add/remove. Shown on the Production board card.
              </div>
            </DetailSection>
          )}

          {/* Design status labels — editable by Design / Master */}
          {editing && canDesignLabel && (
            <DetailSection icon={Tag} title="Design Labels">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {DESIGN_LABELS.map((l) => {
                  const on = form.labels.includes(l.key);
                  return (
                    <button
                      key={l.key}
                      className="btn"
                      onClick={() =>
                        setF(
                          "labels",
                          on
                            ? form.labels.filter((x) => x !== l.key)
                            : [...form.labels, l.key],
                        )
                      }
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        borderRadius: 5,
                        padding: "4px 10px",
                        whiteSpace: "nowrap",
                        color: on ? l.text : PALETTE.inkSoft,
                        background: on ? l.bg : "transparent",
                        border: on ? "none" : `1px dashed ${PALETTE.line}`,
                        opacity: on ? 1 : 0.85,
                      }}
                    >
                      {l.label}
                    </button>
                  );
                })}
              </div>
              <div
                className="mono"
                style={{ fontSize: 10, color: PALETTE.inkFaint, marginTop: 9 }}
              >
                Tap a label to add/remove. Shown on the Design &amp; Master
                board cards.
              </div>
            </DetailSection>
          )}

          {/* Service-type stripe — editable by anyone who can write */}
          {editing && (
            <DetailSection icon={Tag} title="Tipe Layanan (Stripe Warna Kartu)">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {SERVICE_TYPES.map((s) => {
                  const on = form.labels.includes(s.key);
                  return (
                    <button
                      key={s.key}
                      className="btn"
                      onClick={() => {
                        const without = form.labels.filter(
                          (x) => !x.startsWith("svc:"),
                        );
                        setF("labels", on ? without : [...without, s.key]);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        borderRadius: 8,
                        padding: "7px 13px",
                        border: on ? "none" : `1.5px dashed ${PALETTE.line}`,
                        background: on ? s.stripe : "transparent",
                        color: on ? s.textColor : PALETTE.inkSoft,
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          background: on ? "rgba(255,255,255,0.35)" : s.stripe,
                          flexShrink: 0,
                        }}
                      />
                      {s.label}
                    </button>
                  );
                })}
                {form.labels.some((x) => x.startsWith("svc:")) && (
                  <button
                    className="btn"
                    onClick={() =>
                      setF(
                        "labels",
                        form.labels.filter((x) => !x.startsWith("svc:")),
                      )
                    }
                    style={{
                      fontSize: 11,
                      color: PALETTE.inkFaint,
                      padding: "7px 12px",
                      borderRadius: 8,
                      border: `1px dashed ${PALETTE.line}`,
                      background: "transparent",
                    }}
                  >
                    Hapus stripe
                  </button>
                )}
              </div>
            </DetailSection>
          )}

          {/* Custom labels — anyone who can write */}
          {editing && (
            <CustomLabelEditor
              labels={form.labels}
              onChange={(next) => setF("labels", next)}
            />
          )}

          <DetailSection icon={ClipboardList} title="Site / Existing Condition">
            {editing ? (
              <textarea
                value={form.existing}
                onChange={(e) => setF("existing", e.target.value)}
                rows={5}
                placeholder="Describe the existing site conditions…"
                style={{
                  ...inp,
                  resize: "vertical",
                  lineHeight: 1.6,
                  fontSize: 13.5,
                }}
              />
            ) : (
              <p
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.65,
                  color: PALETTE.ink,
                  margin: 0,
                  background: PALETTE.bg,
                  border: `1px solid ${PALETTE.line}`,
                  borderRadius: 10,
                  padding: "14px 16px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {doc.existing}
              </p>
            )}
          </DetailSection>

          <DetailSection icon={ListChecks} title="Scope of Work">
            {editing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {form.scope.map((s, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: PALETTE.clay,
                        flexShrink: 0,
                      }}
                    />
                    <input
                      value={s}
                      autoFocus={s === "" && i === form.scope.length - 1}
                      onChange={(e) =>
                        setF(
                          "scope",
                          form.scope.map((x, j) =>
                            j === i ? e.target.value : x,
                          ),
                        )
                      }
                      placeholder={`Scope item ${i + 1}…`}
                      style={{
                        ...inp,
                        flex: 1,
                        padding: "8px 11px",
                        fontSize: 13,
                      }}
                    />
                    <IconBtn
                      label="Remove"
                      symbol="✕"
                      danger
                      onClick={() =>
                        setF(
                          "scope",
                          form.scope.filter((_, j) => j !== i),
                        )
                      }
                    />
                  </div>
                ))}
                <button
                  className="btn"
                  onClick={() => setF("scope", [...form.scope, ""])}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    padding: "10px 12px",
                    borderRadius: 9,
                    border: `1.5px dashed ${PALETTE.clay}66`,
                    background: PALETTE.claySoft,
                    color: PALETTE.clay,
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  <ListChecks size={14} strokeWidth={2} /> Add scope item
                </button>
              </div>
            ) : (
              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                }}
              >
                {doc.scope.map((s, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      fontSize: 13.5,
                      color: PALETTE.ink,
                      lineHeight: 1.5,
                    }}
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: PALETTE.clay,
                        marginTop: 7,
                        flexShrink: 0,
                      }}
                    />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>

          <DetailSection
            icon={ListChecks}
            title="Checklist"
            action={
              checklist.length > 0 ? (
                <span
                  className="mono tnum"
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: clPct === 100 ? PALETTE.sageText : PALETTE.inkFaint,
                  }}
                >
                  {clDone}/{checklist.length} · {clPct}%
                </span>
              ) : null
            }
          >
            {checklist.length > 0 && (
              <div
                style={{
                  height: 6,
                  background: PALETTE.bone,
                  borderRadius: 3,
                  overflow: "hidden",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: `${clPct}%`,
                    height: "100%",
                    background: clPct === 100 ? PALETTE.sage : PALETTE.clay,
                    borderRadius: 3,
                    transition: "width .4s cubic-bezier(.2,.7,.2,1)",
                  }}
                />
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {checklist.map((item, i) => (
                <div
                  key={i}
                  className="drow"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 6px",
                    borderRadius: 7,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    disabled={!writable}
                    onChange={() => toggleChecklistItem(i)}
                    style={{
                      accentColor: PALETTE.clay,
                      width: 16,
                      height: 16,
                      flexShrink: 0,
                      cursor: writable ? "pointer" : "default",
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 13.5,
                      lineHeight: 1.45,
                      color: item.done ? PALETTE.inkFaint : PALETTE.ink,
                      textDecoration: item.done ? "line-through" : "none",
                    }}
                  >
                    {item.text}
                  </span>
                  {writable && (
                    <IconBtn
                      label="Remove"
                      symbol="✕"
                      danger
                      onClick={() => removeChecklistItem(i)}
                    />
                  )}
                </div>
              ))}
              {checklist.length === 0 && (
                <p
                  style={{
                    fontSize: 12.5,
                    color: PALETTE.inkFaint,
                    margin: "2px 0 8px",
                  }}
                >
                  No checklist items yet.
                </p>
              )}
            </div>
            {writable && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addChecklistItem();
                    }
                  }}
                  placeholder="Add an item…"
                  style={{ ...inp, flex: 1, padding: "9px 11px", fontSize: 13 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={addChecklistItem}
                  disabled={!newItem.trim()}
                  style={{
                    padding: "0 16px",
                    borderRadius: 9,
                    background: PALETTE.ink,
                    color: "#fff",
                    fontSize: 12.5,
                    fontWeight: 600,
                    opacity: newItem.trim() ? 1 : 0.4,
                  }}
                >
                  Add
                </button>
              </div>
            )}
          </DetailSection>

          <DetailSection icon={CalendarClock} title="Timeline & Milestones">
            {editing ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 11 }}
              >
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    fontSize: 13,
                    color: PALETTE.ink,
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: PALETTE.inkFaint,
                      fontWeight: 600,
                    }}
                  >
                    Timeline status
                  </span>
                  <select
                    value={timelineStatus(form.timeline)}
                    onChange={(e) =>
                      setF("timeline", {
                        ...form.timeline,
                        status: e.target.value,
                        flexible: e.target.value === "flexible",
                      })
                    }
                    style={{ ...inp, maxWidth: 220 }}
                  >
                    {TIMELINE_STATUSES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                <textarea
                  value={form.timeline.note}
                  onChange={(e) =>
                    setF("timeline", { ...form.timeline, note: e.target.value })
                  }
                  rows={2}
                  placeholder="Milestone notes, deadlines, what's rigid vs flexible…"
                  style={{
                    ...inp,
                    resize: "vertical",
                    lineHeight: 1.55,
                    fontSize: 13,
                  }}
                />
                <span
                  className="mono"
                  style={{ fontSize: 10.5, color: PALETTE.inkFaint }}
                >
                  Due date is set via “Edit details”.
                </span>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: doc.timeline?.note ? 11 : 0,
                  }}
                >
                  <span
                    className="mono tnum"
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: PALETTE.ink,
                    }}
                  >
                    {fmtDate(p.due)}
                  </span>
                  {p.due && d !== null && st.id !== "done" && (
                    <span
                      className="mono tnum"
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color:
                          d < 0
                            ? KINDS.attention.color
                            : d <= 14
                              ? PALETTE.clay
                              : PALETTE.inkSoft,
                      }}
                    >
                      {d < 0
                        ? `${Math.abs(d)}d overdue`
                        : d === 0
                          ? "due today"
                          : `${d}d remaining`}
                    </span>
                  )}
                  {(() => {
                    const tm = timelineMeta(timelineStatus(doc.timeline));
                    return (
                      <span
                        style={{
                          marginLeft: "auto",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 10.5,
                          fontWeight: 600,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          padding: "4px 10px",
                          borderRadius: 20,
                          color: tm.text,
                          background: tm.bg,
                        }}
                        className="mono"
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: tm.dot,
                          }}
                        />
                        {tm.label}
                      </span>
                    );
                  })()}
                </div>
                {doc.timeline?.note && (
                  <p
                    style={{
                      fontSize: 12.5,
                      color: PALETTE.inkSoft,
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    {doc.timeline.note}
                  </p>
                )}
              </>
            )}
          </DetailSection>

          <DetailSection icon={Layers} title="Attachments">
            <input
              type="file"
              ref={fileRef}
              onChange={onUpload}
              accept="image/*,application/pdf"
              style={{ display: "none" }}
            />

            {/* links */}
            {editing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(linkForm || []).map((lk, i) => (
                  <div
                    key={i}
                    style={{
                      border: `1px solid ${PALETTE.line}`,
                      borderRadius: 9,
                      padding: 10,
                      background: PALETTE.paper,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 7,
                      }}
                    >
                      <select
                        value={lk.kind}
                        onChange={(e) =>
                          setLinkForm(
                            linkForm.map((x, j) =>
                              j === i ? { ...x, kind: e.target.value } : x,
                            ),
                          )
                        }
                        style={{
                          ...inp,
                          width: 130,
                          padding: "6px 9px",
                          fontSize: 12,
                        }}
                      >
                        <option value="doc">Google Docs</option>
                        <option value="sheet">Google Sheets</option>
                        <option value="link">Link</option>
                      </select>
                      <span style={{ marginLeft: "auto" }}>
                        <IconBtn
                          label="Remove link"
                          symbol="✕"
                          danger
                          onClick={() =>
                            setLinkForm(linkForm.filter((_, j) => j !== i))
                          }
                        />
                      </span>
                    </div>
                    <input
                      value={lk.label}
                      onChange={(e) =>
                        setLinkForm(
                          linkForm.map((x, j) =>
                            j === i ? { ...x, label: e.target.value } : x,
                          ),
                        )
                      }
                      placeholder="Label"
                      style={{
                        ...inp,
                        padding: "7px 11px",
                        fontSize: 13,
                        marginBottom: 7,
                      }}
                    />
                    <input
                      value={lk.url}
                      onChange={(e) =>
                        setLinkForm(
                          linkForm.map((x, j) =>
                            j === i ? { ...x, url: e.target.value } : x,
                          ),
                        )
                      }
                      placeholder="https://…"
                      className="mono"
                      style={{ ...inp, padding: "7px 11px", fontSize: 12 }}
                    />
                  </div>
                ))}
                <button
                  className="btn"
                  onClick={() =>
                    setLinkForm([
                      ...(linkForm || []),
                      { label: "", url: "", kind: "link" },
                    ])
                  }
                  style={{
                    alignSelf: "flex-start",
                    fontSize: 12,
                    fontWeight: 500,
                    color: PALETTE.clay,
                    background: "transparent",
                    border: `1px dashed ${PALETTE.line}`,
                    borderRadius: 8,
                    padding: "8px 12px",
                  }}
                >
                  + Add link
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {links.length === 0 && (
                  <div style={{ fontSize: 12, color: PALETTE.inkFaint }}>
                    No links yet.
                  </div>
                )}
                {links.map((lk, i) => {
                  const LI = LINK_ICON[lk.kind] || Link2;
                  return (
                    <a
                      key={i}
                      href={lk.url || "#"}
                      target={lk.url ? "_blank" : undefined}
                      rel="noreferrer"
                      onClick={(e) => {
                        if (!lk.url) e.preventDefault();
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        borderRadius: 9,
                        border: `1px solid ${PALETTE.line}`,
                        background: PALETTE.paper,
                        textDecoration: "none",
                        cursor: "pointer",
                      }}
                      className="drow"
                    >
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 7,
                          background: PALETTE.bg,
                          border: `1px solid ${PALETTE.line}`,
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                          color: PALETTE.clay,
                        }}
                      >
                        <LI size={15} strokeWidth={1.8} />
                      </span>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            display: "block",
                            fontSize: 13,
                            fontWeight: 500,
                            color: PALETTE.ink,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {lk.label}
                        </span>
                        <span
                          className="mono"
                          style={{
                            display: "block",
                            fontSize: 10.5,
                            color: PALETTE.inkFaint,
                          }}
                        >
                          {lk.sub}
                        </span>
                      </span>
                      <ExternalLink
                        size={14}
                        strokeWidth={1.8}
                        color={PALETTE.inkFaint}
                      />
                    </a>
                  );
                })}
              </div>
            )}

            {/* image thumbnails — clickable, with captions */}
            {images.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))",
                  gap: 11,
                  marginTop: 13,
                }}
              >
                {images.map((f, i) => (
                  <div key={f.id || i}>
                    <a
                      href={f.url || undefined}
                      target={f.url ? "_blank" : undefined}
                      rel="noreferrer"
                      title={f.url ? "Open image" : f.name}
                      onClick={(e) => {
                        if (!f.url) e.preventDefault();
                      }}
                      style={{
                        position: "relative",
                        display: "block",
                        width: "100%",
                        aspectRatio: "4 / 3",
                        borderRadius: 9,
                        border: `1px solid ${PALETTE.line}`,
                        overflow: "hidden",
                        cursor: f.url ? "zoom-in" : "default",
                        background: f.url
                          ? `center/cover no-repeat url("${f.url}")`
                          : `linear-gradient(135deg, ${c.tint}, ${PALETTE.bg})`,
                      }}
                    >
                      {!f.url && (
                        <span
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "grid",
                            placeItems: "center",
                            color: PALETTE.inkFaint,
                          }}
                        >
                          <ImageIcon size={20} strokeWidth={1.4} />
                        </span>
                      )}
                      {editing && (
                        <button
                          className="btn"
                          onClick={(e) => {
                            e.preventDefault();
                            removeFile(f);
                          }}
                          title="Remove"
                          style={{
                            position: "absolute",
                            top: 5,
                            right: 5,
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            background: "rgba(28,26,23,.78)",
                            color: "#fff",
                            fontSize: 11,
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </a>
                    {editing ? (
                      <input
                        defaultValue={f.caption || ""}
                        placeholder="Add caption…"
                        onChange={(e) =>
                          setFiles((fs) =>
                            fs.map((x) =>
                              x === f ? { ...x, caption: e.target.value } : x,
                            ),
                          )
                        }
                        onBlur={(e) => {
                          if (f.id)
                            api
                              .setFileCaption(f.id, e.target.value)
                              .catch(() => {});
                        }}
                        style={{
                          ...inp,
                          marginTop: 5,
                          padding: "5px 8px",
                          fontSize: 11,
                        }}
                      />
                    ) : f.caption ? (
                      <div
                        style={{
                          fontSize: 10.5,
                          color: PALETTE.inkSoft,
                          marginTop: 5,
                          lineHeight: 1.35,
                        }}
                      >
                        {f.caption}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {/* pdf / other files */}
            {pdfs.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 12,
                }}
              >
                {pdfs.map((f, i) => (
                  <span
                    key={f.id || i}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      color: PALETTE.ink,
                      background: PALETTE.bg,
                      border: `1px solid ${PALETTE.line}`,
                      borderRadius: 8,
                      padding: "7px 11px",
                    }}
                  >
                    <FileText
                      size={14}
                      strokeWidth={1.8}
                      color={PALETTE.terra}
                    />
                    {f.url ? (
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: PALETTE.ink, textDecoration: "none" }}
                      >
                        {f.name}
                      </a>
                    ) : (
                      f.name
                    )}
                    {editing && (
                      <button
                        className="btn"
                        onClick={() => removeFile(f)}
                        title="Remove"
                        style={{
                          marginLeft: 2,
                          color: PALETTE.terra,
                          background: "transparent",
                          fontSize: 11,
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* prominent upload dropzone (edit mode) */}
            {editing && writable && (
              <button
                className="btn"
                onClick={() => fileRef.current && fileRef.current.click()}
                disabled={busy}
                style={{
                  marginTop: 13,
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 5,
                  padding: "18px 16px",
                  borderRadius: 11,
                  border: `1.5px dashed ${PALETTE.clay}66`,
                  background: PALETTE.claySoft,
                  color: PALETTE.clay,
                  cursor: busy ? "default" : "pointer",
                }}
              >
                <Paperclip size={19} strokeWidth={1.9} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {busy ? "Uploading…" : "Upload image or PDF"}
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 10, color: PALETTE.inkSoft }}
                >
                  Click to choose a file from your device
                </span>
              </button>
            )}
          </DetailSection>
        </div>

        {/* ---------- RIGHT · sidebar + feed (≈35%) ---------- */}
        <div
          style={{
            flex: stack ? "0 0 auto" : "1 1 0",
            minWidth: stack ? 0 : 320,
            maxWidth: stack ? "none" : 384,
            width: stack ? "100%" : "auto",
            borderLeft: stack ? "none" : `1px solid ${PALETTE.line}`,
            borderTop: stack ? `1px solid ${PALETTE.line}` : "none",
            background: PALETTE.bg,
            display: "flex",
            flexDirection: "column",
            overflow: stack ? "visible" : "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px 14px",
            }}
          >
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: PALETTE.inkSoft,
              }}
            >
              Quick Actions
            </span>
            <button
              className="btn"
              onClick={onClose}
              title="Close"
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: "transparent",
                color: PALETTE.inkFaint,
                display: "grid",
                placeItems: "center",
              }}
            >
              <X size={17} strokeWidth={1.8} />
            </button>
          </div>

          {/* assignees — who holds this project (can be more than one) */}
          <div style={{ padding: "0 18px 14px" }}>
            <div
              className="mono"
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: PALETTE.inkFaint,
                marginBottom: 8,
              }}
            >
              Assigned to
            </div>
            <div style={{ position: "relative" }}>
              <button
                className="btn"
                onClick={() =>
                  writable && onSetAssignees && setAssignOpen((o) => !o)
                }
                disabled={!writable || !onSetAssignees}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 9,
                  border: `1px solid ${PALETTE.line}`,
                  background: PALETTE.paper,
                  cursor: writable && onSetAssignees ? "pointer" : "default",
                  textAlign: "left",
                }}
              >
                {assignedMembers.length > 0 ? (
                  <AvatarStack
                    people={assignedMembers.map((m) => m.name || m.email)}
                    size={26}
                    max={4}
                  />
                ) : (
                  <Avatar name="" size={26} />
                )}
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 13,
                    fontWeight: 500,
                    color: assignedMembers.length
                      ? PALETTE.ink
                      : PALETTE.inkFaint,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {assignedMembers.length === 0
                    ? "Unassigned"
                    : assignedMembers.length === 1
                      ? assignedMembers[0].name || assignedMembers[0].email
                      : `${assignedMembers.length} people`}
                </span>
                {writable && onSetAssignees && (
                  <span style={{ color: PALETTE.inkFaint, display: "grid" }}>
                    <ChevronDown />
                  </span>
                )}
              </button>
              {assignOpen && (
                <>
                  <div
                    onClick={() => setAssignOpen(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 19 }}
                  />
                  <div
                    className="ovf"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: 0,
                      right: 0,
                      maxHeight: 280,
                      overflowY: "auto",
                      zIndex: 20,
                      background: PALETTE.paper,
                      border: `1px solid ${PALETTE.line}`,
                      borderRadius: 10,
                      boxShadow: "0 18px 44px -16px rgba(28,26,23,.32)",
                      padding: 5,
                    }}
                  >
                    <div
                      className="mono"
                      style={{
                        fontSize: 9.5,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: PALETTE.inkFaint,
                        padding: "5px 9px 7px",
                      }}
                    >
                      Tap to add or remove
                    </div>
                    {assignableMembers.map((mm) => {
                      const on = isAssigned(mm);
                      return (
                        <button
                          key={mm.id || mm.email}
                          className="btn"
                          onClick={() => toggleAssignee(mm)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                            padding: "8px 9px",
                            borderRadius: 7,
                            background: on ? PALETTE.bone : "transparent",
                            color: PALETTE.ink,
                            fontSize: 12.5,
                            fontWeight: on ? 600 : 500,
                            textAlign: "left",
                          }}
                        >
                          <Avatar name={mm.name || mm.email} size={22} />
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {mm.name || mm.email}
                          </span>
                          {on && (
                            <Check
                              size={14}
                              strokeWidth={2.2}
                              color={PALETTE.clay}
                            />
                          )}
                        </button>
                      );
                    })}
                    {assignableMembers.length === 0 && (
                      <div
                        style={{
                          fontSize: 12,
                          color: PALETTE.inkFaint,
                          padding: "8px 9px",
                        }}
                      >
                        No members loaded.
                      </div>
                    )}
                    {assignedMembers.length > 0 && (
                      <button
                        className="btn"
                        onClick={() => onSetAssignees([])}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "8px 9px",
                          marginTop: 3,
                          borderTop: `1px solid ${PALETTE.lineSoft}`,
                          borderRadius: 0,
                          background: "transparent",
                          color: PALETTE.terra,
                          fontSize: 12,
                        }}
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* quick actions */}
          <div
            style={{
              padding: "0 18px 14px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            <ActionBtn
              icon={Pencil}
              label="Edit details"
              onClick={onEdit}
              disabled={!writable}
            />
            <div style={{ position: "relative", display: "flex" }}>
              <ActionBtn
                icon={Replace}
                label="Change stage"
                onClick={() => setStagePick((v) => !v)}
                disabled={!writable || !onMoveStage}
              />
              {stagePick && (
                <>
                  <div
                    onClick={() => setStagePick(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 19 }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      right: 0,
                      minWidth: 224,
                      maxHeight: 280,
                      overflowY: "auto",
                      zIndex: 20,
                      background: PALETTE.paper,
                      border: `1px solid ${PALETTE.line}`,
                      borderRadius: 10,
                      boxShadow: "0 18px 44px -16px rgba(28,26,23,.32)",
                      padding: 5,
                    }}
                  >
                    {PIPELINES[pipe].stages.map((s) => {
                      const cur = s.id === p.pipelines[pipe].stage;
                      const sc = kindOf(s.kind);
                      return (
                        <button
                          key={s.id}
                          className="btn"
                          onClick={() => {
                            if (!cur && onMoveStage) onMoveStage(s.id);
                            setStagePick(false);
                          }}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                            padding: "8px 9px",
                            borderRadius: 7,
                            background: cur ? PALETTE.bone : "transparent",
                            color: PALETTE.ink,
                            fontSize: 12.5,
                            fontWeight: cur ? 600 : 500,
                            textAlign: "left",
                          }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: sc.color,
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ flex: 1, minWidth: 0 }}>
                            {s.label}
                          </span>
                          {cur && (
                            <Check
                              size={14}
                              strokeWidth={2.2}
                              color={PALETTE.clay}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <ActionBtn
              icon={Users}
              label="Manage access"
              onClick={onManageMembers}
              disabled={!onManageMembers}
              wide
            />
          </div>

          {/* memberships line */}
          {memberships.length > 0 && (
            <div
              style={{
                padding: "0 18px 14px",
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {memberships.map((m) => (
                <span
                  key={m.k}
                  className="mono"
                  style={{
                    fontSize: 9.5,
                    fontWeight: 500,
                    color: PALETTE.inkSoft,
                    border: `1px solid ${PALETTE.line}`,
                    background: PALETTE.paper,
                    borderRadius: 5,
                    padding: "2px 7px",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: m.color,
                      marginRight: 5,
                      verticalAlign: "middle",
                    }}
                  />
                  {m.label}: {m.stage}
                </span>
              ))}
            </div>
          )}

          {/* feed */}
          <div
            style={{
              padding: "14px 18px 6px",
              borderTop: `1px solid ${PALETTE.line}`,
            }}
          >
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: PALETTE.inkSoft,
              }}
            >
              Comments & Activity
            </span>
          </div>
          <div
            className="col-scroll"
            style={{
              flex: 1,
              overflowY: "auto",
              maxHeight: stack ? 360 : "none",
              padding: "8px 18px 14px",
            }}
          >
            {feed.length === 0 ? (
              <p
                style={{
                  fontSize: 12.5,
                  color: PALETTE.inkFaint,
                  textAlign: "center",
                  padding: "20px 0",
                }}
              >
                No activity yet.
              </p>
            ) : (
              feed.map((it, i) => (
                <FeedItem
                  key={it.id != null ? "c" + it.id : "s" + i}
                  it={it}
                  last={i === feed.length - 1}
                  canEdit={
                    it.kind === "comment" &&
                    it.mine &&
                    String(it.id).slice(0, 4) !== "tmp-"
                  }
                  canDelete={
                    it.kind === "comment" &&
                    (it.mine || isMasterLike(role)) &&
                    String(it.id).slice(0, 4) !== "tmp-"
                  }
                  onSave={(body) => editComment(it.id, body)}
                  onDelete={() => deleteComment(it.id)}
                />
              ))
            )}
          </div>

          {/* comment input */}
          <div
            style={{
              position: "relative",
              borderTop: `1px solid ${PALETTE.line}`,
              background: PALETTE.paper,
              padding: 12,
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
            }}
          >
            {/* @mention autocomplete */}
            {mention && mentionMatches.length > 0 && (
              <div
                className="ovf"
                style={{
                  position: "absolute",
                  left: 12,
                  right: 58,
                  bottom: "calc(100% - 4px)",
                  maxHeight: 200,
                  overflowY: "auto",
                  zIndex: 20,
                  background: PALETTE.paper,
                  border: `1px solid ${PALETTE.line}`,
                  borderRadius: 10,
                  boxShadow: "0 18px 44px -16px rgba(28,26,23,.32)",
                  padding: 5,
                }}
              >
                {mentionMatches.map((mm) => (
                  <button
                    key={mm.id || mm.email}
                    className="btn"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pickMention(mm);
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "7px 8px",
                      borderRadius: 7,
                      background: "transparent",
                      color: PALETTE.ink,
                      fontSize: 12.5,
                      textAlign: "left",
                    }}
                  >
                    <Avatar name={mm.name || mm.email} size={22} />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {mm.name || mm.email}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <textarea
              ref={draftRef}
              value={draft}
              onChange={onDraftChange}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Escape" && mention) {
                  setMention(null);
                  return;
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  if (mention && mentionMatches.length > 0) {
                    e.preventDefault();
                    pickMention(mentionMatches[0]);
                    return;
                  }
                  e.preventDefault();
                  addComment();
                }
              }}
              placeholder="Write a note… use @ to mention someone"
              style={{
                ...inp,
                resize: "none",
                minHeight: 38,
                maxHeight: 110,
                lineHeight: 1.45,
                padding: "9px 12px",
                background: PALETTE.bg,
              }}
            />
            <button
              className="btn btn-primary"
              onClick={addComment}
              disabled={!draft.trim()}
              title="Send"
              style={{
                width: 38,
                height: 38,
                borderRadius: 9,
                background: PALETTE.ink,
                color: "#fff",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                opacity: draft.trim() ? 1 : 0.4,
              }}
            >
              <Send size={15} strokeWidth={1.9} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon: I, label, onClick, disabled, wide }) {
  return (
    <button
      className="btn"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        gridColumn: wide ? "1 / -1" : "auto",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "10px 12px",
        borderRadius: 9,
        border: `1px solid ${PALETTE.line}`,
        background: PALETTE.paper,
        color: disabled ? PALETTE.inkFaint : PALETTE.ink,
        fontSize: 12.5,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        textAlign: "left",
      }}
    >
      <I
        size={15}
        strokeWidth={1.8}
        color={disabled ? PALETTE.inkFaint : PALETTE.clay}
      />
      {label}
    </button>
  );
}

/* render comment/activity text with @mentions highlighted */
function MentionText({ text }) {
  const parts = String(text || "").split(/(@\w+)/g);
  return parts.map((s, i) =>
    s[0] === "@" && s.length > 1 ? (
      <span key={i} style={{ color: PALETTE.clay, fontWeight: 600 }}>
        {s}
      </span>
    ) : (
      <React.Fragment key={i}>{s}</React.Fragment>
    ),
  );
}

export function FeedItem({ it, last, canEdit, canDelete, onSave, onDelete }) {
  const isComment = it.kind === "comment";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(it.text);
  const save = () => {
    const t = draft.trim();
    if (t && t !== it.text) onSave(t);
    setEditing(false);
  };
  return (
    <div
      className="feed-row"
      style={{
        display: "flex",
        gap: 11,
        position: "relative",
        paddingBottom: last ? 4 : 16,
      }}
    >
      {!last && (
        <span
          style={{
            position: "absolute",
            left: 12,
            top: 26,
            bottom: 0,
            width: 1,
            background: PALETTE.line,
          }}
        />
      )}
      {isComment ? (
        <span
          className="mono"
          style={{
            width: 25,
            height: 25,
            borderRadius: "50%",
            background: PALETTE.ink,
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontSize: 9.5,
            fontWeight: 600,
            flexShrink: 0,
            zIndex: 1,
          }}
        >
          {initials(it.author)}
        </span>
      ) : (
        <span
          style={{
            width: 25,
            height: 25,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            zIndex: 1,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: PALETTE.paper,
              border: `2px solid ${PALETTE.inkFaint}`,
            }}
          />
        </span>
      )}
      <div style={{ minWidth: 0, flex: 1, paddingTop: isComment ? 0 : 2 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12.5,
            color: isComment ? PALETTE.ink : PALETTE.inkSoft,
            lineHeight: 1.5,
          }}
        >
          <strong style={{ fontWeight: 600, color: PALETTE.ink }}>
            {it.author}
          </strong>
          {!isComment && " "}
          {isComment ? null : (
            <span>
              <MentionText text={it.text} />
            </span>
          )}
          {isComment && !editing && (canEdit || canDelete) && (
            <span
              className="feed-actions"
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: 2,
                opacity: 0,
                transition: "opacity .15s ease",
                flexShrink: 0,
              }}
            >
              {canEdit && (
                <button
                  className="btn"
                  onClick={() => {
                    setDraft(it.text);
                    setEditing(true);
                  }}
                  title="Edit"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: "transparent",
                    color: PALETTE.inkFaint,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Pencil size={12} strokeWidth={1.9} />
                </button>
              )}
              {canDelete && (
                <button
                  className="btn"
                  onClick={onDelete}
                  title="Delete"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: "transparent",
                    color: PALETTE.terra,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Trash2 size={12} strokeWidth={1.9} />
                </button>
              )}
            </span>
          )}
        </div>
        {isComment &&
          (editing ? (
            <div style={{ marginTop: 5 }}>
              <textarea
                value={draft}
                autoFocus
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    save();
                  }
                  if (e.key === "Escape") setEditing(false);
                }}
                style={{
                  ...inp,
                  resize: "vertical",
                  fontSize: 13,
                  lineHeight: 1.5,
                  padding: "8px 10px",
                }}
              />
              <div style={{ display: "flex", gap: 7, marginTop: 6 }}>
                <button
                  className="btn btn-primary"
                  onClick={save}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: "#fff",
                    padding: "5px 12px",
                    borderRadius: 7,
                    background: PALETTE.ink,
                  }}
                >
                  Save
                </button>
                <button
                  className="btn"
                  onClick={() => setEditing(false)}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: PALETTE.inkSoft,
                    padding: "5px 10px",
                    borderRadius: 7,
                    border: `1px solid ${PALETTE.line}`,
                    background: "transparent",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                fontSize: 13,
                color: PALETTE.ink,
                lineHeight: 1.55,
                marginTop: 3,
              }}
            >
              <MentionText text={it.text} />
            </div>
          ))}
        <div
          className="mono"
          style={{ fontSize: 10, color: PALETTE.inkFaint, marginTop: 3 }}
        >
          {fmtStamp(it.ts)}
        </div>
      </div>
    </div>
  );
}

/* ============================== Edit Modal ============================== */
function ProjectModal({ project, role, members, projects, contextPipe, onSave, onClose }) {
  const pickableMembers = (members || []).filter((m) => m.active);
  const mandorSuggestions = Array.from(
    new Set((projects || []).flatMap((p) => p.mandors || []).map((s) => s.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  const isNew = !!project._new || !project.id;
  const finance = canEditFinance(role);
  const stages = PIPELINES[contextPipe].stages;
  const existingStage =
    !isNew && project.pipelines ? project.pipelines[contextPipe].stage : null;

  const [f, setF] = useState({
    id: project.id,
    code: project.code || "",
    name: project.name || "",
    client: project.client || "",
    type: project.type || "Residential",
    stage: existingStage || stages[0].id,
    budget: project.budget ?? "",
    spent: project.spent ?? "",
    location: project.location || "",
    mandors: project.mandors || [],
    supervisor: project.supervisor || "",
    start: project.start || "",
    due: project.due || "",
    progress: project.progress ?? 0,
    notes: project.notes || "",
    masterOnly: isMasterOnly(project),
  });
  const [tab, setTab] = useState("details");
  const [mandorInput, setMandorInput] = useState("");
  const [mandorOpen, setMandorOpen] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const addMandor = (name) => {
    const clean = (name || "").trim();
    if (!clean) return;
    setF((s) =>
      s.mandors.some((m) => m.toLowerCase() === clean.toLowerCase())
        ? s
        : { ...s, mandors: [...s.mandors, clean] }
    );
    setMandorInput("");
  };
  const removeMandor = (name) => {
    setF((s) => ({ ...s, mandors: s.mandors.filter((m) => m !== name) }));
  };
  const filteredMandorSuggestions = mandorSuggestions
    .filter((name) => !f.mandors.some((m) => m.toLowerCase() === name.toLowerCase()))
    .filter((name) =>
      mandorInput.trim() ? name.toLowerCase().includes(mandorInput.trim().toLowerCase()) : true
    );

  const submit = () => {
    if (!f.name.trim()) return;
    let pipelines;
    if (isNew) {
      pipelines = emptyPipes();
      pipelines[contextPipe] = { active: true, stage: f.stage };
    } else {
      pipelines = {
        ...project.pipelines,
        [contextPipe]: { ...project.pipelines[contextPipe], stage: f.stage },
      };
    }
    const payload = {
      id: f.id,
      code: f.code.trim(),
      name: f.name.trim(),
      client: f.client,
      type: f.type,
      location: f.location,
      mandors: f.mandors,
      supervisor: f.supervisor,
      start: f.start,
      due: f.due,
      progress: Number(f.progress) || 0,
      notes: f.notes,
      stage: f.stage,
      budget: finance ? Number(f.budget) || 0 : project.budget || 0,
      spent: finance ? Number(f.spent) || 0 : project.spent || 0,
      pipelines,
      labels: f.masterOnly
        ? [...(project.labels || []).filter((x) => x !== MASTER_ONLY_LABEL), MASTER_ONLY_LABEL]
        : (project.labels || []).filter((x) => x !== MASTER_ONLY_LABEL),
    };
    onSave(payload, contextPipe);
  };

  return (
    <div onClick={onClose} style={overlay}>
      <div
        className="ovf"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: PALETTE.paper,
          borderRadius: 16,
          width: "min(640px, 94vw)",
          maxHeight: "92vh",
          overflowY: "auto",
          border: `1px solid ${PALETTE.line}`,
          boxShadow: "0 30px 80px -20px rgba(28,26,23,.32)",
        }}
      >
        <div
          style={{
            padding: "22px 26px 0",
            borderBottom: `1px solid ${PALETTE.lineSoft}`,
            position: "sticky",
            top: 0,
            background: PALETTE.paper,
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: PALETTE.inkFaint,
                  fontWeight: 600,
                }}
              >
                {PIPELINES[contextPipe].label}
              </div>
              <h2
                className="serif"
                style={{
                  fontSize: 22,
                  fontWeight: 500,
                  margin: "6px 0 0",
                  letterSpacing: "-0.02em",
                }}
              >
                {isNew ? "New Project" : "Edit Project"}
              </h2>
            </div>
            <button
              className="btn"
              onClick={onClose}
              style={{
                background: "transparent",
                color: PALETTE.inkFaint,
                width: 30,
                height: 30,
                display: "grid",
                placeItems: "center",
                borderRadius: 7,
                marginTop: -2,
              }}
            >
              <Icon size={17} d="M18 6L6 18M6 6l12 12" />
            </button>
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 16 }}>
            {["details", !isNew && "activity"].filter(Boolean).map((t) => (
              <button
                key={t}
                className="btn"
                onClick={() => setTab(t)}
                style={{
                  background: "transparent",
                  padding: "0 0 12px",
                  fontSize: 13,
                  fontWeight: tab === t ? 600 : 500,
                  letterSpacing: "-0.01em",
                  color: tab === t ? PALETTE.ink : PALETTE.inkSoft,
                  borderBottom: `2px solid ${tab === t ? PALETTE.clay : "transparent"}`,
                }}
              >
                {t === "activity" ? "Activity Log" : "Details"}
              </button>
            ))}
          </div>
        </div>

        {tab === "details" ? (
          <div
            style={{
              padding: "22px 26px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <Row>
              <Field label="Project Code">
                <input
                  value={f.code}
                  onChange={(e) => set("code", e.target.value.toUpperCase())}
                  placeholder="e.g. TRC-EA22"
                  style={{ ...inp, fontFamily: "monospace", letterSpacing: "0.05em" }}
                />
              </Field>
              <Field label="Project Name *">
                <input
                  value={f.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Menteng Townhouse"
                  style={inp}
                  autoFocus
                />
              </Field>
            </Row>

            <Row>
              <Field label="Client">
                <input
                  value={f.client}
                  onChange={(e) => set("client", e.target.value)}
                  placeholder="Client name"
                  style={inp}
                />
              </Field>
              <Field label="Project Type">
                <select
                  value={f.type}
                  onChange={(e) => set("type", e.target.value)}
                  style={inp}
                >
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
            </Row>

            <Row>
              <Field label={`Stage · ${PIPELINES[contextPipe].short}`}>
                <select
                  value={f.stage}
                  onChange={(e) => set("stage", e.target.value)}
                  style={inp}
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Location">
                <input
                  value={f.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="Area, city"
                  style={inp}
                />
              </Field>
            </Row>

            <Row>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 7,
                  flex: 1,
                  minWidth: 150,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: PALETTE.inkSoft,
                  }}
                >
                  Nama Mandor
                </span>
                {f.mandors.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 2 }}>
                    {f.mandors.map((name) => (
                      <span
                        key={name}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          padding: "3px 3px 3px 10px",
                          borderRadius: 20,
                          background: PALETTE.bone,
                          border: `1px solid ${PALETTE.line}`,
                          fontSize: 12.5,
                          color: PALETTE.ink,
                        }}
                      >
                        {name}
                        <IconBtn label="Hapus" symbol="✕" danger onClick={() => removeMandor(name)} />
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ position: "relative" }}>
                  <input
                    value={mandorInput}
                    onChange={(e) => {
                      setMandorInput(e.target.value);
                      setMandorOpen(true);
                    }}
                    onFocus={() => setMandorOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addMandor(mandorInput);
                        setMandorOpen(true);
                      } else if (e.key === "Escape") {
                        setMandorOpen(false);
                      }
                    }}
                    onBlur={() => {
                      addMandor(mandorInput);
                      setMandorOpen(false);
                    }}
                    placeholder="Ketik nama, lalu Enter…"
                    autoComplete="off"
                    style={inp}
                  />
                  {mandorOpen && filteredMandorSuggestions.length > 0 && (
                    <>
                      <div
                        onClick={() => setMandorOpen(false)}
                        style={{ position: "fixed", inset: 0, zIndex: 19 }}
                      />
                      <div
                        className="ovf"
                        style={{
                          position: "absolute",
                          top: "calc(100% + 6px)",
                          left: 0,
                          right: 0,
                          maxHeight: 220,
                          overflowY: "auto",
                          zIndex: 20,
                          background: PALETTE.paper,
                          border: `1px solid ${PALETTE.line}`,
                          borderRadius: 10,
                          boxShadow: "0 18px 44px -16px rgba(28,26,23,.32)",
                          padding: 5,
                        }}
                      >
                        {filteredMandorSuggestions.map((name) => (
                          <button
                            key={name}
                            type="button"
                            className="btn"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              addMandor(name);
                              setMandorOpen(false);
                            }}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "8px 9px",
                              borderRadius: 7,
                              background: "transparent",
                              color: PALETTE.ink,
                              fontSize: 12.5,
                              fontWeight: 500,
                            }}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: PALETTE.inkFaint,
                    marginTop: 4,
                  }}
                >
                  Tekan Enter atau koma untuk menambahkan
                </div>
              </div>
              <Field label="Nama Supervisor">
                <select
                  value={f.supervisor}
                  onChange={(e) => set("supervisor", e.target.value)}
                  style={inp}
                >
                  <option value="">— Pilih supervisor —</option>
                  {f.supervisor && !pickableMembers.some((m) => (m.name || m.email) === f.supervisor) && (
                    <option value={f.supervisor}>{f.supervisor}</option>
                  )}
                  {pickableMembers.map((m) => (
                    <option key={m.id || m.email} value={m.name || m.email}>
                      {m.name || m.email}
                    </option>
                  ))}
                </select>
              </Field>
            </Row>

            {finance && (
              <Row>
                <Field label="Budget (Rp)">
                  <input
                    type="number"
                    value={f.budget}
                    onChange={(e) => set("budget", e.target.value)}
                    placeholder="0"
                    style={inp}
                  />
                </Field>
                <Field label="Spent so far (Rp)">
                  <input
                    type="number"
                    value={f.spent}
                    onChange={(e) => set("spent", e.target.value)}
                    placeholder="0"
                    style={inp}
                  />
                </Field>
              </Row>
            )}

            <Row>
              <Field label="Start Date">
                <input
                  type="date"
                  value={f.start}
                  onChange={(e) => set("start", e.target.value)}
                  style={inp}
                />
              </Field>
              <Field label="Target Completion">
                <input
                  type="date"
                  value={f.due}
                  onChange={(e) => set("due", e.target.value)}
                  style={inp}
                />
              </Field>
            </Row>

            <Field label={`Progress — ${f.progress}%`}>
              <input
                type="range"
                min="0"
                max="100"
                value={f.progress}
                onChange={(e) => set("progress", e.target.value)}
                style={{ width: "100%", accentColor: PALETTE.clay }}
              />
            </Field>

            <Field label="Notes">
              <textarea
                value={f.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder="Materials, status, next steps…"
                style={{ ...inp, resize: "vertical", lineHeight: 1.5 }}
              />
            </Field>
            {role === "MASTER" && (
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: "pointer", marginTop: 4, padding: "12px 14px", borderRadius: 10, background: f.masterOnly ? `${PALETTE.clay}15` : PALETTE.sand, border: `1.5px solid ${f.masterOnly ? PALETTE.clay : PALETTE.line}`, transition: "all 0.18s" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: f.masterOnly ? PALETTE.clay : PALETTE.ink }}>Master Only</div>
                  <div style={{ fontSize: 11, color: PALETTE.inkSoft, marginTop: 2 }}>Project ini tidak akan terlihat oleh Sales</div>
                </div>
                {/* pill toggle */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <input type="checkbox" checked={f.masterOnly} onChange={(e) => set("masterOnly", e.target.checked)} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
                  <div style={{ width: 40, height: 22, borderRadius: 11, background: f.masterOnly ? PALETTE.clay : PALETTE.line, transition: "background 0.18s", display: "flex", alignItems: "center", padding: "0 3px" }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transform: f.masterOnly ? "translateX(18px)" : "translateX(0)", transition: "transform 0.18s" }} />
                  </div>
                </div>
              </label>
            )}
          </div>
        ) : (
          <div style={{ padding: "20px 26px" }}>
            {(project.log || []).length === 0 ? (
              <Empty text="No activity recorded yet." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {(project.log || []).map((l, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "11px 0",
                      borderBottom:
                        i < project.log.length - 1
                          ? `1px solid ${PALETTE.lineSoft}`
                          : "none",
                    }}
                  >
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        flexShrink: 0,
                        borderRadius: "50%",
                        background: PALETTE.ink,
                        color: "#fff",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 10.5,
                        fontWeight: 600,
                      }}
                      className="mono"
                    >
                      {(ROLES[l.role] || ROLES.MASTER).tag}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: PALETTE.ink,
                        }}
                      >
                        {l.text}
                      </div>
                      <div
                        className="mono"
                        style={{
                          fontSize: 10.5,
                          color: PALETTE.inkFaint,
                          marginTop: 2,
                        }}
                      >
                        {(ROLES[l.role] || ROLES.MASTER).label} ·{" "}
                        {fmtStamp(l.ts)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            padding: "15px 26px 22px",
            display: "flex",
            gap: 9,
            justifyContent: "flex-end",
            borderTop: `1px solid ${PALETTE.lineSoft}`,
          }}
        >
          <button
            className="btn"
            onClick={onClose}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              background: "transparent",
              color: PALETTE.inkSoft,
              fontSize: 13,
              fontWeight: 500,
              border: `1px solid ${PALETTE.line}`,
            }}
          >
            Cancel
          </button>
          {tab === "details" && (
            <button
              className="btn btn-primary"
              onClick={submit}
              style={{
                padding: "9px 22px",
                borderRadius: 8,
                background: PALETTE.ink,
                color: "#fff",
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              {isNew ? "Create Project" : "Save Changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
        flex: 1,
        minWidth: 150,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: PALETTE.inkSoft,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
function Row({ children }) {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>{children}</div>
  );
}

/* ============================== Confirm Delete ============================== */
function ConfirmDelete({ entry, role, onConfirm, onClose }) {
  const permanent = entry.pk === "MASTER";
  const pname = PIPELINES[entry.pk].label;
  return (
    <div onClick={onClose} style={overlay}>
      <div
        className="ovf"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: PALETTE.paper,
          borderRadius: 14,
          width: "min(420px, 92vw)",
          padding: 24,
          border: `1px solid ${PALETTE.line}`,
          boxShadow: "0 30px 80px -20px rgba(28,26,23,.32)",
        }}
      >
        <h2
          className="serif"
          style={{
            fontSize: 20,
            fontWeight: 500,
            margin: "0 0 9px",
            letterSpacing: "-0.02em",
          }}
        >
          {permanent ? "Delete project?" : "Remove from board?"}
        </h2>
        <p
          style={{
            color: PALETTE.inkSoft,
            fontSize: 13.5,
            margin: "0 0 22px",
            lineHeight: 1.55,
          }}
        >
          {permanent ? (
            <>
              <strong style={{ color: PALETTE.ink, fontWeight: 600 }}>
                {entry.p.name}
              </strong>{" "}
              will be permanently removed from every pipeline. This can't be
              undone.
            </>
          ) : (
            <>
              <strong style={{ color: PALETTE.ink, fontWeight: 600 }}>
                {entry.p.name}
              </strong>{" "}
              will be taken off the {pname}. Its record stays in other divisions
              and can be handed over again.
            </>
          )}
        </p>
        <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
          <button
            className="btn"
            onClick={onClose}
            style={{
              padding: "9px 16px",
              borderRadius: 8,
              background: "transparent",
              color: PALETTE.inkSoft,
              fontSize: 13,
              fontWeight: 500,
              border: `1px solid ${PALETTE.line}`,
            }}
          >
            Keep it
          </button>
          <button
            className="btn"
            onClick={onConfirm}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              background: PALETTE.terra,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {permanent ? "Delete" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(28,26,23,.34)",
  backdropFilter: "blur(5px)",
  WebkitBackdropFilter: "blur(5px)",
  display: "grid",
  placeItems: "center",
  zIndex: 50,
  padding: 16,
};
const inp = {
  padding: "10px 14px",
  borderRadius: 12,
  border: `1px solid ${PALETTE.line}`,
  background: PALETTE.bg,
  fontSize: 13.5,
  color: PALETTE.ink,
  outline: "none",
  width: "100%",
};
const roInp = { opacity: 0.55, cursor: "not-allowed" };
const collapseBtn = {
  padding: "5px 11px",
  borderRadius: 6,
  background: "transparent",
  color: PALETTE.inkSoft,
  fontSize: 12,
  fontWeight: 500,
};





