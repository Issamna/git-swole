"use client";

import Link from "next/link";
import { useState } from "react";
import { useWorkoutApp } from "@/context/workout-app-context";
import { EXERCISES } from "@/lib/program";
import { ExerciseKey } from "@/lib/types";

export default function SettingsPage() {
  const { settings, updateSettings, exerciseCatalog, createOrUpdateUserExercise } = useWorkoutApp();
  const [newExerciseName, setNewExerciseName] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const updateWorkoutExercise = (workout: "A" | "B", index: number, nextExercise: ExerciseKey) => {
    if (workout === "A") {
      const cloned = [...settings.workoutAExercises];
      cloned[index] = nextExercise;
      updateSettings({ workoutAExercises: cloned });
      return;
    }
    const cloned = [...settings.workoutBExercises];
    cloned[index] = nextExercise;
    updateSettings({ workoutBExercises: cloned });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
        <label className="text-sm text-[#9ab0bd]">Weight Units</label>
        <select
          className="mt-1 block rounded border border-[#334753] bg-[#2b3a43] px-2 py-1"
          value={settings.units}
          onChange={(event) => updateSettings({ units: event.target.value as "lb" | "kg" })}
        >
          <option value="lb">lbs</option>
          <option value="kg">kg</option>
        </select>
      </div>

      <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
        <label className="text-sm text-[#9ab0bd]">Weight Increment</label>
        <select
          className="mt-1 block rounded border border-[#334753] bg-[#2b3a43] px-2 py-1"
          value={settings.weightIncrement}
          onChange={(event) =>
            updateSettings({ weightIncrement: Number(event.target.value) as 2.5 | 5 | 10 })
          }
        >
          <option value={2.5}>2.5</option>
          <option value={5}>5</option>
          <option value={10}>10</option>
        </select>
      </div>

      <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
        <label className="text-sm text-[#9ab0bd]">Rest Timer Duration (seconds)</label>
        <input
          className="mt-1 block w-full rounded border border-[#334753] bg-[#2b3a43] px-2 py-1"
          type="number"
          value={settings.restTimerSeconds}
          onChange={(event) => updateSettings({ restTimerSeconds: Number(event.target.value) })}
        />
      </div>

      <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
        <label className="text-sm text-[#9ab0bd]">Bar Weight</label>
        <input
          className="mt-1 block w-full rounded border border-[#334753] bg-[#2b3a43] px-2 py-1"
          type="number"
          value={settings.barbellWeight}
          onChange={(event) => updateSettings({ barbellWeight: Number(event.target.value) })}
        />
      </div>

      <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
        <div className="text-sm text-[#9ab0bd]">Edit Workout A Exercises</div>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          {settings.workoutAExercises.map((exercise, index) => (
            <select
              key={`A-${index}`}
              className="rounded border border-[#334753] bg-[#2b3a43] px-2 py-1"
              value={exercise}
              onChange={(event) => updateWorkoutExercise("A", index, event.target.value as ExerciseKey)}
            >
              {EXERCISES.map((exerciseDef) => (
                <option key={exerciseDef.key} value={exerciseDef.key}>
                  {exerciseDef.name}
                </option>
              ))}
            </select>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
        <div className="text-sm text-[#9ab0bd]">Edit Workout B Exercises</div>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          {settings.workoutBExercises.map((exercise, index) => (
            <select
              key={`B-${index}`}
              className="rounded border border-[#334753] bg-[#2b3a43] px-2 py-1"
              value={exercise}
              onChange={(event) => updateWorkoutExercise("B", index, event.target.value as ExerciseKey)}
            >
              {EXERCISES.map((exerciseDef) => (
                <option key={exerciseDef.key} value={exerciseDef.key}>
                  {exerciseDef.name}
                </option>
              ))}
            </select>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
        <div className="text-sm text-[#9ab0bd]">Exercise Database</div>
        <div className="mt-2 space-y-2">
          {EXERCISES.map((exercise) => (
            <div key={exercise.key} className="rounded bg-[#2b3a43] p-3">
              <div className="font-medium">{exercise.name}</div>
              <div className="text-sm text-[#9ab0bd]">{exercise.muscleGroup}</div>
              <div className="text-sm text-[#d7e4eb]">{exercise.instructions}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
        <div className="text-sm text-[#9ab0bd]">Data Management</div>
        <p className="mt-2 text-sm text-[#d7e4eb]">
          Import StrongLifts CSV history and sync it to your account.
        </p>
        <Link
          href="/import"
          className="mt-3 inline-block rounded-md bg-[#45bb7c] px-3 py-1.5 text-sm font-medium text-[#112019]"
        >
          Open Import Tool
        </Link>
      </div>

      <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
        <div className="text-sm text-[#9ab0bd]">Custom Exercises</div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs text-[#9ab0bd]">Exercise name</label>
            <input
              className="mt-1 rounded border border-[#334753] bg-[#2b3a43] px-2 py-1 text-sm"
              value={newExerciseName}
              onChange={(event) => setNewExerciseName(event.target.value)}
              placeholder="e.g. Bulgarian Split Squat"
            />
          </div>
          <button
            type="button"
            className="rounded-md bg-[#45bb7c] px-3 py-1.5 text-sm font-medium text-[#112019] disabled:bg-[#334753] disabled:text-[#8ca5b3]"
            disabled={!newExerciseName.trim()}
            onClick={async () => {
              const name = newExerciseName.trim();
              if (!name) return;
              const result = await createOrUpdateUserExercise({
                name,
                primaryMuscle: "Unknown",
                secondaryMuscles: [],
                equipment: "Unknown",
                movementPattern: "Unknown",
                description: "User-created exercise",
              });
              if (result.ok) {
                setSaveMessage(`Saved "${name}"`);
                setNewExerciseName("");
              } else {
                setSaveMessage(result.error || "Failed to save exercise.");
              }
            }}
          >
            Save Exercise
          </button>
        </div>
        {saveMessage ? <div className="mt-2 text-xs text-[#c7d7e0]">{saveMessage}</div> : null}
        <div className="mt-3 max-h-56 space-y-1 overflow-auto rounded bg-[#2b3a43] p-2 text-sm">
          {exerciseCatalog.map((exercise) => (
            <div key={exercise.id} className="flex items-center justify-between rounded px-2 py-1">
              <span>{exercise.name}</span>
              <span className="text-xs text-[#9ab0bd]">{exercise.ownership}</span>
            </div>
          ))}
          {exerciseCatalog.length === 0 ? (
            <div className="px-2 py-1 text-xs text-[#9ab0bd]">No exercises loaded yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
