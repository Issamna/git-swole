"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getExerciseName, useWorkoutApp } from "@/context/workout-app-context";
import { RestTimer } from "@/components/rest-timer";
import { calculatePlates } from "@/lib/plates";
import { WorkoutSummary } from "@/lib/types";
import { generateWarmupSets } from "@/lib/warmup";

type SetState = {
  completedReps: number;
  completed: boolean;
  skipped: boolean;
};

type WorkoutDraft = {
  nextWorkoutType: "A" | "B";
  activeExerciseIndex: number;
  workoutNote: string;
  workoutSummary?: WorkoutSummary;
  setStates: Record<string, SetState[]>;
  weightOverrides: Record<string, number>;
};

const WORKOUT_DRAFT_KEY = "git-swole-workout-draft-v1";

export function WorkoutSession() {
  const { settings, currentWeights, nextWorkoutExercises, nextWorkoutType, completeWorkout } = useWorkoutApp();
  const buildInitialSetStates = useCallback(() => {
    const initial: Record<string, SetState[]> = {};
    for (const exercise of nextWorkoutExercises) {
      const key = exercise.exerciseKey;
      initial[key] = Array.from({ length: exercise.sets }).map(() => ({
        completedReps: exercise.reps,
        completed: false,
        skipped: false,
      }));
    }
    return initial;
  }, [nextWorkoutExercises]);
  const [restTick, setRestTick] = useState(0);
  const [workoutNote, setWorkoutNote] = useState("");
  const [workoutSummary, setWorkoutSummary] = useState<WorkoutSummary | undefined>(undefined);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [setStates, setSetStates] = useState<Record<string, SetState[]>>(buildInitialSetStates);
  const [weightOverrides, setWeightOverrides] = useState<Record<string, number>>({});

  const activeExercise = nextWorkoutExercises[activeExerciseIndex];
  const activeExerciseWeight = weightOverrides[activeExercise.exerciseKey] ?? currentWeights[activeExercise.exerciseKey];
  const plates = calculatePlates(activeExerciseWeight, settings.barbellWeight);
  const warmup = generateWarmupSets(activeExerciseWeight, settings.barbellWeight);

  const isWorkoutReadyToFinish = useMemo(() => {
    return nextWorkoutExercises.every((exercise) =>
      setStates[exercise.exerciseKey]?.every((setState) => setState.completed || setState.skipped),
    );
  }, [nextWorkoutExercises, setStates]);

  const updateSet = (exerciseKey: string, setIndex: number, nextSet: Partial<SetState>) => {
    setSetStates((previous) => {
      const cloned = [...(previous[exerciseKey] ?? [])];
      cloned[setIndex] = { ...cloned[setIndex], ...nextSet };
      return { ...previous, [exerciseKey]: cloned };
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(WORKOUT_DRAFT_KEY);
    if (!raw) {
      setDraftLoaded(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as WorkoutDraft;
      if (parsed.nextWorkoutType !== nextWorkoutType) {
        setDraftLoaded(true);
        return;
      }

      const initial = buildInitialSetStates();
      const mergedSetStates: Record<string, SetState[]> = { ...initial };
      for (const [exerciseKey, sets] of Object.entries(parsed.setStates ?? {})) {
        if (!mergedSetStates[exerciseKey]) {
          continue;
        }
        mergedSetStates[exerciseKey] = mergedSetStates[exerciseKey].map((setState, idx) => ({
          ...setState,
          ...(sets[idx] ?? {}),
        }));
      }

      setSetStates(mergedSetStates);
      setWorkoutNote(parsed.workoutNote ?? "");
      setWorkoutSummary(parsed.workoutSummary);
      setWeightOverrides(parsed.weightOverrides ?? {});
      setActiveExerciseIndex(
        Math.min(Math.max(parsed.activeExerciseIndex ?? 0, 0), nextWorkoutExercises.length - 1),
      );
    } catch {
      // Ignore invalid draft payload and continue fresh.
    } finally {
      setDraftLoaded(true);
    }
  }, [buildInitialSetStates, nextWorkoutExercises.length, nextWorkoutType]);

  useEffect(() => {
    if (!draftLoaded || typeof window === "undefined") {
      return;
    }

    const draft: WorkoutDraft = {
      nextWorkoutType,
      activeExerciseIndex,
      workoutNote,
      workoutSummary,
      setStates,
      weightOverrides,
    };
    window.localStorage.setItem(WORKOUT_DRAFT_KEY, JSON.stringify(draft));
  }, [activeExerciseIndex, draftLoaded, nextWorkoutType, setStates, weightOverrides, workoutNote, workoutSummary]);

  const clearDraft = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(WORKOUT_DRAFT_KEY);
    }
  };

  const resetSession = () => {
    setWorkoutNote("");
    setWorkoutSummary(undefined);
    setActiveExerciseIndex(0);
    setRestTick(0);
    setWeightOverrides({});
    setSetStates(buildInitialSetStates());
  };

  const discardDraft = () => {
    clearDraft();
    resetSession();
  };

  const finishWorkout = () => {
    completeWorkout({
      note: workoutNote || undefined,
      summary: workoutSummary,
      exercises: nextWorkoutExercises.map((exercise) => ({
        exerciseKey: exercise.exerciseKey,
        weight: weightOverrides[exercise.exerciseKey] ?? currentWeights[exercise.exerciseKey],
        setResults: setStates[exercise.exerciseKey].map((setResult, index) => ({
          setNumber: index + 1,
          targetReps: exercise.reps,
          completedReps: setResult.completedReps,
          completed: setResult.completed,
          skipped: setResult.skipped,
        })),
      })),
    });

    clearDraft();
    resetSession();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
        <div className="text-sm text-[#9ab0bd]">Current Exercise</div>
        <div className="text-2xl font-semibold">{getExerciseName(activeExercise.exerciseKey)}</div>
        <div className="mt-2">
          <label className="text-sm">Working Weight ({settings.units})</label>
          <input
            className="mt-1 w-full rounded border border-[#334753] bg-[#2b3a43] px-3 py-2"
            type="number"
            value={activeExerciseWeight}
            onChange={(event) =>
              setWeightOverrides((previous) => ({
                ...previous,
                [activeExercise.exerciseKey]: Number(event.target.value),
              }))
            }
          />
        </div>
        <div className="mt-3 text-sm text-[#c7d7e0]">
          {activeExercise.sets} sets x {activeExercise.reps} reps
        </div>
      </div>

      <RestTimer defaultSeconds={settings.restTimerSeconds} autoStartToken={restTick} />

      <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
        <div className="text-sm text-[#9ab0bd]">Sets</div>
        <div className="mt-2 space-y-2">
          {setStates[activeExercise.exerciseKey].map((setState, index) => (
            <div key={index} className="grid grid-cols-[64px_1fr_auto_auto] items-center gap-2">
              <div className="text-sm">Set {index + 1}</div>
              <input
                className="rounded border border-[#334753] bg-[#2b3a43] px-2 py-1 text-sm"
                type="number"
                placeholder="reps"
                value={setState.completedReps}
                onChange={(event) =>
                  {
                    const completedReps = Number(event.target.value);
                    const hasReps = completedReps > 0;
                    updateSet(activeExercise.exerciseKey, index, {
                      completedReps,
                      completed: hasReps,
                      skipped: hasReps ? false : setState.skipped,
                    });
                  }
                }
              />
              <button
                className={`rounded px-2 py-1 text-xs ${setState.completed ? "bg-[#45bb7c] text-[#112019]" : "bg-[#2b3a43] text-white"}`}
                onClick={() => {
                  updateSet(activeExercise.exerciseKey, index, {
                    completed: true,
                    skipped: false,
                    completedReps:
                      setStates[activeExercise.exerciseKey][index].completedReps || activeExercise.reps,
                  });
                  setRestTick((previous) => previous + 1);
                }}
              >
                Complete
              </button>
              <button
                className={`rounded px-2 py-1 text-xs ${setState.skipped ? "bg-amber-500 text-white" : "bg-[#2b3a43] text-white"}`}
                onClick={() => {
                  updateSet(activeExercise.exerciseKey, index, {
                    skipped: true,
                    completed: false,
                  });
                }}
              >
                Skip
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            className="rounded border border-[#334753] bg-[#2b3a43] px-3 py-1.5 text-sm"
            onClick={() => setActiveExerciseIndex((previous) => Math.max(previous - 1, 0))}
          >
            Prev Exercise
          </button>
          <button
            className="rounded border border-[#334753] bg-[#2b3a43] px-3 py-1.5 text-sm"
            onClick={() =>
              setActiveExerciseIndex((previous) => Math.min(previous + 1, nextWorkoutExercises.length - 1))
            }
          >
            Next Exercise
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
          <div className="text-sm text-[#9ab0bd]">Plate Calculator</div>
          <div className="mt-1 text-sm">{plates.length > 0 ? `Per side: ${plates.join(" / ")}` : "Bar only"}</div>
        </div>
        <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
          <div className="text-sm text-[#9ab0bd]">Warmup</div>
          <div className="mt-1 text-sm">
            {warmup.map((set) => `${set.weight} x${set.reps}`).join("  |  ")}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
        <div className="text-sm text-[#9ab0bd]">Workout Summary</div>
        <div className="mt-2 flex gap-2">
          <button
            className={`rounded px-3 py-1.5 text-sm ${workoutSummary === "up" ? "bg-[#45bb7c] font-medium text-[#112019]" : "bg-[#2b3a43]"}`}
            onClick={() => setWorkoutSummary((previous) => (previous === "up" ? undefined : "up"))}
          >
            👍 Good
          </button>
          <button
            className={`rounded px-3 py-1.5 text-sm ${workoutSummary === "down" ? "bg-[#45bb7c] font-medium text-[#112019]" : "bg-[#2b3a43]"}`}
            onClick={() => setWorkoutSummary((previous) => (previous === "down" ? undefined : "down"))}
          >
            👎 Tough
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
        <div className="text-sm text-[#9ab0bd]">Workout Notes</div>
        <textarea
          className="mt-2 min-h-20 w-full rounded border border-[#334753] bg-[#2b3a43] px-3 py-2"
          placeholder="How did it feel?"
          value={workoutNote}
          onChange={(event) => setWorkoutNote(event.target.value)}
        />
      </div>

      <button
        className="w-full rounded-lg bg-[#45bb7c] px-4 py-2 font-medium text-[#112019] disabled:bg-[#334753] disabled:text-[#8ca5b3]"
        disabled={!isWorkoutReadyToFinish}
        onClick={finishWorkout}
      >
        Finish Workout
      </button>
      <button
        className="w-full rounded-lg border border-[#334753] bg-[#2b3a43] px-4 py-2 text-sm"
        onClick={discardDraft}
      >
        Discard Session Draft
      </button>
    </div>
  );
}
