"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { useWorkoutApp } from "@/context/workout-app-context";
import { useState } from "react";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/workout", label: "Workout" },
  { href: "/history", label: "History" },
  { href: "/progress", label: "Progress" },
  { href: "/settings", label: "Settings" },
];

export function AppNav() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const { syncStatus, syncError } = useWorkoutApp();
  const [showSyncTooltip, setShowSyncTooltip] = useState(false);
  const effectiveStatus = isSignedIn ? syncStatus : "local";

  const syncBadge = {
    local: { label: "Local only", className: "bg-[#2b3a43] text-[#c7d7e0]" },
    syncing: { label: "Syncing...", className: "bg-[#334753] text-white" },
    synced: { label: "Synced", className: "bg-[#45bb7c] text-[#112019]" },
    error: { label: "Sync error", className: "bg-red-600 text-white" },
  }[effectiveStatus];

  return (
    <header className="border-b border-[#334753] bg-[#24323a]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/gitswole.png" alt="Git Swole logo" width={36} height={36} className="rounded-md" priority />
          <div className="text-xl font-bold">Git Swole</div>
        </Link>
        <nav className="flex gap-2">
          {links.map((link) => {
            const selected = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  selected
                    ? "bg-[#45bb7c] text-[#112019]"
                    : "bg-[#2b3a43] text-white hover:bg-[#334753]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <div
            className="group relative"
            onMouseEnter={() => setShowSyncTooltip(true)}
            onMouseLeave={() => setShowSyncTooltip(false)}
          >
            <button
              type="button"
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${syncBadge.className}`}
              onClick={() => setShowSyncTooltip((previous) => !previous)}
            >
              {syncBadge.label}
            </button>
            {syncStatus === "error" && syncError && showSyncTooltip ? (
              <div className="absolute right-0 top-8 z-20 w-72 rounded-md border border-[#334753] bg-[#2b3a43] p-2 text-xs text-red-200 shadow-lg">
                {syncError}
              </div>
            ) : null}
          </div>
          {!isSignedIn ? (
            <SignInButton mode="modal">
              <button className="rounded-md bg-[#45bb7c] px-3 py-1.5 text-sm font-medium text-[#112019]">
                Sign in
              </button>
            </SignInButton>
          ) : (
            <UserButton />
          )}
        </div>
      </div>
    </header>
  );
}
