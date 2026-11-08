StrongLifts-style 5x5 workout app built with Next.js, Clerk auth, and Supabase persistence.

## Getting Started

1) Install dependencies:

```bash
npm install
```

2) Configure env vars:

```bash
cp .env.example .env.local
```

Fill in Clerk + Supabase keys in `.env.local`.

3) Create Supabase tables and policies:

- Open your Supabase SQL editor
- Run `supabase/schema.sql`

4) (Optional but recommended) Sync global exercise catalog:

```bash
npm run sync:exercises
```

This reads `data/global-exercises.json` and upserts global exercises idempotently.
It requires `SUPABASE_SERVICE_ROLE_KEY` in your environment.

5) Run dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment

The app is hosted on Vercel at [git-swole.vercel.app](https://git-swole.vercel.app), and deploys run from GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)):

- **Push to `main`** builds and deploys to production. `git-swole.vercel.app` updates automatically.
- **Pull requests** get a preview deployment, and the workflow comments the preview URL on the PR.
- **Manual run** (Actions tab, "Deploy to Vercel", "Run workflow") deploys a preview.

The app is built inside GitHub Actions (`vercel build`) and the finished build is uploaded (`vercel deploy --prebuilt`). That means the app's env vars come from GitHub secrets, not from the Vercel dashboard. A redeploy started from the Vercel dashboard won't have them, so redeploy by re-running the workflow instead.

[vercel.json](vercel.json) turns off Vercel's own Git deploys, so pushes don't deploy twice.

### GitHub secrets

These are set in GitHub under Settings, then Secrets and variables, then Actions. The names must match exactly.

| Secret | What it is | Where to get it |
|---|---|---|
| `VERCEL_TOKEN` | Lets the workflow deploy to Vercel | Vercel web: Account Settings, then Tokens |
| `VERCEL_ORG_ID` | Vercel team/account ID (`team_...`) | Vercel CLI: run `npx vercel link`, then read `orgId` in `.vercel/repo.json` (or `.vercel/project.json`) |
| `VERCEL_PROJECT_ID` | Vercel project ID (`prj_...`) | Vercel CLI: same file, `id` / `projectId`. Also in Vercel web: Project Settings, then General |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key (`pk_...`) | Clerk dashboard: Configure, then API Keys |
| `CLERK_SECRET_KEY` | Clerk server key (`sk_...`) | Clerk dashboard: Configure, then API Keys |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase dashboard: Project Settings, then API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key | Supabase dashboard: Project Settings, then API |

Keep `SUPABASE_SERVICE_ROLE_KEY` out of GitHub and Vercel. Only the local `npm run sync:exercises` script uses it, and it bypasses row-level security, so it can read and change everything in the database.

### Transferring ownership

If the app moves to a new owner, these are the pieces to transfer:

- **GitHub repo:** Settings, then Transfer ownership. Repo secrets move with the repo, but any secret tied to a personal account (like `VERCEL_TOKEN`) should be regenerated.
- **Vercel project:** transfer the project to the new owner's account or team, or redeploy it there. Then update `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` and `VERCEL_TOKEN`.
- **Clerk and Supabase:** add the new owner as a member of the Clerk application and the Supabase project (or transfer them). The keys stay the same unless they're rotated.

## Implemented Features

- Workout A/B alternation with automatic next workout selection
- 5x5 logic + deadlift 1x5 support
- Set-by-set workout session flow with rest timer (auto-start on set complete)
- Progression: +5 by default (+10 deadlift), fail holds, deload after 3 failed attempts
- Workout history with detail view, set editing, and delete
- PR tracking (max weight, best volume, best set)
- Progress charts for weight and volume
- Settings: units, increment, rest duration, barbell weight, editable A/B exercise slots
- Plate calculator and warmup generator in workout screen
- Notes per workout

## App Routes

- `/` dashboard / next workout
- `/workout` training session screen
- `/history` workout history
- `/progress` progress graphs + PRs
- `/settings` customization + exercise database

## Notes

- Local persistence works without auth (localStorage fallback).
- When signed in with Clerk, settings/progression/workouts sync through Supabase.
- Global exercise catalog source of truth lives in `data/global-exercises.json`.
- `npm run sync:exercises` can be safely rerun after catalog edits.
