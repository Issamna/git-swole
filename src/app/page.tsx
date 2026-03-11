"use client";

import Link from "next/link";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { useWorkoutApp } from "@/context/workout-app-context";

export default function Home() {
  const { isSignedIn } = useAuth();
  const { nextWorkoutExercises, currentWeights, workoutLogs, stateLoaded, nextWorkoutName } = useWorkoutApp();

  if (!stateLoaded) {
    return <div className="rounded-lg border border-[#334753] bg-[#24323a] p-6">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#334753] bg-[#24323a] p-5">
        <div className="text-sm text-[#9ab0bd]">Next Workout</div>
        <h1 className="text-3xl font-bold">{nextWorkoutName}</h1>
        <div className="mt-3 space-y-2">
          {nextWorkoutExercises.map((exercise) => (
            <div key={exercise.exerciseId} className="flex items-center justify-between rounded bg-[#2b3a43] p-2">
              <span>{exercise.exerciseName}</span>
              <span className="text-sm text-[#c7d7e0]">
                {exercise.exerciseKey ? currentWeights[exercise.exerciseKey] : 0} x {exercise.sets}x
                {exercise.reps}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Link href="/workout" className="rounded-lg bg-[#45bb7c] px-4 py-2 font-medium text-[#112019]">
            Start Session
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-[#334753] bg-[#24323a] p-5">
        <div className="text-sm text-[#9ab0bd]">Recent Workouts</div>
        <div className="mt-2 space-y-2">
          {workoutLogs.slice(0, 3).map((workout) => (
            <div key={workout.id} className="rounded bg-[#2b3a43] p-2 text-sm">
              <div className="font-medium">{new Date(workout.date).toLocaleDateString()}</div>
              <div className="text-[#c7d7e0]">
                {workout.exercises
                  .map(
                    (exercise) =>
                      `${exercise.exerciseName} ${exercise.weight}`,
                  )
                  .join(" | ")}
              </div>
            </div>
          ))}
          {workoutLogs.length === 0 ? (
            <div className="rounded bg-[#2b3a43] p-2 text-sm text-[#c7d7e0]">No workouts logged yet.</div>
          ) : null}
        </div>
      </div>

      {!isSignedIn ? (
        <div className="rounded-xl border border-dashed border-[#45bb7c] bg-[#24323a] p-5 text-sm">
          Sign in with Clerk to sync your data to Supabase.
          <div className="mt-3">
            <SignInButton mode="modal">
              <button className="rounded bg-[#45bb7c] px-3 py-1.5 font-medium text-[#112019]">Sign in</button>
            </SignInButton>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#334753] bg-[#24323a] p-5 text-sm text-[#c7d7e0]">
          Signed in. Progression and settings sync automatically.
        </div>
      )}
    </div>
  );
}
