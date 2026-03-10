import { DEFAULT_PROGRESSION } from "@/lib/progression";
import {
  ExerciseCatalogItem,
  ExerciseKey,
  WorkoutAppState,
  WorkoutLog,
  WorkoutSummary,
} from "@/lib/types";
import { getSupabaseClient } from "@/lib/supabase";
import { EXERCISE_BY_KEY } from "@/lib/program";

export const LOCAL_STATE_KEY = "git-swole-state-v1";
export type SyncResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export const DEFAULT_APP_STATE: WorkoutAppState = {
  settings: {
    units: "lb",
    weightIncrement: 5,
    restTimerSeconds: 90,
    barbellWeight: 45,
    workoutAExercises: ["squat", "bench_press", "barbell_row"],
    workoutBExercises: ["squat", "overhead_press", "deadlift"],
  },
  progression: DEFAULT_PROGRESSION,
  workoutLogs: [],
};

function serializeWorkoutNote(note?: string, summary?: WorkoutSummary) {
  if (!summary) {
    return note ?? null;
  }
  const normalizedNote = note?.trim();
  return `[[SUMMARY:${summary.toUpperCase()}]]${normalizedNote ? `\n${normalizedNote}` : ""}`;
}

function parseWorkoutNote(raw: string | null): { workoutNote?: string; workoutSummary?: WorkoutSummary } {
  if (!raw) {
    return {};
  }

  const match = raw.match(/^\[\[SUMMARY:(UP|DOWN)\]\](?:\n([\s\S]*))?$/);
  if (!match) {
    return { workoutNote: raw };
  }

  const summary = match[1].toLowerCase() as WorkoutSummary;
  const noteBody = match[2]?.trim();
  return {
    workoutSummary: summary,
    workoutNote: noteBody || undefined,
  };
}

function normalizeExerciseSelection(
  exercises: ExerciseKey[],
  fallback: ExerciseKey[],
): ExerciseKey[] {
  if (exercises.length !== 3) {
    return fallback;
  }
  return exercises;
}

export function loadLocalState(): WorkoutAppState {
  if (typeof window === "undefined") {
    return DEFAULT_APP_STATE;
  }

  const raw = window.localStorage.getItem(LOCAL_STATE_KEY);
  if (!raw) {
    return DEFAULT_APP_STATE;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WorkoutAppState>;
    return {
      settings: {
        ...DEFAULT_APP_STATE.settings,
        ...parsed.settings,
        workoutAExercises: normalizeExerciseSelection(
          parsed.settings?.workoutAExercises ?? [],
          DEFAULT_APP_STATE.settings.workoutAExercises,
        ),
        workoutBExercises: normalizeExerciseSelection(
          parsed.settings?.workoutBExercises ?? [],
          DEFAULT_APP_STATE.settings.workoutBExercises,
        ),
      },
      progression: {
        ...DEFAULT_APP_STATE.progression,
        ...parsed.progression,
        currentWeights: {
          ...DEFAULT_APP_STATE.progression.currentWeights,
          ...parsed.progression?.currentWeights,
        },
        failStreaks: {
          ...DEFAULT_APP_STATE.progression.failStreaks,
          ...parsed.progression?.failStreaks,
        },
      },
      workoutLogs: parsed.workoutLogs ?? [],
    };
  } catch {
    return DEFAULT_APP_STATE;
  }
}

export function persistLocalState(state: WorkoutAppState) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state));
}

