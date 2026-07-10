import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type {
  FoodEntry,
  Supplement,
  SupplementLog,
  UserProfile,
  WorkoutEntry,
} from '@/types';
import { isSameDay } from '@/utils/date';
import { uid } from '@/utils/id';
import { addNutrients, emptyNutrients } from '@/utils/nutrition';
import {
  DEMO_FOODS,
  DEMO_SUPPLEMENTS,
  DEMO_SUPPLEMENT_LOGS,
  DEMO_WORKOUTS,
} from './seed';

const STORAGE_KEY = 'apexia.appstate.v1';

interface PersistedState {
  profile: UserProfile | null;
  workouts: WorkoutEntry[];
  foods: FoodEntry[];
  supplements: Supplement[];
  supplementLogs: SupplementLog[];
  seeded: boolean;
  /** User chose to use the app without an account (local-only, no sync). */
  guestMode: boolean;
}

/** The subset of state that is synced to the cloud (device flags excluded). */
export type SyncableState = Pick<
  PersistedState,
  'profile' | 'workouts' | 'foods' | 'supplements' | 'supplementLogs'
>;

interface AppStoreValue extends PersistedState {
  ready: boolean;
  snapshot: SyncableState;
  hydrate: (next: SyncableState) => void;
  setGuestMode: (value: boolean) => void;
  // profile
  setProfile: (profile: UserProfile) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  resetAll: () => void;
  // workouts
  addWorkout: (w: Omit<WorkoutEntry, 'id'>) => WorkoutEntry;
  removeWorkout: (id: string) => void;
  // foods
  addFood: (f: Omit<FoodEntry, 'id'>) => FoodEntry;
  removeFood: (id: string) => void;
  // supplements
  addSupplement: (s: Omit<Supplement, 'id'>) => Supplement;
  removeSupplement: (id: string) => void;
  logSupplement: (supplement: Supplement, dose?: string) => void;
  // derived helpers
  todaysFoods: () => FoodEntry[];
  todaysWorkouts: () => WorkoutEntry[];
  todaysNutrition: () => ReturnType<typeof emptyNutrients>;
}

const initialState: PersistedState = {
  profile: null,
  workouts: [],
  foods: [],
  supplements: [],
  supplementLogs: [],
  seeded: false,
  guestMode: false,
};

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setState({ ...initialState, ...(JSON.parse(raw) as PersistedState) });
        }
      } catch {
        // ignore corrupt storage; start fresh
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [state, ready]);

  const setProfile = useCallback((profile: UserProfile) => {
    setState((s) => {
      // Seed sample activity the first time a profile is created so the app
      // never looks empty during first exploration.
      if (!s.seeded) {
        return {
          ...s,
          profile,
          workouts: DEMO_WORKOUTS,
          foods: DEMO_FOODS,
          supplements: DEMO_SUPPLEMENTS,
          supplementLogs: DEMO_SUPPLEMENT_LOGS,
          seeded: true,
        };
      }
      return { ...s, profile };
    });
  }, []);

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setState((s) => (s.profile ? { ...s, profile: { ...s.profile, ...patch } } : s));
  }, []);

  const resetAll = useCallback(() => {
    setState(initialState);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  }, []);

  // Replace the synced portion of state (used when loading cloud data on sign-in).
  const hydrate = useCallback((next: SyncableState) => {
    setState((s) => ({ ...s, ...next, seeded: true }));
  }, []);

  const setGuestMode = useCallback((guestMode: boolean) => {
    setState((s) => ({ ...s, guestMode }));
  }, []);

  const addWorkout = useCallback((w: Omit<WorkoutEntry, 'id'>) => {
    const entry: WorkoutEntry = { ...w, id: uid('w_') };
    setState((s) => ({ ...s, workouts: [entry, ...s.workouts] }));
    return entry;
  }, []);

  const removeWorkout = useCallback((id: string) => {
    setState((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) }));
  }, []);

  const addFood = useCallback((f: Omit<FoodEntry, 'id'>) => {
    const entry: FoodEntry = { ...f, id: uid('f_') };
    setState((s) => ({ ...s, foods: [entry, ...s.foods] }));
    return entry;
  }, []);

  const removeFood = useCallback((id: string) => {
    setState((s) => ({ ...s, foods: s.foods.filter((f) => f.id !== id) }));
  }, []);

  const addSupplement = useCallback((sup: Omit<Supplement, 'id'>) => {
    const entry: Supplement = { ...sup, id: uid('s_') };
    setState((s) => ({ ...s, supplements: [entry, ...s.supplements] }));
    return entry;
  }, []);

  const removeSupplement = useCallback((id: string) => {
    setState((s) => ({ ...s, supplements: s.supplements.filter((x) => x.id !== id) }));
  }, []);

  const logSupplement = useCallback((supplement: Supplement, dose?: string) => {
    const log: SupplementLog = {
      id: uid('sl_'),
      supplementId: supplement.id,
      supplementName: supplement.name,
      takenAt: new Date().toISOString(),
      dose: dose ?? supplement.servingSize ?? '1 serving',
    };
    setState((s) => ({ ...s, supplementLogs: [log, ...s.supplementLogs] }));
  }, []);

  const todaysFoods = useCallback(() => state.foods.filter((f) => isSameDay(f.loggedAt)), [state.foods]);
  const todaysWorkouts = useCallback(
    () => state.workouts.filter((w) => isSameDay(w.performedAt)),
    [state.workouts],
  );
  const todaysNutrition = useCallback(() => {
    return todaysFoods().reduce((acc, f) => addNutrients(acc, f.nutrients, f.servings), emptyNutrients());
  }, [todaysFoods]);

  const snapshot = useMemo<SyncableState>(
    () => ({
      profile: state.profile,
      workouts: state.workouts,
      foods: state.foods,
      supplements: state.supplements,
      supplementLogs: state.supplementLogs,
    }),
    [state.profile, state.workouts, state.foods, state.supplements, state.supplementLogs],
  );

  const value = useMemo<AppStoreValue>(
    () => ({
      ...state,
      ready,
      snapshot,
      hydrate,
      setGuestMode,
      setProfile,
      updateProfile,
      resetAll,
      addWorkout,
      removeWorkout,
      addFood,
      removeFood,
      addSupplement,
      removeSupplement,
      logSupplement,
      todaysFoods,
      todaysWorkouts,
      todaysNutrition,
    }),
    [
      state,
      ready,
      snapshot,
      hydrate,
      setGuestMode,
      setProfile,
      updateProfile,
      resetAll,
      addWorkout,
      removeWorkout,
      addFood,
      removeFood,
      addSupplement,
      removeSupplement,
      logSupplement,
      todaysFoods,
      todaysWorkouts,
      todaysNutrition,
    ],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}
