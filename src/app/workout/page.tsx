"use client";

import { WorkoutSession } from "@/components/workout-session";

export default function WorkoutPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Workout Session</h1>
      <WorkoutSession />
    </div>
  );
}
