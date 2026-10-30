import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

/* Resolves: am I signed in? and if so, what division am I?
   - status "loading"    -> still checking the session
   - status "signed-out" -> no Google session
   - status "no-access"  -> signed in, but email not in `members` (or inactive)
   - status "ready"      -> member loaded; use `member.role`
   Role is ALWAYS read from the DB, never from the client. */
export function useSession() {
  const [session, setSession] = useState(null);
  const [member, setMember] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let alive = true;

    const resolve = async (s) => {
      if (!alive) return;
      setSession(s);
      if (!s) { setMember(null); setStatus("signed-out"); return; }
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("email", s.user.email)
        .maybeSingle();
      if (!alive) return;
      if (error || !data || !data.active) { setMember(null); setStatus("no-access"); }
      else { setMember(data); setStatus("ready"); }
    };

    /* getSession() can hang (cold network, or a stale Web Locks lock left
       over from a previous tab) — don't leave the UI stuck on a blank
       screen forever if it does. onAuthStateChange stays subscribed and
       will still flip us to "ready"/"no-access" if the real result
       arrives late. */
    const timeout = setTimeout(() => {
      if (alive) setStatus((cur) => (cur === "loading" ? "signed-out" : cur));
    }, 6000);

    supabase.auth.getSession().then(({ data }) => resolve(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => resolve(s));
    return () => { alive = false; clearTimeout(timeout); sub.subscription.unsubscribe(); };
  }, []);

  return { session, member, role: member ? member.role : null, status };
}
