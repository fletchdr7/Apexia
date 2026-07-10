import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import { config } from './config';

/**
 * A single Supabase client for the whole app. It is only created when a project
 * is configured; in demo mode this is `null` and the data layer falls back to
 * local mock data.
 */
export const supabase: SupabaseClient | null = config.hasSupabase
  ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
