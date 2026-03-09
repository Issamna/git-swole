import { DEFAULT_PROGRESSION } from "@/lib/progression";
import { ExerciseKey, WorkoutAppState, WorkoutLog } from "@/lib/types";
import { getSupabaseClient } from "@/lib/supabase";

export const LOCAL_STATE_KEY = "git-swole-state-v1";

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

export async function syncFromSupabase(userId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const [progressionRes, settingsRes, workoutsRes] = await Promise.all([
    supabase.from("progression").select("*").eq("user_id", userId).single(),
    supabase.from("users").select("*").eq("id", userId).single(),
    supabase
      .from("workouts")
      .select("id,date,workout_type,note,workout_sets(exercise_key,weight,reps,completed,set_number)")
      .eq("user_id", userId)
      .order("date", { ascending: false }),
  ]);

  if (progressionRes.error || settingsRes.error || workoutsRes.error) {
    return null;
  }

  const logs: WorkoutLog[] = (workoutsRes.data ?? []).map((workout) => {
    const grouped = new Map<string, WorkoutLog["exercises"][number]>();
    for (const set of workout.workout_sets ?? []) {
      const existing = grouped.get(set.exercise_key);
      if (!existing) {
        grouped.set(set.exercise_key, {
          exerciseKey: set.exercise_key,
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
    return {
      id: workout.id,
      userId,
      date: workout.date,
      workoutType: workout.workout_type,
      workoutNote: workout.note ?? undefined,
      exercises: [...grouped.values()],
    };
  });

  return {
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
  } as WorkoutAppState;
}

export async function persistSupabaseState(userId: string, state: WorkoutAppState) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  await Promise.all([
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
}

export async function persistWorkoutToSupabase(workout: WorkoutLog) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  await supabase.from("workouts").upsert({
    id: workout.id,
    user_id: workout.userId,
    date: workout.date,
    workout_type: workout.workoutType,
    note: workout.workoutNote ?? null,
  });

  const setRows = workout.exercises.flatMap((exercise) =>
    exercise.setResults.map((setResult) => ({
      workout_id: workout.id,
      exercise_key: exercise.exerciseKey,
      set_number: setResult.setNumber,
      reps: setResult.completedReps,
      weight: exercise.weight,
      completed: setResult.completed && !setResult.skipped,
    })),
  );

  if (setRows.length > 0) {
    await supabase.from("workout_sets").insert(setRows);
  }
}

export async function deleteWorkoutFromSupabase(workoutId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }
  await supabase.from("workouts").delete().eq("id", workoutId);
}

export async function replaceWorkoutSetsInSupabase(workout: WorkoutLog) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }
  await supabase.from("workout_sets").delete().eq("workout_id", workout.id);
  const setRows = workout.exercises.flatMap((exercise) =>
    exercise.setResults.map((setResult) => ({
      workout_id: workout.id,
      exercise_key: exercise.exerciseKey,
      set_number: setResult.setNumber,
      reps: setResult.completedReps,
      weight: exercise.weight,
      completed: setResult.completed && !setResult.skipped,
    })),
  );
  if (setRows.length > 0) {
    await supabase.from("workout_sets").insert(setRows);
  }
}
