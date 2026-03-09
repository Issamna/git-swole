"use client";

import { useState } from "react";
import { getExerciseName, useWorkoutApp } from "@/context/workout-app-context";
import { WorkoutLog } from "@/lib/types";

export default function HistoryPage() {
  const { workoutLogs, deleteWorkout, updateWorkout } = useWorkoutApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleEditSet = (
    workout: WorkoutLog,
    exerciseIndex: number,
    setIndex: number,
    completedReps: number,
  ) => {
    const clone: WorkoutLog = {
      ...workout,
      exercises: workout.exercises.map((exercise, idx) => {
        if (idx !== exerciseIndex) {
          return exercise;
        }
        return {
          ...exercise,
          setResults: exercise.setResults.map((setResult, sIdx) =>
            sIdx === setIndex ? { ...setResult, completedReps } : setResult,
          ),
        };
      }),
    };
    updateWorkout(clone);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Workout History</h1>
      {workoutLogs.map((workout) => (
        <div key={workout.id} className="rounded-xl border border-black/10 bg-white p-4">
          <button
            className="w-full text-left"
            onClick={() => setExpandedId((previous) => (previous === workout.id ? null : workout.id))}
          >
            <div className="text-sm text-zinc-500">{new Date(workout.date).toLocaleDateString()}</div>
            <div className="font-semibold">{`Workout ${workout.workoutType}`}</div>
            <div className="text-sm text-zinc-600">
              {workout.exercises
                .map((exercise) => `${getExerciseName(exercise.exerciseKey)} ${exercise.weight}`)
                .join(" | ")}
            </div>
          </button>
          {expandedId === workout.id ? (
            <div className="mt-3 space-y-3">
              {workout.exercises.map((exercise, exerciseIndex) => (
                <div key={exercise.exerciseKey}>
                  <div className="text-sm font-medium">{getExerciseName(exercise.exerciseKey)}</div>
                  <div className="mt-1 grid gap-1">
                    {exercise.setResults.map((setResult, setIndex) => (
                      <div key={setResult.setNumber} className="grid grid-cols-[64px_1fr] gap-2">
                        <div className="text-xs text-zinc-500">{`Set ${setResult.setNumber}`}</div>
                        <input
                          className="rounded border border-black/20 px-2 py-1 text-sm"
                          type="number"
                          value={setResult.completedReps}
                          onChange={(event) =>
                            handleEditSet(
                              workout,
                              exerciseIndex,
                              setIndex,
                              Number(event.target.value),
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button
                className="rounded bg-red-600 px-3 py-1.5 text-sm text-white"
                onClick={() => deleteWorkout(workout.id)}
              >
                Delete Workout
              </button>
            </div>
          ) : null}
        </div>
      ))}
      {workoutLogs.length === 0 ? (
        <div className="rounded-xl border border-black/10 bg-white p-4 text-sm text-zinc-600">
          No workout history yet.
        </div>
      ) : null}
    </div>
  );
}
