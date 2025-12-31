import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const url = window.env?.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = window.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const configured = Boolean(url && anonKey);

if (!configured) {
  console.warn("Supabase Keys fehlen. Bitte NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY setzen.");
}

export const supabase = configured ? createClient(url, anonKey) : null;
export const isSupabaseConfigured = () => configured;
