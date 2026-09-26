/**
 * Dev-only auth bypass, for working on the UI without Clerk or Supabase credentials.
 *
 * Enabled by `NEXT_PUBLIC_DEV_AUTH=1` in `.env.local`. The `NODE_ENV` check means
 * this stays inert in a production build even if the variable is ever set there,
 * so a stray env var on Vercel cannot switch real auth off.
 */
export const IS_DEV_AUTH =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEV_AUTH === "1";

export const DEV_USER = {
  id: "user_local_dev",
  firstName: "Local",
  lastName: "Tester",
  fullName: "Local Tester",
  initials: "LT",
};
