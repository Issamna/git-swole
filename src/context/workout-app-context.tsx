"use client";

import { useUser } from "@clerk/nextjs";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { applyWorkoutProgression } from "@/lib/progression";
import { EXERCISE_BY_KEY } from "@/lib/program";
import {
  DEFAULT_APP_STATE,
  deleteWorkoutFromSupabase,
  loadLocalState,
  persistLocalState,
  persistWorkoutToSupabase,
  persistSupabaseState,
  replaceWorkoutSetsInSupabase,
  syncFromSupabase,
} from "@/lib/storage";
import { AppSettings, ExerciseKey, PersonalRecord, WorkoutExerciseLog, WorkoutLog } from "@/lib/types";

type WorkoutAppContextValue = {
  stateLoaded: boolean;
  nextWorkoutType: "A" | "B";
  settings: AppSettings;
  nextWorkoutExercises: { exerciseKey: ExerciseKey; sets: number; reps: number }[];
  currentWeights: Record<ExerciseKey, number>;
  workoutLogs: WorkoutLog[];
  personalRecords: PersonalRecord[];
  completeWorkout: (params: { exercises: WorkoutExerciseLog[]; note?: string }) => void;
  updateSettings: (nextSettings: Partial<AppSettings>) => void;
  deleteWorkout: (workoutId: string) => void;
  updateWorkout: (updatedWorkout: WorkoutLog) => void;
};

const WorkoutAppContext = createContext<WorkoutAppContextValue | null>(null);

function computePersonalRecords(logs: WorkoutLog[]): PersonalRecord[] {
  const records = new Map<ExerciseKey, PersonalRecord>();

  for (const workout of logs) {
    for (const exercise of workout.exercises) {
      const existing = records.get(exercise.exerciseKey);
      const totalVolume = exercise.setResults.reduce(
        (sum, setResult) => sum + setResult.completedReps * exercise.weight,
        0,
      );
      const bestSetReps = Math.max(...exercise.setResults.map((setResult) => setResult.completedReps));

      if (!existing) {
        records.set(exercise.exerciseKey, {
          exerciseKey: exercise.exerciseKey,
          maxWeight: exercise.weight,
          bestVolume: totalVolume,
          bestSetReps,
        });
        continue;
      }

      existing.maxWeight = Math.max(existing.maxWeight, exercise.weight);
      existing.bestVolume = Math.max(existing.bestVolume, totalVolume);
      existing.bestSetReps = Math.max(existing.bestSetReps, bestSetReps);
    }
  }

  return [...records.values()];
}

export function WorkoutAppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [state, setState] = useState(DEFAULT_APP_STATE);
  const [stateLoaded, setStateLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const localState = loadLocalState();
      setState(localState);
      setStateLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!stateLoaded || !user?.id) {
      return;
    }

    void syncFromSupabase(user.id).then((remoteState) => {
      if (!remoteState) {
        return;
      }
      setState(remoteState);
    });
  }, [stateLoaded, user?.id]);

  useEffect(() => {
    if (!stateLoaded) {
      return;
    }
    persistLocalState(state);
    if (user?.id) {
      void persistSupabaseState(user.id, state);
    }
  }, [state, stateLoaded, user?.id]);

  const nextWorkoutExercises = useMemo(() => {
    if (state.progression.nextWorkoutType === "A") {
      return state.settings.workoutAExercises.map((exerciseKey, idx) => ({
        exerciseKey,
        sets: idx === 2 && exerciseKey === "deadlift" ? 1 : 5,
        reps: 5,
      }));
    }
    return state.settings.workoutBExercises.map((exerciseKey, idx) => ({
      exerciseKey,
      sets: idx === 2 && exerciseKey === "deadlift" ? 1 : 5,
      reps: 5,
    }));
  }, [state.progression.nextWorkoutType, state.settings.workoutAExercises, state.settings.workoutBExercises]);

  const completeWorkout = ({ exercises, note }: { exercises: WorkoutExerciseLog[]; note?: string }) => {
    const nextLog: WorkoutLog = {
      id: crypto.randomUUID(),
      userId: user?.id ?? "local",
      date: new Date().toISOString(),
      workoutType: state.progression.nextWorkoutType,
      workoutNote: note,
      exercises,
    };

    if (user?.id) {
      void persistWorkoutToSupabase(nextLog);
    }

    setState((previous) => {
      const nextProgression = applyWorkoutProgression(
        previous.progression,
        exercises,
        previous.settings.weightIncrement,
      );
      return {
        ...previous,
        progression: nextProgression,
        workoutLogs: [nextLog, ...previous.workoutLogs],
      };
    });
  };

  const updateSettings = (nextSettings: Partial<AppSettings>) => {
    setState((previous) => ({
      ...previous,
      settings: {
        ...previous.settings,
        ...nextSettings,
      },
    }));
  };

  const deleteWorkout = (workoutId: string) => {
    if (user?.id) {
      void deleteWorkoutFromSupabase(workoutId);
    }
    setState((previous) => ({
      ...previous,
      workoutLogs: previous.workoutLogs.filter((workout) => workout.id !== workoutId),
    }));
  };

  const updateWorkout = (updatedWorkout: WorkoutLog) => {
    if (user?.id) {
      void replaceWorkoutSetsInSupabase(updatedWorkout);
    }
    setState((previous) => ({
      ...previous,
      workoutLogs: previous.workoutLogs.map((workout) =>
        workout.id === updatedWorkout.id ? updatedWorkout : workout,
      ),
    }));
  };

  const personalRecords = useMemo(() => computePersonalRecords(state.workoutLogs), [state.workoutLogs]);

  const value: WorkoutAppContextValue = {
    stateLoaded,
    nextWorkoutType: state.progression.nextWorkoutType,
    settings: state.settings,
    nextWorkoutExercises,
    currentWeights: state.progression.currentWeights,
    workoutLogs: state.workoutLogs,
    personalRecords,
    completeWorkout,
    updateSettings,
    deleteWorkout,
    updateWorkout,
  };

  return <WorkoutAppContext.Provider value={value}>{children}</WorkoutAppContext.Provider>;
}

export function useWorkoutApp() {
  const context = useContext(WorkoutAppContext);
  if (!context) {
    throw new Error("useWorkoutApp must be used within WorkoutAppProvider");
  }
  return context;
}

export function getExerciseName(exerciseKey: ExerciseKey) {
  return EXERCISE_BY_KEY[exerciseKey].name;
}
