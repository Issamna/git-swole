"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_PROGRESSION } from "@/lib/progression";
import { applyWorkoutProgression } from "@/lib/progression";
import { ImportedWorkoutDraft } from "@/lib/importer";
import { EXERCISE_BY_KEY } from "@/lib/program";
import {
  DEFAULT_APP_STATE,
  deleteWorkoutFromSupabase,
  fetchExercisesFromSupabase,
  loadLocalState,
  persistLocalState,
  persistWorkoutToSupabase,
  persistSupabaseState,
  replaceWorkoutSetsInSupabase,
  syncFromSupabase,
  upsertUserExerciseInSupabase,
} from "@/lib/storage";
import {
  AppSettings,
  ExerciseCatalogItem,
  ExerciseKey,
  PersonalRecord,
  WorkoutExerciseLog,
  WorkoutLog,
  WorkoutSummary,
} from "@/lib/types";

type WorkoutAppContextValue = {
  stateLoaded: boolean;
  syncStatus: "local" | "syncing" | "synced" | "error";
  syncError: string | null;
  nextWorkoutType: "A" | "B";
  settings: AppSettings;
  nextWorkoutExercises: { exerciseKey: ExerciseKey; sets: number; reps: number }[];
  currentWeights: Record<ExerciseKey, number>;
  exerciseCatalog: ExerciseCatalogItem[];
  workoutLogs: WorkoutLog[];
  personalRecords: PersonalRecord[];
  completeWorkout: (params: {
    exercises: WorkoutExerciseLog[];
    note?: string;
    summary?: WorkoutSummary;
  }) => void;
  updateSettings: (nextSettings: Partial<AppSettings>) => void;
  deleteWorkout: (workoutId: string) => void;
  updateWorkout: (updatedWorkout: WorkoutLog) => void;
  createOrUpdateUserExercise: (
    input: Omit<ExerciseCatalogItem, "id" | "ownership" | "slug"> & { slug?: string },
  ) => Promise<{ ok: boolean; error?: string }>;
  importWorkouts: (workouts: ImportedWorkoutDraft[]) => Promise<{ imported: number; skipped: number }>;
};

const WorkoutAppContext = createContext<WorkoutAppContextValue | null>(null);
const SYNC_TIMEOUT_MS = 10000;

function computePersonalRecords(logs: WorkoutLog[]): PersonalRecord[] {
  const records = new Map<ExerciseKey, PersonalRecord>();

  for (const workout of logs) {
    for (const exercise of workout.exercises) {
      if (!exercise.exerciseKey) {
        continue;
      }
      const existing = records.get(exercise.exerciseKey);
      const totalVolume = exercise.setResults.reduce(
        (sum, setResult) => sum + setResult.completedReps * exercise.weight,
        0,
      );
      const bestSetReps = Math.max(...exercise.setResults.map((setResult) => setResult.completedReps));

      if (!existing) {
        records.set(exercise.exerciseKey, {
          exerciseKey: exercise.exerciseKey,
          maxWeight: exercise.weight,
          bestVolume: totalVolume,
          bestSetReps,
        });
        continue;
      }

      existing.maxWeight = Math.max(existing.maxWeight, exercise.weight);
      existing.bestVolume = Math.max(existing.bestVolume, totalVolume);
      existing.bestSetReps = Math.max(existing.bestSetReps, bestSetReps);
    }
  }

  return [...records.values()];
}

function summarizeWorkout(exercises: WorkoutExerciseLog[]): WorkoutSummary {
  const allSuccessful = exercises.every((exercise) =>
    exercise.setResults.every(
      (setResult) => !setResult.skipped && setResult.completed && setResult.completedReps >= setResult.targetReps,
    ),
  );
  return allSuccessful ? "up" : "down";
}

function recomputeProgressionFromLogs(logs: WorkoutLog[], increment: number) {
  if (logs.length === 0) {
    return DEFAULT_PROGRESSION;
  }

  const ascending = [...logs].sort((a, b) => (a.date > b.date ? 1 : -1));
  let progression = { ...DEFAULT_PROGRESSION };

  for (const workout of ascending) {
    progression = applyWorkoutProgression(
      {
        ...progression,
        nextWorkoutType: workout.workoutType,
      },
      workout.exercises,
      increment,
    );
  }

  return progression;
}

