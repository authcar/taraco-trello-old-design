import { createClient } from "@supabase/supabase-js";

/* Reads credentials from Vite env (see .env.example).
   The anon key is safe to ship to the browser — RLS + the RPCs are what
   actually protect the data. */
const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // eslint-disable-next-line no-console
  console.warn("[studioos] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env");
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
