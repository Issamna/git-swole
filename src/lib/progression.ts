import { STARTING_WEIGHTS } from "@/lib/program";
import { ExerciseKey, ProgressionState, WorkoutExerciseLog, WorkoutType } from "@/lib/types";

const INITIAL_FAIL_STREAKS: Record<ExerciseKey, number> = {
  squat: 0,
  bench_press: 0,
  barbell_row: 0,
  overhead_press: 0,
  deadlift: 0,
};

export const DEFAULT_PROGRESSION: ProgressionState = {
  nextWorkoutType: "A",
  currentWeights: { ...STARTING_WEIGHTS },
  failStreaks: { ...INITIAL_FAIL_STREAKS },
};

function getIncrement(exerciseKey: ExerciseKey, baseIncrement: number) {
  return exerciseKey === "deadlift" ? baseIncrement * 2 : baseIncrement;
}

function didExerciseSucceed(exercise: WorkoutExerciseLog) {
  return exercise.setResults.every((setResult) => {
    if (setResult.skipped) {
      return false;
    }
    return setResult.completed && setResult.completedReps >= setResult.targetReps;
  });
}

export function getNextWorkoutType(currentType: WorkoutType): WorkoutType {
  return currentType === "A" ? "B" : "A";
}

export function applyWorkoutProgression(
  previous: ProgressionState,
  exerciseLogs: WorkoutExerciseLog[],
  baseIncrement: number,
): ProgressionState {
  const nextWeights = { ...previous.currentWeights };
  const nextFailStreaks = { ...previous.failStreaks };

  for (const exerciseLog of exerciseLogs) {
    if (!exerciseLog.exerciseKey) {
      continue;
    }
    const succeeded = didExerciseSucceed(exerciseLog);
    const key = exerciseLog.exerciseKey;

    if (succeeded) {
      const increment = getIncrement(key, baseIncrement);
      nextWeights[key] = Number((nextWeights[key] + increment).toFixed(2));
      nextFailStreaks[key] = 0;
      continue;
    }

    nextFailStreaks[key] += 1;

    if (nextFailStreaks[key] >= 3) {
      nextWeights[key] = Number((nextWeights[key] * 0.9).toFixed(2));
      nextFailStreaks[key] = 0;
    }
  }

  return {
    currentWeights: nextWeights,
    failStreaks: nextFailStreaks,
    nextWorkoutType: getNextWorkoutType(previous.nextWorkoutType),
  };
}