function buildWorkoutFingerprint(workout: {
  date: string;
  workoutType: WorkoutLog["workoutType"];
  exercises: WorkoutLog["exercises"];
}) {
  const compactExercises = [...workout.exercises]
    .sort((a, b) => (a.exerciseName || "").localeCompare(b.exerciseName || ""))
    .map((exercise) => ({
      exerciseKey: exercise.exerciseKey ?? null,
      exerciseName: exercise.exerciseName,
      weight: Number(exercise.weight.toFixed(2)),
      sets: exercise.setResults.map((setResult) => ({
        reps: setResult.completedReps,
        target: setResult.targetReps,
        skipped: setResult.skipped,
      })),
    }));

  return JSON.stringify({
    date: workout.date.slice(0, 10),
    workoutType: workout.workoutType,
    exercises: compactExercises,
  });
}

export function WorkoutAppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [state, setState] = useState(DEFAULT_APP_STATE);
  const [stateLoaded, setStateLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"local" | "syncing" | "synced" | "error">("local");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [exerciseCatalog, setExerciseCatalog] = useState<ExerciseCatalogItem[]>([]);

  const getSupabaseToken = useCallback(async () => {
    try {
      // Preferred for Clerk+Supabase JWKS integration.
      const sessionToken = await getToken();
      if (sessionToken) {
        return sessionToken;
      }
    } catch (error) {
      console.warn("Failed to retrieve Clerk session token for Supabase sync.", error);
    }

    try {
      // Backward compatibility for template-based setups.
      const templateToken = await getToken({ template: "supabase" });
      if (templateToken) {
        return templateToken;
      }
    } catch (error) {
      console.warn("Failed to retrieve Clerk 'supabase' template token.", error);
    }

    const message =
      "Could not get Clerk token for Supabase. If using JWKS, verify Clerk is configured as Supabase JWT provider.";
    setSyncStatus("error");
    setSyncError(message);
    return null;
  }, [getToken]);

  const runSupabaseTask = useCallback(
    async (task: (token: string) => Promise<{ ok: boolean; error?: string }>) => {
      const token = await getSupabaseToken();
      if (!token) {
        return;
      }
      setSyncStatus("syncing");
      setSyncError(null);
      try {
        const result = await Promise.race([
          task(token),
          new Promise<{ ok: false; error: string }>((resolve) => {
            window.setTimeout(() => resolve({ ok: false, error: "Sync timed out after 10 seconds." }), SYNC_TIMEOUT_MS);
          }),
        ]);
        if (result.ok) {
          setSyncStatus("synced");
          setSyncError(null);
        } else {
          setSyncStatus("error");
          setSyncError(result.error || "Sync failed.");
        }
      } catch (error) {
        console.error("Supabase task failed", error);
        setSyncStatus("error");
        setSyncError(error instanceof Error ? error.message : "Unexpected sync task failure.");
      }
    },
    [getSupabaseToken],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const localState = loadLocalState();
      setState(localState);
      setStateLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!stateLoaded || !user?.id) {
      return;
    }

    void (async () => {
      setSyncStatus("syncing");
      setSyncError(null);
      const token = await getSupabaseToken();
      if (!token) return;
      try {
        const result = await Promise.race([
          syncFromSupabase(user.id, token),
          new Promise<{ ok: false; error: string }>((resolve) => {
            window.setTimeout(() => resolve({ ok: false, error: "Initial sync timed out after 10 seconds." }), SYNC_TIMEOUT_MS);
          }),
        ]);
        if (!result.ok || !result.data) {
          setSyncStatus("error");
          setSyncError(!result.ok ? result.error : "Initial sync failed.");
          return;
        }
        setState(result.data);
        setSyncStatus("synced");
        setSyncError(null);
      } catch (error) {
        console.error("Initial Supabase sync failed", error);
        setSyncStatus("error");
        setSyncError(error instanceof Error ? error.message : "Unexpected initial sync failure.");
      }
    })();
  }, [getSupabaseToken, stateLoaded, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    void (async () => {
      const token = await getSupabaseToken();
      if (!token) return;
      const result = await fetchExercisesFromSupabase(user.id, token);
      if (result.ok && result.data) {
        setExerciseCatalog(result.data);
      }
    })();
  }, [getSupabaseToken, user?.id]);

  useEffect(() => {
    if (!stateLoaded) {
      return;
    }
    persistLocalState(state);
    if (user?.id) {
      void (async () => {
        const token = await getSupabaseToken();
        if (!token) {
          return;
        }
        try {
          const result = await Promise.race([
            persistSupabaseState(user.id, state, token),
            new Promise<{ ok: false; error: string }>((resolve) => {
              window.setTimeout(() => resolve({ ok: false, error: "State sync timed out after 10 seconds." }), SYNC_TIMEOUT_MS);
            }),
          ]);
          if (result.ok) {
            setSyncStatus("synced");
            setSyncError(null);
          } else {
            setSyncStatus("error");
            setSyncError(result.error || "State sync failed.");
          }
        } catch (error) {
          console.error("Supabase state persist task failed", error);
          setSyncStatus("error");
          setSyncError(error instanceof Error ? error.message : "Unexpected state sync failure.");
        }
      })();
    }
  }, [getSupabaseToken, state, stateLoaded, user?.id]);

  const nextWorkoutExercises = useMemo(() => {
    if (state.progression.nextWorkoutType === "A") {
      return state.settings.workoutAExercises.map((exerciseKey, idx) => ({
        exerciseKey,
        sets: idx === 2 && exerciseKey === "deadlift" ? 1 : 5,
        reps: 5,
      }));
    }
    return state.settings.workoutBExercises.map((exerciseKey, idx) => ({
      exerciseKey,
      sets: idx === 2 && exerciseKey === "deadlift" ? 1 : 5,
      reps: 5,
    }));
  }, [state.progression.nextWorkoutType, state.settings.workoutAExercises, state.settings.workoutBExercises]);

  const completeWorkout = ({
    exercises,
    note,
    summary,
  }: {
    exercises: WorkoutExerciseLog[];
    note?: string;
    summary?: WorkoutSummary;
  }) => {
    const nextLog: WorkoutLog = {
      id: crypto.randomUUID(),
      userId: user?.id ?? "local",
      date: new Date().toISOString(),
      workoutType: state.progression.nextWorkoutType,
      workoutNote: note,
      workoutSummary: summary,
      exercises,
    };

    if (user?.id) {
      void runSupabaseTask((token) => persistWorkoutToSupabase(nextLog, token));
    }

    setState((previous) => {
      const nextProgression = applyWorkoutProgression(
        previous.progression,
        exercises,
        previous.settings.weightIncrement,
      );
      return {
        ...previous,
        progression: nextProgression,
        workoutLogs: [nextLog, ...previous.workoutLogs],
      };
    });
  };

  const updateSettings = (nextSettings: Partial<AppSettings>) => {
    setState((previous) => ({
      ...previous,
      settings: {
        ...previous.settings,
        ...nextSettings,
      },
    }));
  };

  const deleteWorkout = (workoutId: string) => {
    if (user?.id) {
      void runSupabaseTask((token) => deleteWorkoutFromSupabase(workoutId, token));
    }
    setState((previous) => ({
      ...previous,
      workoutLogs: previous.workoutLogs.filter((workout) => workout.id !== workoutId),
    }));
  };

  const updateWorkout = (updatedWorkout: WorkoutLog) => {
    if (user?.id) {
      void runSupabaseTask((token) => replaceWorkoutSetsInSupabase(updatedWorkout, token));
    }
    setState((previous) => ({
      ...previous,
      workoutLogs: previous.workoutLogs.map((workout) =>
        workout.id === updatedWorkout.id ? updatedWorkout : workout,
      ),
    }));
  };

  const importWorkouts = async (workouts: ImportedWorkoutDraft[]) => {
    if (workouts.length === 0) {
      return { imported: 0, skipped: 0 };
    }

    const existingFingerprintSet = new Set(state.workoutLogs.map((workout) => buildWorkoutFingerprint(workout)));

    const importedLogs: WorkoutLog[] = [];
    for (const workout of workouts) {
      const resolvedExercises: WorkoutExerciseLog[] = [];
      for (const exercise of workout.exercises) {
        const existingCatalog = exerciseCatalog.find(
          (item) => item.name.toLowerCase() === exercise.exerciseName.toLowerCase(),
        );

        if (existingCatalog) {
          resolvedExercises.push({
            ...exercise,
            exerciseId: existingCatalog.id,
          });
          continue;
        }

        if (!user?.id) {
          resolvedExercises.push(exercise);
          continue;
        }

        const token = await getSupabaseToken();
        if (!token) {
          resolvedExercises.push(exercise);
          continue;
        }

        const created = await upsertUserExerciseInSupabase(
          user.id,
          {
            name: exercise.exerciseName,
            primaryMuscle: "Unknown",
            secondaryMuscles: [],
            equipment: "Unknown",
            movementPattern: "Unknown",
            description: "Imported from workout history",
          },
          token,
        );
        if (created.ok && created.data) {
          setExerciseCatalog((previous) => {
            const exists = previous.some((item) => item.id === created.data!.id);
            return exists ? previous : [...previous, created.data!];
          });
          resolvedExercises.push({
            ...exercise,
            exerciseId: created.data.id,
          });
        } else {
          resolvedExercises.push(exercise);
        }
      }

      const nextLog: WorkoutLog = {
        id: crypto.randomUUID(),
        userId: user?.id ?? "local",
        date: workout.date,
        workoutType: workout.workoutType,
        workoutNote: workout.workoutNote,
        workoutSummary: summarizeWorkout(resolvedExercises),
        exercises: resolvedExercises,
      };
      const fingerprint = buildWorkoutFingerprint(nextLog);
      if (existingFingerprintSet.has(fingerprint)) {
        continue;
      }
      existingFingerprintSet.add(fingerprint);
      importedLogs.push(nextLog);
    }

    if (importedLogs.length === 0) {
      return { imported: 0, skipped: workouts.length };
    }

    const mergedLogs = [...importedLogs, ...state.workoutLogs].sort((a, b) => (a.date > b.date ? -1 : 1));
    const nextProgression = recomputeProgressionFromLogs(mergedLogs, state.settings.weightIncrement);

    setState((previous) => ({
      ...previous,
      workoutLogs: mergedLogs,
      progression: nextProgression,
    }));

    if (user?.id) {
      await runSupabaseTask(async (token) => {
        for (const workout of importedLogs) {
          const result = await persistWorkoutToSupabase(workout, token);
          if (!result.ok) {
            return result;
          }
        }
        const progressionSync = await persistSupabaseState(
          user.id,
          {
            ...state,
            workoutLogs: mergedLogs,
            progression: nextProgression,
          },
          token,
        );
        return progressionSync;
      });
    }

    return {
      imported: importedLogs.length,
      skipped: workouts.length - importedLogs.length,
    };
  };

  const createOrUpdateUserExercise = async (
    input: Omit<ExerciseCatalogItem, "id" | "ownership" | "slug"> & { slug?: string },
  ) => {
    if (!user?.id) {
      return { ok: false, error: "You must be signed in to manage custom exercises." };
    }
    const token = await getSupabaseToken();
    if (!token) {
      return { ok: false, error: "No Supabase auth token available." };
    }
    const result = await upsertUserExerciseInSupabase(user.id, input, token);
    if (!result.ok || !result.data) {
      return { ok: false, error: !result.ok ? result.error : "Unable to save exercise." };
    }
    setExerciseCatalog((previous) => {
      const without = previous.filter((item) => item.id !== result.data!.id);
      return [...without, result.data!].sort((a, b) => a.name.localeCompare(b.name));
    });
    return { ok: true };
  };

  const personalRecords = useMemo(() => computePersonalRecords(state.workoutLogs), [state.workoutLogs]);

  const value: WorkoutAppContextValue = {
    stateLoaded,
    syncStatus,
    syncError,
    nextWorkoutType: state.progression.nextWorkoutType,
    settings: state.settings,
    nextWorkoutExercises,
    currentWeights: state.progression.currentWeights,
    exerciseCatalog,
    workoutLogs: state.workoutLogs,
    personalRecords,
    completeWorkout,
    updateSettings,
    deleteWorkout,
    updateWorkout,
    createOrUpdateUserExercise,
    importWorkouts,
  };

  return <WorkoutAppContext.Provider value={value}>{children}</WorkoutAppContext.Provider>;
}

export function useWorkoutApp() {
  const context = useContext(WorkoutAppContext);
  if (!context) {
    throw new Error("useWorkoutApp must be used within WorkoutAppProvider");
  }
  return context;
}

export function getExerciseName(exerciseKey?: ExerciseKey, fallbackName?: string) {
  if (exerciseKey) {
    return EXERCISE_BY_KEY[exerciseKey].name;
  }
  return fallbackName ?? "Unknown Exercise";
}
