import type { SyncableState } from '@/store/AppStore';
import { supabase } from './supabase';

/**
 * Cloud sync uses a single JSON document per user (the `user_state` table).
 * This keeps sync simple and robust for a personal app; the relational tables in
 * `supabase/schema.sql` remain available for future per-row querying.
 */

export async function fetchUserState(userId: string): Promise<SyncableState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('user_state')
    .select('state')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return (data.state as SyncableState) ?? null;
}

export async function saveUserState(userId: string, state: SyncableState): Promise<void> {
  if (!supabase) return;
  await supabase.from('user_state').upsert(
    { user_id: userId, state, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
}
