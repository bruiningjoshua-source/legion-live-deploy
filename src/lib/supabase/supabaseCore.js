import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://almpdnbqgfnsqlcmbucj.supabase.co';
const supabaseAnonKey = 'sb_publishable_Im4pnwdacqAzFyCvhVWYpw_-W5qRW1m';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);