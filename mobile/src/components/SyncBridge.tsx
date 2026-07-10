import { useEffect, useRef } from 'react';

import { fetchUserState, saveUserState } from '@/lib/userState';
import { useAppStore } from '@/store/AppStore';
import { useAuth } from '@/store/AuthContext';

/**
 * Bridges auth <-> local store for cloud sync (renders nothing).
 *
 * - On sign-in: pulls the user's cloud document and hydrates the store. If the
 *   user has no cloud data yet, seeds it from whatever is on this device.
 * - While signed in: debounced push of local changes to the cloud.
 */
export function SyncBridge() {
  const { session } = useAuth();
  const { ready, snapshot, hydrate } = useAppStore();
  const userId = session?.user?.id ?? null;

  const loadedFor = useRef<string | null>(null);
  const hydrating = useRef(false);

  useEffect(() => {
    if (!userId) {
      loadedFor.current = null;
      return;
    }
    if (!ready || loadedFor.current === userId) return;

    let active = true;
    hydrating.current = true;
    (async () => {
      try {
        const remote = await fetchUserState(userId);
        if (!active) return;
        if (remote) {
          hydrate(remote);
        } else {
          await saveUserState(userId, snapshot);
        }
        loadedFor.current = userId;
      } finally {
        // Small delay so the hydrate-triggered snapshot change doesn't immediately push back.
        setTimeout(() => {
          hydrating.current = false;
        }, 400);
      }
    })();

    return () => {
      active = false;
    };
    // snapshot intentionally excluded: we only pull once per user session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, ready]);

  useEffect(() => {
    if (!userId || loadedFor.current !== userId || hydrating.current) return;
    const timer = setTimeout(() => {
      saveUserState(userId, snapshot).catch(() => undefined);
    }, 1500);
    return () => clearTimeout(timer);
  }, [snapshot, userId]);

  return null;
}
