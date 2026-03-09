import { createClient } from "@supabase/supabase-js";

// Works in both Vite (browser) and Node.js (Vercel serverless)
const supabaseUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  process.env.SUPABASE_URL;

const supabaseAnonKey =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  process.env.SUPABASE_ANON_KEY;

console.log("[supabaseClient] URL present:", !!supabaseUrl);
console.log("[supabaseClient] Key present:", !!supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
