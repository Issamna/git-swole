"use client";

/**
 * Single seam for auth. Import auth from here, never from `@clerk/nextjs` directly,
 * so the dev bypass (`NEXT_PUBLIC_DEV_AUTH=1`) can swap the whole surface at once.
 *
 * IMPORTANT — how the dev bypass behaves:
 *   `useAuth().isSignedIn` is `true`, so signed-in chrome renders and you can build
 *   against it. But `useUser()` deliberately reports `user: null`. Every Supabase
 *   call in the app is gated on `user?.id`, so reporting no user keeps the entire
 *   network layer switched off without sprinkling flag checks through the context.
 *   Workout rows fall back to `userId: "local"`, exactly as in signed-out mode, and
 *   the sync badge stays on "Local only". If you add a new Supabase call, gate it on
 *   `user?.id` and it will inherit this behaviour for free.
 *
 *   The dev implementations are selected at module load, not inside the hook, because
 *   in dev mode there is no ClerkProvider mounted and Clerk's own hooks would throw.
 */

import {
  ClerkProvider,
  SignInButton as ClerkSignInButton,
  UserButton as ClerkUserButton,
  useAuth as useClerkAuth,
  useUser as useClerkUser,
} from "@clerk/nextjs";
import { DEV_USER, IS_DEV_AUTH } from "@/lib/dev-auth";

type ChildrenProps = { children?: React.ReactNode };

// These are module-level singletons on purpose. The context feeds `getToken` into a
// useCallback dependency list, so returning a fresh object per render would invalidate
// it every time and spin the effects into an infinite update loop.
const DEV_AUTH_VALUE = Object.freeze({
  isLoaded: true,
  isSignedIn: true,
  userId: DEV_USER.id,
  sessionId: "sess_local_dev",
  getToken: async () => null,
  signOut: async () => {},
});

const DEV_USER_VALUE = Object.freeze({
  isLoaded: true,
  isSignedIn: false,
  // `user: null` is what keeps Supabase out of the loop — see the note above.
  user: null,
});

function useDevAuth() {
  return DEV_AUTH_VALUE;
}

function useDevUser() {
  return DEV_USER_VALUE;
}

export const useAuth = (
  IS_DEV_AUTH ? (useDevAuth as unknown as typeof useClerkAuth) : useClerkAuth
) as typeof useClerkAuth;

export const useUser = (
  IS_DEV_AUTH ? (useDevUser as unknown as typeof useClerkUser) : useClerkUser
) as typeof useClerkUser;

export function AuthProvider({ children }: ChildrenProps) {
  if (IS_DEV_AUTH) {
    return <>{children}</>;
  }
  return <ClerkProvider>{children}</ClerkProvider>;
}

type SignInButtonProps = React.ComponentProps<typeof ClerkSignInButton>;

export function SignInButton({ children, ...props }: SignInButtonProps) {
  if (IS_DEV_AUTH) {
    // Already "signed in" under dev auth, so the trigger just renders its children.
    return <>{children}</>;
  }
  return <ClerkSignInButton {...props}>{children}</ClerkSignInButton>;
}

export function UserButton() {
  if (IS_DEV_AUTH) {
    return (
      <span
        title={`Dev auth: signed in as ${DEV_USER.fullName}`}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-[#45bb7c] text-xs font-bold text-[#112019]"
      >
        {DEV_USER.initials}
      </span>
    );
  }
  return <ClerkUserButton />;
}
