import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const fallbackUrl = 'https://example.supabase.co';
const fallbackAnonKey = 'public-anon-key-placeholder';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
}

// Prevent startup crash in release build if env values are missing.
export const supabase = createClient(supabaseUrl || fallbackUrl, supabaseAnonKey || fallbackAnonKey);
