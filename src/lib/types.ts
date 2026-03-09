export type ExerciseKey =
  | "squat"
  | "bench_press"
  | "barbell_row"
  | "overhead_press"
  | "deadlift";

export type WorkoutType = "A" | "B";
export type WeightUnit = "lb" | "kg";
export type WorkoutSummary = "up" | "down";

export type ExerciseDefinition = {
  key: ExerciseKey;
  name: string;
  muscleGroup: string;
  instructions: string;
  imageUrl?: string;
};

export type ProgramExercise = {
  exerciseKey: ExerciseKey;
  sets: number;
  reps: number;
};

export type WorkoutTemplate = {
  type: WorkoutType;
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
  exerciseKey: ExerciseKey;
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
  // Lets user adjust program slots while keeping workout A/B structure.
  workoutAExercises: ExerciseKey[];
  workoutBExercises: ExerciseKey[];
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
