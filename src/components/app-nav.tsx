"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";

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

  return (
    <header className="border-b border-black/10">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <div className="text-xl font-bold">Git Swole</div>
        <nav className="flex gap-2">
          {links.map((link) => {
            const selected = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  selected ? "bg-black text-white" : "bg-zinc-100 hover:bg-zinc-200"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center">
          {!isSignedIn ? (
            <SignInButton mode="modal">
              <button className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white">Sign in</button>
            </SignInButton>
          ) : (
            <UserButton />
          )}
        </div>
      </div>
    </header>
  );
}
