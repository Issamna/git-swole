"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getExerciseName, useWorkoutApp } from "@/context/workout-app-context";
import { ExerciseKey } from "@/lib/types";

export default function ProgressPage() {
  const { workoutLogs, personalRecords } = useWorkoutApp();
  const [selectedExercise, setSelectedExercise] = useState<ExerciseKey>("squat");
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setHasMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const chartData = useMemo(() => {
    return [...workoutLogs]
      .reverse()
      .map((workout) => {
        const exercise = workout.exercises.find((item) => item.exerciseKey === selectedExercise);
        const volume = exercise
          ? exercise.setResults.reduce((sum, setResult) => sum + setResult.completedReps * exercise.weight, 0)
          : 0;
        return {
          date: new Date(workout.date).toLocaleDateString(),
          weight: exercise?.weight ?? null,
          volume,
          frequency: 1,
        };
      });
  }, [selectedExercise, workoutLogs]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Progress Graphs</h1>

      <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
        <label className="text-sm text-[#9ab0bd]">Exercise</label>
        <select
          className="mt-1 block rounded border border-[#334753] bg-[#2b3a43] px-2 py-1"
          value={selectedExercise}
          onChange={(event) => setSelectedExercise(event.target.value as ExerciseKey)}
        >
          <option value="squat">Squat</option>
          <option value="bench_press">Bench Press</option>
          <option value="barbell_row">Barbell Row</option>
          <option value="overhead_press">Overhead Press</option>
          <option value="deadlift">Deadlift</option>
        </select>
      </div>

      <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
        <div className="mb-3 text-sm text-[#9ab0bd]">{getExerciseName(selectedExercise)} trend</div>
        <div className="h-80 w-full">
          {hasMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#9ab0bd" />
                <YAxis stroke="#9ab0bd" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#24323a", borderColor: "#334753", color: "#ffffff" }}
                  labelStyle={{ color: "#ffffff" }}
                />
                <Legend />
                <Line type="monotone" dataKey="weight" stroke="#45bb7c" strokeWidth={2} />
                <Line type="monotone" dataKey="volume" stroke="#7aa7ff" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
        <div className="text-sm text-[#9ab0bd]">Personal Records</div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {personalRecords.map((record) => (
            <div key={record.exerciseKey} className="rounded bg-[#2b3a43] p-3 text-sm">
              <div className="font-medium">{getExerciseName(record.exerciseKey)}</div>
              <div>{`Max Weight: ${record.maxWeight}`}</div>
              <div>{`Best Volume: ${record.bestVolume}`}</div>
              <div>{`Best Set: ${record.bestSetReps} reps`}</div>
            </div>
          ))}
          {personalRecords.length === 0 ? (
            <div className="rounded bg-[#2b3a43] p-3 text-sm text-[#c7d7e0]">No PRs yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
