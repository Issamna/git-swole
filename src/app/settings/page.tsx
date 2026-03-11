"use client";

import Link from "next/link";
import { useState } from "react";
import { useWorkoutApp } from "@/context/workout-app-context";
import { EXERCISES } from "@/lib/program";
import { WorkoutTemplate } from "@/lib/types";

type SettingsTab = "preferences" | "program" | "custom" | "data";

export default function SettingsPage() {
  const { settings, updateSettings, exerciseCatalog, createOrUpdateUserExercise } = useWorkoutApp();
  const [newExerciseName, setNewExerciseName] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>("preferences");

  const availableProgramExercises =
    exerciseCatalog.length > 0
      ? exerciseCatalog.map((exercise) => ({ id: exercise.id, name: exercise.name }))
      : EXERCISES.map((exercise) => ({ id: exercise.key, name: exercise.name }));

  const updateGroups = (updater: (current: WorkoutTemplate[]) => WorkoutTemplate[]) => {
    updateSettings({ workoutGroups: updater(settings.workoutGroups) });
  };

  const addGroup = () => {
    const nextIndex = settings.workoutGroups.length + 1;
    updateGroups((current) => [
      ...current,
      {
        id: `workout-${crypto.randomUUID().slice(0, 8)}`,
        name: `Workout ${nextIndex}`,
        exercises: [{ exerciseId: availableProgramExercises[0]?.id ?? "squat", sets: 5, reps: 5 }],
      },
    ]);
  };

  const removeGroup = (groupId: string) => {
    updateGroups((current) => current.filter((group) => group.id !== groupId));
  };

  const renameGroup = (groupId: string, name: string) => {
    updateGroups((current) =>
      current.map((group) => (group.id === groupId ? { ...group, name: name || "Workout" } : group)),
    );
  };

  const updateGroupExercise = (
    groupId: string,
    exerciseIndex: number,
    changes: Partial<WorkoutTemplate["exercises"][number]>,
  ) => {
    updateGroups((current) =>
      current.map((group) => {
        if (group.id !== groupId) return group;
        const exercises = [...group.exercises];
        exercises[exerciseIndex] = { ...exercises[exerciseIndex], ...changes };
        return { ...group, exercises };
      }),
    );
  };

  const addGroupExercise = (groupId: string) => {
    updateGroups((current) =>
      current.map((group) => {
        if (group.id !== groupId) return group;
        return {
          ...group,
          exercises: [
            ...group.exercises,
            {
              exerciseId: availableProgramExercises[0]?.id ?? "squat",
              sets: 5,
              reps: 5,
            },
          ],
        };
      }),
    );
  };

  const removeGroupExercise = (groupId: string, exerciseIndex: number) => {
    updateGroups((current) =>
      current.map((group) => {
        if (group.id !== groupId) return group;
        const exercises = group.exercises.filter((_, idx) => idx !== exerciseIndex);
        return { ...group, exercises: exercises.length > 0 ? exercises : group.exercises };
      }),
    );
  };

  const tabClass = (tab: SettingsTab) =>
    `rounded-md px-3 py-1.5 text-sm ${activeTab === tab ? "bg-[#45bb7c] font-medium text-[#112019]" : "bg-[#2b3a43] text-white"}`;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={tabClass("preferences")} onClick={() => setActiveTab("preferences")}>
          Preferences
        </button>
        <button type="button" className={tabClass("program")} onClick={() => setActiveTab("program")}>
          Program
        </button>
        <button type="button" className={tabClass("custom")} onClick={() => setActiveTab("custom")}>
          Custom Exercises
        </button>
        <button type="button" className={tabClass("data")} onClick={() => setActiveTab("data")}>
          Data
        </button>
      </div>

      {activeTab === "preferences" ? (
        <div className="space-y-4">
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
        </div>
      ) : null}

      {activeTab === "program" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={addGroup}
              className="rounded-md bg-[#45bb7c] px-3 py-1.5 text-sm font-medium text-[#112019]"
            >
              Add Workout Group
            </button>
          </div>

          {settings.workoutGroups.map((group) => (
            <div key={group.id} className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <label className="text-xs text-[#9ab0bd]">Group name</label>
                  <input
                    className="mt-1 block rounded border border-[#334753] bg-[#2b3a43] px-2 py-1 text-sm"
                    value={group.name}
                    onChange={(event) => renameGroup(group.id, event.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeGroup(group.id)}
                  disabled={settings.workoutGroups.length <= 1}
                  className="rounded bg-red-600 px-3 py-1.5 text-xs text-white disabled:bg-[#334753] disabled:text-[#8ca5b3]"
                >
                  Remove Group
                </button>
              </div>

              <div className="space-y-2">
                {group.exercises.map((exercise, exerciseIndex) => (
                  <div key={`${group.id}-${exerciseIndex}`} className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto]">
                    <select
                      className="rounded border border-[#334753] bg-[#2b3a43] px-2 py-1"
                      value={exercise.exerciseId}
                      onChange={(event) =>
                        updateGroupExercise(group.id, exerciseIndex, { exerciseId: event.target.value })
                      }
                    >
                      {availableProgramExercises.map((exerciseDef) => (
                        <option key={exerciseDef.id} value={exerciseDef.id}>
                          {exerciseDef.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className="rounded border border-[#334753] bg-[#2b3a43] px-2 py-1 text-sm"
                      type="number"
                      min={1}
                      value={exercise.sets}
                      onChange={(event) =>
                        updateGroupExercise(group.id, exerciseIndex, {
                          sets: Math.max(1, Number(event.target.value) || 1),
                        })
                      }
                    />
                    <input
                      className="rounded border border-[#334753] bg-[#2b3a43] px-2 py-1 text-sm"
                      type="number"
                      min={1}
                      value={exercise.reps}
                      onChange={(event) =>
                        updateGroupExercise(group.id, exerciseIndex, {
                          reps: Math.max(1, Number(event.target.value) || 1),
                        })
                      }
                    />
                    <button
                      type="button"
                      className="rounded border border-[#334753] bg-[#2b3a43] px-2 py-1 text-xs"
                      onClick={() => removeGroupExercise(group.id, exerciseIndex)}
                      disabled={group.exercises.length <= 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex justify-between text-xs text-[#9ab0bd]">
                <span>Columns: Exercise / Sets / Reps</span>
                <button
                  type="button"
                  onClick={() => addGroupExercise(group.id)}
                  className="rounded border border-[#334753] bg-[#2b3a43] px-2 py-1 text-xs text-white"
                >
                  Add Exercise
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === "custom" ? (
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
      ) : null}

      {activeTab === "data" ? (
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
      ) : null}
    </div>
  );
}
