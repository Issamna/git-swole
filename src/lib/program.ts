import { ExerciseDefinition, ExerciseKey, WorkoutTemplate } from "@/lib/types";

export const EXERCISES: ExerciseDefinition[] = [
  {
    key: "squat",
    name: "Squat",
    muscleGroup: "Legs",
    instructions: "Brace core, break at hips and knees, drive up through mid-foot.",
  },
  {
    key: "bench_press",
    name: "Bench Press",
    muscleGroup: "Chest",
    instructions: "Set shoulder blades, touch lower chest, press with stable bar path.",
  },
  {
    key: "barbell_row",
    name: "Barbell Row",
    muscleGroup: "Back",
    instructions: "Hinge torso, keep back tight, pull bar to lower ribs with control.",
  },
  {
    key: "overhead_press",
    name: "Overhead Press",
    muscleGroup: "Shoulders",
    instructions: "Squeeze glutes, press bar overhead in a vertical path.",
  },
  {
    key: "deadlift",
    name: "Deadlift",
    muscleGroup: "Posterior Chain",
    instructions: "Pull slack, push floor away, lock out with hips and lats tight.",
  },
];

export const EXERCISE_BY_KEY = Object.fromEntries(
  EXERCISES.map((exercise) => [exercise.key, exercise]),
) as Record<ExerciseKey, ExerciseDefinition>;

export const DEFAULT_WORKOUT_A: WorkoutTemplate = {
  type: "A",
  name: "Workout A",
  exercises: [
    { exerciseKey: "squat", sets: 5, reps: 5 },
    { exerciseKey: "bench_press", sets: 5, reps: 5 },
    { exerciseKey: "barbell_row", sets: 5, reps: 5 },
  ],
};

export const DEFAULT_WORKOUT_B: WorkoutTemplate = {
  type: "B",
  name: "Workout B",
  exercises: [
    { exerciseKey: "squat", sets: 5, reps: 5 },
    { exerciseKey: "overhead_press", sets: 5, reps: 5 },
    { exerciseKey: "deadlift", sets: 1, reps: 5 },
  ],
};

export const STARTING_WEIGHTS: Record<ExerciseKey, number> = {
  squat: 45,
  bench_press: 45,
  barbell_row: 65,
  overhead_press: 45,
  deadlift: 95,
};
