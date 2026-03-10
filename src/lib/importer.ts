import Papa from "papaparse";
import { ExerciseKey, WorkoutExerciseLog, WorkoutType } from "@/lib/types";

type CsvRow = Record<string, string | undefined>;

export type ImportedWorkoutDraft = {
  date: string;
  workoutType: WorkoutType;
  exercises: WorkoutExerciseLog[];
  workoutNote?: string;
};

export type ImportParseResult = {
  workouts: ImportedWorkoutDraft[];
  issues: string[];
};

const EXERCISE_NAME_MAP: Record<string, ExerciseKey> = {
  squat: "squat",
  "bench press": "bench_press",
  "barbell row": "barbell_row",
  "overhead press": "overhead_press",
  deadlift: "deadlift",
};

function norm(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function toIsoDate(input: string | undefined) {
  const raw = (input ?? "").replaceAll('"', "").trim();
  if (!raw) {
    return null;
  }
  const [year, month, day] = raw.split("/");
  if (!year || !month || !day) {
    return null;
  }
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00.000Z`;
}

function parseWorkoutType(input: string | undefined): WorkoutType | null {
  const value = norm(input);
  if (value.includes("workout a")) return "A";
  if (value.includes("workout b")) return "B";
  return null;
}

function parseTargetReps(input: string | undefined) {
  const value = (input ?? "").trim();
  const match = value.match(/^(\d+)[x/](\d+)$/i);
  if (!match) {
    return 5;
  }
  return Number(match[2]);
}

function extractSetResults(row: CsvRow, targetReps: number) {
  const setResults: WorkoutExerciseLog["setResults"] = [];
  let fallbackWeight = 0;

  for (let setIndex = 1; setIndex <= 5; setIndex += 1) {
    const repsKey = `Set ${setIndex} (Reps)`;
    const lbsKey = `Set ${setIndex} (LBS)`;
    const repsRaw = (row[repsKey] ?? "").trim();
    const lbsRaw = (row[lbsKey] ?? "").trim();

    if (!repsRaw && !lbsRaw) {
      continue;
    }

    const completedReps = Number(repsRaw || "0");
    const weight = Number(lbsRaw || "0");
    if (weight > 0) {
      fallbackWeight = weight;
    }

    setResults.push({
      setNumber: setResults.length + 1,
      targetReps,
      completedReps,
      completed: completedReps > 0,
      skipped: completedReps <= 0,
    });
  }

  if (setResults.length === 0) {
    // Last resort for malformed rows, still import as 1x5 with no reps.
    setResults.push({
      setNumber: 1,
      targetReps,
      completedReps: 0,
      completed: false,
      skipped: true,
    });
  }

  return {
    setResults,
    weight: fallbackWeight,
  };
}

export function parseStrongLiftsCsv(csvText: string): ImportParseResult {
  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    return {
      workouts: [],
      issues: parsed.errors.map((error) => `CSV parse error on row ${error.row}: ${error.message}`),
    };
  }

  const grouped = new Map<string, ImportedWorkoutDraft>();
  const issues: string[] = [];
  const unmappedExercises = new Set<string>();

  for (const row of parsed.data) {
    const cleanedRow: CsvRow = {};
    for (const [key, value] of Object.entries(row)) {
      cleanedRow[key.trim()] = value;
    }

    const workoutNumber = (cleanedRow["Workout"] ?? "").trim();
    const workoutDate = toIsoDate(cleanedRow["Date (yyyy/mm/dd)"]);
    const workoutType = parseWorkoutType(cleanedRow["Workout Name"]);
    const exerciseNameRaw = (cleanedRow["Exercise"] ?? "").trim();
    const exerciseKey = EXERCISE_NAME_MAP[norm(exerciseNameRaw)];

    if (!workoutNumber || !workoutDate || !workoutType || !exerciseNameRaw) {
      continue;
    }

    if (!exerciseKey) {
      unmappedExercises.add(exerciseNameRaw);
    }

    const targetReps = parseTargetReps(cleanedRow["SetsxReps"]);
    const { setResults, weight } = extractSetResults(cleanedRow, targetReps);
    const weightFromTopSet = Number((cleanedRow["Set 1 (LBS)"] ?? "").trim() || "0");
    const exerciseWeight = weight > 0 ? weight : weightFromTopSet;

    const groupKey = `${workoutDate}-${workoutNumber}-${workoutType}`;
    const existing = grouped.get(groupKey);
    const exerciseLog: WorkoutExerciseLog = {
      exerciseKey,
      exerciseName: exerciseNameRaw,
      weight: exerciseWeight,
      setResults,
      note: undefined,
    };

    if (!existing) {
      grouped.set(groupKey, {
        date: workoutDate,
        workoutType,
        exercises: [exerciseLog],
        workoutNote: (cleanedRow["Notes"] ?? "").trim() || undefined,
      });
      continue;
    }

    const hasExercise = existing.exercises.some(
      (exercise) =>
        exercise.exerciseName.toLowerCase() === exerciseNameRaw.toLowerCase() ||
        (exercise.exerciseKey && exerciseKey && exercise.exerciseKey === exerciseKey),
    );
    if (!hasExercise) {
      existing.exercises.push(exerciseLog);
    }
  }

  if (unmappedExercises.size > 0) {
    issues.push(
      `Unmapped exercises found: ${[...unmappedExercises].sort().join(", ")}. ` +
        "They will be imported as user-defined exercises.",
    );
  }

  const workouts = [...grouped.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  return { workouts, issues };
}
