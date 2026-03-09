import { createClient } from "@supabase/supabase-js";

// Works in both Vite (browser) and Node.js (Vercel serverless)
const supabaseUrl =
  import.meta.env?.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env?.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[supabaseClient] Missing Supabase URL or anon key");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
