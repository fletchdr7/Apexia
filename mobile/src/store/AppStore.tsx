import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type {
  Equipment,
  ExerciseRecord,
  FoodEntry,
  Supplement,
  SupplementLog,
  UserProfile,
  WeightEntry,
  WorkoutEntry,
  WorkoutLocation,
  WorkoutPlan,
} from '@/types';
import { dateKeyOf, stampForDate, todayKey } from '@/utils/date';
import { uid } from '@/utils/id';
import { addNutrients, ageFromBirthYear, computeTargets, emptyNutrients } from '@/utils/nutrition';
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
  /** Equipment the user scanned/added beyond the built-in catalog. */
  customEquipment: Equipment[];
  /** Ids (catalog or custom) of equipment available at the gym / at home. */
  gymEquipmentIds: string[];
  homeEquipmentIds: string[];
  /** Per-exercise performance memory (keyed by lowercase name) for progression. */
  exerciseHistory: Record<string, ExerciseRecord>;
  /** Body-weight history for progress tracking. */
  weightLogs: WeightEntry[];
  seeded: boolean;
  /** User chose to use the app without an account (local-only, no sync). */
  guestMode: boolean;
  /** Whether the user connected Apple Health on this device (device-local). */
  healthEnabled: boolean;
}

/** The subset of state that is synced to the cloud (device flags excluded). */
export type SyncableState = Pick<
  PersistedState,
  | 'profile'
  | 'workouts'
  | 'foods'
  | 'supplements'
  | 'supplementLogs'
  | 'customEquipment'
  | 'gymEquipmentIds'
  | 'homeEquipmentIds'
  | 'exerciseHistory'
  | 'weightLogs'
>;

interface AppStoreValue extends PersistedState {
  ready: boolean;
  snapshot: SyncableState;
  hydrate: (next: SyncableState) => void;
  setGuestMode: (value: boolean) => void;
  setHealthEnabled: (value: boolean) => void;
  /** Transient plan being run in an active workout session (not persisted). */
  activePlan: WorkoutPlan | null;
  setActivePlan: (plan: WorkoutPlan | null) => void;
  /** The day the app is focused on for viewing/logging (YYYY-MM-DD). */
  selectedDate: string;
  setSelectedDate: (dateKey: string) => void;
  /** ISO timestamp on the selected day (current time), for new log entries. */
  dateStamp: () => string;
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
  // weight
  logWeight: (weightKg: number, dateKey?: string) => void;
  removeWeightLog: (id: string) => void;
  // equipment
  addEquipment: (e: Omit<Equipment, 'id'>, location?: WorkoutLocation) => Equipment;
  removeEquipment: (id: string) => void;
  toggleEquipment: (id: string, location: WorkoutLocation) => void;
  // derived helpers
  foodsForDate: (dateKey: string) => FoodEntry[];
  workoutsForDate: (dateKey: string) => WorkoutEntry[];
  nutritionForDate: (dateKey: string) => ReturnType<typeof emptyNutrients>;
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
  customEquipment: [],
  gymEquipmentIds: [],
  homeEquipmentIds: [],
  exerciseHistory: {},
  weightLogs: [],
  seeded: false,
  guestMode: false,
  healthEnabled: false,
};

