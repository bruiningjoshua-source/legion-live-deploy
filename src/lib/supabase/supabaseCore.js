import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://almpdnbqgfnsqlcmbucj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbXBkbmJxZ2Zuc3FsY21idWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NjA4ODQsImV4cCI6MjA5MDAzNjg4NH0.XoZvfoxkaUE7sn5Yu0TEyUriUcjNK0iz66gWXQYfUTk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);