export type ExerciseKey =
  | "squat"
  | "bench_press"
  | "barbell_row"
  | "overhead_press"
  | "deadlift";

export type WorkoutType = string;
export type WeightUnit = "lb" | "kg";
export type WorkoutSummary = "up" | "down";
export type ExerciseOwnership = "global" | "user";

export type ExerciseDefinition = {
  key: ExerciseKey;
  name: string;
  muscleGroup: string;
  instructions: string;
  imageUrl?: string;
};

export type ExerciseCatalogItem = {
  id: string;
  slug: string;
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  movementPattern: string;
  description: string;
  ownership: ExerciseOwnership;
};

export type ProgramExercise = {
  exerciseId: string;
  sets: number;
  reps: number;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  exercises: ProgramExercise[];
};

export type WorkoutSetResult = {
  setNumber: number;
  targetReps: number;
  completedReps: number;
  completed: boolean;
  skipped: boolean;
};

export type WorkoutExerciseLog = {
  exerciseKey?: ExerciseKey;
  exerciseName: string;
  exerciseId?: string;
  weight: number;
  setResults: WorkoutSetResult[];
  note?: string;
};

export type WorkoutLog = {
  id: string;
  userId: string;
  date: string;
  workoutType: WorkoutType;
  workoutNote?: string;
  workoutSummary?: WorkoutSummary;
  exercises: WorkoutExerciseLog[];
};

export type ProgressionState = {
  nextWorkoutType: WorkoutType;
  currentWeights: Record<ExerciseKey, number>;
  failStreaks: Record<ExerciseKey, number>;
};

export type AppSettings = {
  units: WeightUnit;
  weightIncrement: 2.5 | 5 | 10;
  restTimerSeconds: number;
  barbellWeight: number;
  workoutGroups: WorkoutTemplate[];
};

export type PersonalRecord = {
  exerciseKey: ExerciseKey;
  maxWeight: number;
  bestVolume: number;
  bestSetReps: number;
};

export type WorkoutAppState = {
  settings: AppSettings;
  progression: ProgressionState;
  workoutLogs: WorkoutLog[];
};
