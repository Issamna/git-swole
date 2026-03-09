"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { WorkoutAppProvider } from "@/context/workout-app-context";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <ClerkProvider>
      <WorkoutAppProvider>{children}</WorkoutAppProvider>
    </ClerkProvider>
  );
}
