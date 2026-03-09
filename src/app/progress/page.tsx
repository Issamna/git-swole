"use client";

import { useMemo, useState } from "react";
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

      <div className="rounded-xl border border-black/10 bg-white p-4">
        <label className="text-sm text-zinc-600">Exercise</label>
        <select
          className="mt-1 block rounded border border-black/20 px-2 py-1"
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

      <div className="rounded-xl border border-black/10 bg-white p-4">
        <div className="mb-3 text-sm text-zinc-600">{getExerciseName(selectedExercise)} trend</div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="weight" stroke="#111827" strokeWidth={2} />
              <Line type="monotone" dataKey="volume" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-4">
        <div className="text-sm text-zinc-500">Personal Records</div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {personalRecords.map((record) => (
            <div key={record.exerciseKey} className="rounded bg-zinc-50 p-3 text-sm">
              <div className="font-medium">{getExerciseName(record.exerciseKey)}</div>
              <div>{`Max Weight: ${record.maxWeight}`}</div>
              <div>{`Best Volume: ${record.bestVolume}`}</div>
              <div>{`Best Set: ${record.bestSetReps} reps`}</div>
            </div>
          ))}
          {personalRecords.length === 0 ? (
            <div className="rounded bg-zinc-50 p-3 text-sm text-zinc-600">No PRs yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
