"use client";

import Image from "next/image";
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
        <div className="flex items-center">
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
