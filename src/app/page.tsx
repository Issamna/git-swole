"use client";

import Link from "next/link";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { getExerciseName, useWorkoutApp } from "@/context/workout-app-context";

export default function Home() {
  const { isSignedIn } = useAuth();
  const { nextWorkoutExercises, currentWeights, workoutLogs, stateLoaded, nextWorkoutType } = useWorkoutApp();

  if (!stateLoaded) {
    return <div className="rounded-lg border border-black/10 bg-white p-6">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-black/10 bg-white p-5">
        <div className="text-sm text-zinc-500">Next Workout</div>
        <h1 className="text-3xl font-bold">{`Workout ${nextWorkoutType}`}</h1>
        <div className="mt-3 space-y-2">
          {nextWorkoutExercises.map((exercise) => (
            <div key={exercise.exerciseKey} className="flex items-center justify-between rounded bg-zinc-50 p-2">
              <span>{getExerciseName(exercise.exerciseKey)}</span>
              <span className="text-sm text-zinc-600">
                {currentWeights[exercise.exerciseKey]} x {exercise.sets}x{exercise.reps}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Link href="/workout" className="rounded-lg bg-black px-4 py-2 text-white">
            Start Session
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-5">
        <div className="text-sm text-zinc-500">Recent Workouts</div>
        <div className="mt-2 space-y-2">
          {workoutLogs.slice(0, 3).map((workout) => (
            <div key={workout.id} className="rounded bg-zinc-50 p-2 text-sm">
              <div className="font-medium">{new Date(workout.date).toLocaleDateString()}</div>
              <div className="text-zinc-600">
                {workout.exercises
                  .map((exercise) => `${getExerciseName(exercise.exerciseKey)} ${exercise.weight}`)
                  .join(" | ")}
              </div>
            </div>
          ))}
          {workoutLogs.length === 0 ? (
            <div className="rounded bg-zinc-50 p-2 text-sm text-zinc-600">No workouts logged yet.</div>
          ) : null}
        </div>
      </div>

      {!isSignedIn ? (
        <div className="rounded-xl border border-dashed border-black/20 bg-white p-5 text-sm">
          Sign in with Clerk to sync your data to Supabase.
          <div className="mt-3">
            <SignInButton mode="modal">
              <button className="rounded bg-black px-3 py-1.5 text-white">Sign in</button>
            </SignInButton>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-black/10 bg-white p-5 text-sm text-zinc-600">
          Signed in. Progression and settings sync automatically.
        </div>
      )}
    </div>
  );
}
