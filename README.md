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
