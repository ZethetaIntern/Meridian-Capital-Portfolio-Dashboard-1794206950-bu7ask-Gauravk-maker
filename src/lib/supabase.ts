import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Supabase URL or Publishable Key missing. Check your .env.local file."
  );
}
export const supabase = createClient(supabaseUrl, supabaseKey);