/** Backfill fields added in newer versions (and migrate the old equipment list). */
function normalize(raw: Partial<PersistedState> & { selectedEquipmentIds?: string[] }): PersistedState {
  const merged = { ...initialState, ...raw } as PersistedState;
  if ((!raw.gymEquipmentIds || raw.gymEquipmentIds.length === 0) && raw.selectedEquipmentIds?.length) {
    merged.gymEquipmentIds = raw.selectedEquipmentIds;
  }
  merged.gymEquipmentIds = merged.gymEquipmentIds ?? [];
  merged.homeEquipmentIds = merged.homeEquipmentIds ?? [];
  merged.customEquipment = merged.customEquipment ?? [];
  merged.exerciseHistory = merged.exerciseHistory ?? {};
  merged.weightLogs = merged.weightLogs ?? [];
  return merged;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialState);
  const [ready, setReady] = useState(false);
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => todayKey());
  const dateStamp = useCallback(() => stampForDate(selectedDate), [selectedDate]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setState(normalize(JSON.parse(raw)));
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
      const weightLogs = s.weightLogs.length
        ? s.weightLogs
        : [{ id: uid('wt_'), loggedAt: new Date().toISOString(), weightKg: profile.weightKg }];
      // Seed sample activity the first time a profile is created so the app
      // never looks empty during first exploration.
      if (!s.seeded) {
        return {
          ...s,
          profile,
          weightLogs,
          workouts: DEMO_WORKOUTS,
          foods: DEMO_FOODS,
          supplements: DEMO_SUPPLEMENTS,
          supplementLogs: DEMO_SUPPLEMENT_LOGS,
          seeded: true,
        };
      }
      return { ...s, profile, weightLogs };
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
    setState((s) => normalize({ ...s, ...next, seeded: true }));
  }, []);

  const setGuestMode = useCallback((guestMode: boolean) => {
    setState((s) => ({ ...s, guestMode }));
  }, []);

  const setHealthEnabled = useCallback((healthEnabled: boolean) => {
    setState((s) => ({ ...s, healthEnabled }));
  }, []);

  const addWorkout = useCallback((w: Omit<WorkoutEntry, 'id'>) => {
    const entry: WorkoutEntry = { ...w, id: uid('w_') };
    setState((s) => {
      const history = { ...s.exerciseHistory };
      for (const ex of entry.exercises ?? []) {
        if (!ex.sets || ex.sets.length === 0) continue;
        // Pick the "top" set: heaviest, then most reps.
        const top = ex.sets.reduce((best, st) => {
          const w1 = st.weightKg ?? 0;
          const w0 = best.weightKg ?? 0;
          if (w1 > w0) return st;
          if (w1 === w0 && st.reps > best.reps) return st;
          return best;
        }, ex.sets[0]);
        const key = ex.name.trim().toLowerCase();
        const prev = history[key];
        const best = Math.max(prev?.bestWeightKg ?? 0, top.weightKg ?? 0);
        history[key] = {
          name: ex.name,
          lastWeightKg: top.weightKg,
          lastReps: top.reps,
          bestWeightKg: best > 0 ? best : undefined,
          sessions: (prev?.sessions ?? 0) + 1,
          updatedAt: new Date().toISOString(),
        };
      }
      return { ...s, workouts: [entry, ...s.workouts], exerciseHistory: history };
    });
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

  const logWeight = useCallback((weightKg: number, dateKey?: string) => {
    setState((s) => {
      const key = dateKey ?? todayKey();
      const loggedAt = stampForDate(key);
      // One entry per day: replace any existing entry on that day.
      const others = s.weightLogs.filter((w) => dateKeyOf(w.loggedAt) !== key);
      const entry: WeightEntry = { id: uid('wt_'), loggedAt, weightKg };
      const weightLogs = [entry, ...others].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
      // Keep current weight + nutrition targets in sync with the latest entry.
      let profile = s.profile;
      if (profile) {
        const latest = weightLogs[0]?.weightKg ?? weightKg;
        const targets = computeTargets({
          sex: profile.sex,
          weightKg: latest,
          heightCm: profile.heightCm,
          age: ageFromBirthYear(profile.birthYear),
          activityLevel: profile.activityLevel,
          goal: profile.goal,
        });
        profile = { ...profile, weightKg: latest, targets };
      }
      return { ...s, weightLogs, profile };
    });
  }, []);

  const removeWeightLog = useCallback((id: string) => {
    setState((s) => ({ ...s, weightLogs: s.weightLogs.filter((w) => w.id !== id) }));
  }, []);

  const addEquipment = useCallback((e: Omit<Equipment, 'id'>, location: WorkoutLocation = 'gym') => {
    const entry: Equipment = { ...e, id: uid('eq_') };
    setState((s) => ({
      ...s,
      customEquipment: [entry, ...s.customEquipment],
      gymEquipmentIds: location === 'gym' ? [...s.gymEquipmentIds, entry.id] : s.gymEquipmentIds,
      homeEquipmentIds: location === 'home' ? [...s.homeEquipmentIds, entry.id] : s.homeEquipmentIds,
    }));
    return entry;
  }, []);

  const removeEquipment = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      customEquipment: s.customEquipment.filter((x) => x.id !== id),
      gymEquipmentIds: s.gymEquipmentIds.filter((x) => x !== id),
      homeEquipmentIds: s.homeEquipmentIds.filter((x) => x !== id),
    }));
  }, []);

  const toggleEquipment = useCallback((id: string, location: WorkoutLocation) => {
    setState((s) => {
      const key = location === 'home' ? 'homeEquipmentIds' : 'gymEquipmentIds';
      const list = s[key];
      const nextList = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      return { ...s, [key]: nextList };
    });
  }, []);

  const foodsForDate = useCallback(
    (dateKey: string) => state.foods.filter((f) => dateKeyOf(f.loggedAt) === dateKey),
    [state.foods],
  );
  const workoutsForDate = useCallback(
    (dateKey: string) => state.workouts.filter((w) => dateKeyOf(w.performedAt) === dateKey),
    [state.workouts],
  );
  const nutritionForDate = useCallback(
    (dateKey: string) =>
      foodsForDate(dateKey).reduce((acc, f) => addNutrients(acc, f.nutrients, f.servings), emptyNutrients()),
    [foodsForDate],
  );
  const todaysFoods = useCallback(() => foodsForDate(todayKey()), [foodsForDate]);
  const todaysWorkouts = useCallback(() => workoutsForDate(todayKey()), [workoutsForDate]);
  const todaysNutrition = useCallback(() => nutritionForDate(todayKey()), [nutritionForDate]);

  const snapshot = useMemo<SyncableState>(
    () => ({
      profile: state.profile,
      workouts: state.workouts,
      foods: state.foods,
      supplements: state.supplements,
      supplementLogs: state.supplementLogs,
      customEquipment: state.customEquipment,
      gymEquipmentIds: state.gymEquipmentIds,
      homeEquipmentIds: state.homeEquipmentIds,
      exerciseHistory: state.exerciseHistory,
      weightLogs: state.weightLogs,
    }),
    [
      state.profile,
      state.workouts,
      state.foods,
      state.supplements,
      state.supplementLogs,
      state.customEquipment,
      state.gymEquipmentIds,
      state.homeEquipmentIds,
      state.exerciseHistory,
      state.weightLogs,
    ],
  );

  const value = useMemo<AppStoreValue>(
    () => ({
      ...state,
      ready,
      snapshot,
      hydrate,
      setGuestMode,
      setHealthEnabled,
      activePlan,
      setActivePlan,
      selectedDate,
      setSelectedDate,
      dateStamp,
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
      logWeight,
      removeWeightLog,
      addEquipment,
      removeEquipment,
      toggleEquipment,
      foodsForDate,
      workoutsForDate,
      nutritionForDate,
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
      setHealthEnabled,
      activePlan,
      selectedDate,
      dateStamp,
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
      logWeight,
      removeWeightLog,
      addEquipment,
      removeEquipment,
      toggleEquipment,
      foodsForDate,
      workoutsForDate,
      nutritionForDate,
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