export async function syncFromSupabase(
  userId: string,
  accessToken?: string,
): Promise<SyncResult<WorkoutAppState>> {
  try {
    const supabase = getSupabaseClient(accessToken);
    if (!supabase) {
      return { ok: false, error: "Supabase client is not configured." };
    }

    const [progressionRes, settingsRes, workoutsRes] = await Promise.all([
      supabase.from("progression").select("*").eq("user_id", userId).single(),
      supabase.from("users").select("*").eq("id", userId).single(),
      supabase
        .from("workouts")
      .select("id,date,workout_type,note,workout_sets(exercise_id,exercise_key,exercise_name,weight,reps,completed,set_number)")
        .eq("user_id", userId)
        .order("date", { ascending: false }),
    ]);

    if (progressionRes.error || settingsRes.error || workoutsRes.error) {
      const reason =
        progressionRes.error?.message ??
        settingsRes.error?.message ??
        workoutsRes.error?.message ??
        "Unknown sync error.";
      console.error("Supabase sync failed", { progressionRes, settingsRes, workoutsRes });
      return { ok: false, error: reason };
    }

    const logs: WorkoutLog[] = (workoutsRes.data ?? []).map((workout) => {
      const grouped = new Map<string, WorkoutLog["exercises"][number]>();
      for (const set of workout.workout_sets ?? []) {
      const mapKey = set.exercise_id ?? set.exercise_key ?? set.exercise_name ?? `set-${set.set_number}`;
      const existing = grouped.get(mapKey);
        if (!existing) {
        grouped.set(mapKey, {
          exerciseKey: set.exercise_key ?? undefined,
          exerciseId: set.exercise_id ?? undefined,
          exerciseName:
            set.exercise_name ??
            (set.exercise_key ? EXERCISE_BY_KEY[set.exercise_key as ExerciseKey]?.name : undefined) ??
            "Unknown Exercise",
            weight: set.weight,
            setResults: [
              {
                setNumber: set.set_number,
                targetReps: 5,
                completedReps: set.reps,
                completed: set.completed,
                skipped: !set.completed,
              },
            ],
          });
        } else {
          existing.setResults.push({
            setNumber: set.set_number,
            targetReps: 5,
            completedReps: set.reps,
            completed: set.completed,
            skipped: !set.completed,
          });
        }
      }
      const noteParts = parseWorkoutNote(workout.note);
      return {
        id: workout.id,
        userId,
        date: workout.date,
        workoutType: workout.workout_type,
        workoutNote: noteParts.workoutNote,
        workoutSummary: noteParts.workoutSummary,
        exercises: [...grouped.values()],
      };
    });

    return {
      ok: true,
      data: {
      settings: {
        ...DEFAULT_APP_STATE.settings,
        units: settingsRes.data.units,
        weightIncrement: settingsRes.data.weight_increment,
        restTimerSeconds: settingsRes.data.rest_timer_seconds,
        barbellWeight: settingsRes.data.barbell_weight,
        workoutAExercises: settingsRes.data.workout_a_exercises,
        workoutBExercises: settingsRes.data.workout_b_exercises,
      },
      progression: {
        nextWorkoutType: progressionRes.data.next_workout_type,
        currentWeights: progressionRes.data.current_weights,
        failStreaks: progressionRes.data.fail_streaks,
      },
      workoutLogs: logs,
      } as WorkoutAppState,
    };
  } catch (error) {
    console.error("Supabase sync threw exception", error);
    return { ok: false, error: error instanceof Error ? error.message : "Unexpected sync exception." };
  }
}

export async function persistSupabaseState(
  userId: string,
  state: WorkoutAppState,
  accessToken?: string,
): Promise<SyncResult> {
  const supabase = getSupabaseClient(accessToken);
  if (!supabase) {
    return { ok: false, error: "Supabase client is not configured." };
  }

  const [usersUpsert, progressionUpsert] = await Promise.all([
    supabase.from("users").upsert({
      id: userId,
      units: state.settings.units,
      weight_increment: state.settings.weightIncrement,
      rest_timer_seconds: state.settings.restTimerSeconds,
      barbell_weight: state.settings.barbellWeight,
      workout_a_exercises: state.settings.workoutAExercises,
      workout_b_exercises: state.settings.workoutBExercises,
      updated_at: new Date().toISOString(),
    }),
    supabase.from("progression").upsert({
      user_id: userId,
      next_workout_type: state.progression.nextWorkoutType,
      current_weights: state.progression.currentWeights,
      fail_streaks: state.progression.failStreaks,
      updated_at: new Date().toISOString(),
    }),
  ]);

  if (usersUpsert.error || progressionUpsert.error) {
    console.error("Supabase state persist failed", {
      usersError: usersUpsert.error,
      progressionError: progressionUpsert.error,
    });
    return {
      ok: false,
      error: usersUpsert.error?.message ?? progressionUpsert.error?.message ?? "Failed to persist state.",
    };
  }
  return { ok: true };
}

export async function persistWorkoutToSupabase(
  workout: WorkoutLog,
  accessToken?: string,
): Promise<SyncResult> {
  const supabase = getSupabaseClient(accessToken);
  if (!supabase) {
    return { ok: false, error: "Supabase client is not configured." };
  }

  const workoutUpsert = await supabase.from("workouts").upsert({
    id: workout.id,
    user_id: workout.userId,
    date: workout.date,
    workout_type: workout.workoutType,
    note: serializeWorkoutNote(workout.workoutNote, workout.workoutSummary),
  });

  const setRows = workout.exercises.flatMap((exercise) =>
    exercise.setResults.map((setResult) => ({
      workout_id: workout.id,
      exercise_id: exercise.exerciseId ?? null,
      exercise_key: exercise.exerciseKey ?? null,
      exercise_name: exercise.exerciseName,
      set_number: setResult.setNumber,
      reps: setResult.completedReps,
      weight: exercise.weight,
      completed: setResult.completed && !setResult.skipped,
    })),
  );

  let setInsertError = null;
  if (setRows.length > 0) {
    const setInsert = await supabase.from("workout_sets").insert(setRows);
    setInsertError = setInsert.error;
  }

  if (workoutUpsert.error || setInsertError) {
    console.error("Supabase workout persist failed", {
      workoutError: workoutUpsert.error,
      setError: setInsertError,
    });
    return {
      ok: false,
      error: workoutUpsert.error?.message ?? setInsertError?.message ?? "Failed to persist workout.",
    };
  }
  return { ok: true };
}

