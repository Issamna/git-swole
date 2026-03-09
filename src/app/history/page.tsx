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
        <div key={workout.id} className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
          <button
            className="w-full text-left"
            onClick={() => setExpandedId((previous) => (previous === workout.id ? null : workout.id))}
          >
            <div className="text-sm text-[#9ab0bd]">{new Date(workout.date).toLocaleDateString()}</div>
            <div className="font-semibold">
              {`Workout ${workout.workoutType}`}{" "}
              {workout.workoutSummary === "up" ? "👍" : workout.workoutSummary === "down" ? "👎" : ""}
            </div>
            <div className="text-sm text-[#c7d7e0]">
              {workout.exercises
                .map((exercise) => `${getExerciseName(exercise.exerciseKey)} ${exercise.weight}`)
                .join(" | ")}
            </div>
          </button>
          {expandedId === workout.id ? (
            <div className="mt-3 space-y-3">
              {workout.workoutNote ? (
                <div className="rounded bg-[#2b3a43] p-3 text-sm text-[#d7e4eb]">{workout.workoutNote}</div>
              ) : null}
              {workout.exercises.map((exercise, exerciseIndex) => (
                <div key={exercise.exerciseKey}>
                  <div className="text-sm font-medium">{getExerciseName(exercise.exerciseKey)}</div>
                  <div className="mt-1 grid gap-1">
                    {exercise.setResults.map((setResult, setIndex) => (
                      <div key={setResult.setNumber} className="grid grid-cols-[64px_1fr] gap-2">
                        <div className="text-xs text-[#9ab0bd]">{`Set ${setResult.setNumber}`}</div>
                        <input
                          className="rounded border border-[#334753] bg-[#2b3a43] px-2 py-1 text-sm"
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
        <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4 text-sm text-[#c7d7e0]">
          No workout history yet.
        </div>
      ) : null}
    </div>
  );
}
