import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// createClient() throws synchronously if url/key are missing or malformed.
// This file is imported eagerly at the very top of the app (App.jsx ->
// SupabaseAuthContext -> here), before any error boundary exists to catch
// it — a throw here previously produced a completely blank, silent screen
// with zero diagnostic information, since it happens before React even
// starts rendering.
//
// If the env vars are missing in production, fail loudly and visibly
// instead of silently killing the whole app.
let supabase;
try {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      `Missing Supabase configuration. VITE_SUPABASE_URL=${supabaseUrl ? 'set' : 'MISSING'}, ` +
      `VITE_SUPABASE_ANON_KEY=${supabaseAnonKey ? 'set' : 'MISSING'}. ` +
      `Check Netlify environment variables.`
    );
  }
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (err) {
  console.error('[supabaseCore] FATAL: failed to initialize Supabase client:', err.message);
  // Re-throw so main.jsx's boot() error boundary can show a real error
  // screen instead of a blank page.
  throw err;
}

export { supabase };