export async function deleteWorkoutFromSupabase(
  workoutId: string,
  accessToken?: string,
): Promise<SyncResult> {
  const supabase = getSupabaseClient(accessToken);
  if (!supabase) {
    return { ok: false, error: "Supabase client is not configured." };
  }
  const deleted = await supabase.from("workouts").delete().eq("id", workoutId);
  if (deleted.error) {
    console.error("Supabase workout delete failed", deleted.error);
    return { ok: false, error: deleted.error.message };
  }
  return { ok: true };
}

export async function replaceWorkoutSetsInSupabase(
  workout: WorkoutLog,
  accessToken?: string,
): Promise<SyncResult> {
  const supabase = getSupabaseClient(accessToken);
  if (!supabase) {
    return { ok: false, error: "Supabase client is not configured." };
  }
  const deleted = await supabase.from("workout_sets").delete().eq("workout_id", workout.id);
  const setRows = workout.exercises.flatMap((exercise) =>
    exercise.setResults.map((setResult) => ({
      workout_id: workout.id,
      exercise_id: exercise.exerciseId ?? null,
      exercise_key: exercise.exerciseKey ?? null,
      exercise_name: exercise.exerciseName,
      set_number: setResult.setNumber,
      reps: setResult.completedReps,
      weight: exercise.weight,
      completed: setResult.completed && !setResult.skipped,
    })),
  );
  let insertError = null;
  if (setRows.length > 0) {
    const inserted = await supabase.from("workout_sets").insert(setRows);
    insertError = inserted.error;
  }

  if (deleted.error || insertError) {
    console.error("Supabase workout set replace failed", {
      deleteError: deleted.error,
      insertError,
    });
    return {
      ok: false,
      error: deleted.error?.message ?? insertError?.message ?? "Failed to replace workout sets.",
    };
  }
  return { ok: true };
}

export async function fetchExercisesFromSupabase(
  userId: string,
  accessToken?: string,
): Promise<SyncResult<ExerciseCatalogItem[]>> {
  const supabase = getSupabaseClient(accessToken);
  if (!supabase) {
    return { ok: false, error: "Supabase client is not configured." };
  }

  const { data, error } = await supabase
    .from("exercises")
    .select(
      "id,slug,name,primary_muscle,secondary_muscles,equipment,movement_pattern,description,is_global,created_by",
    )
    .or(`is_global.eq.true,created_by.eq.${userId}`)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    data: (data ?? []).map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      primaryMuscle: item.primary_muscle,
      secondaryMuscles: item.secondary_muscles ?? [],
      equipment: item.equipment,
      movementPattern: item.movement_pattern,
      description: item.description,
      ownership: item.is_global ? "global" : "user",
    })),
  };
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function upsertUserExerciseInSupabase(
  userId: string,
  input: Omit<ExerciseCatalogItem, "id" | "ownership" | "slug"> & { slug?: string },
  accessToken?: string,
): Promise<SyncResult<ExerciseCatalogItem>> {
  const supabase = getSupabaseClient(accessToken);
  if (!supabase) {
    return { ok: false, error: "Supabase client is not configured." };
  }

  const slug = input.slug?.trim() || `${slugify(input.name)}-${userId.slice(-6).toLowerCase()}`;
  const { data, error } = await supabase
    .from("exercises")
    .upsert(
      {
        slug,
        name: input.name,
        primary_muscle: input.primaryMuscle,
        secondary_muscles: input.secondaryMuscles,
        equipment: input.equipment,
        movement_pattern: input.movementPattern,
        description: input.description,
        is_global: false,
        created_by: userId,
        is_active: true,
      },
      { onConflict: "slug" },
    )
    .select(
      "id,slug,name,primary_muscle,secondary_muscles,equipment,movement_pattern,description,is_global,created_by",
    )
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to upsert user exercise." };
  }

  return {
    ok: true,
    data: {
      id: data.id,
      slug: data.slug,
      name: data.name,
      primaryMuscle: data.primary_muscle,
      secondaryMuscles: data.secondary_muscles ?? [],
      equipment: data.equipment,
      movementPattern: data.movement_pattern,
      description: data.description,
      ownership: "user",
    },
  };
}
