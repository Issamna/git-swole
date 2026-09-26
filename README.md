Linear-progression barbell tracker built with Next.js, Clerk auth, and Supabase persistence.

The interface implements the design in `design_handoff_git_swole/` — a near-black,
hairline-and-Anton visual language across six screens, built around a session
screen that shows one set at a time.

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

## Local development without accounts

For UI work you do not need Clerk or Supabase credentials at all. Put this in
`.env.local`:

```bash
NEXT_PUBLIC_DEV_AUTH=1
```

Then `npm run dev`. The app treats you as signed in as a fake local user, so
signed-in chrome renders, and it seeds ~8 weeks of realistic workout history the
first time it loads so History, Progress, and PRs are not empty. Nothing touches
the network: the sync badge stays on "Local only" and all data lives in
localStorage.

Console helpers are available while the flag is on:

```js
gitSwoleDev.seed()   // regenerate the seeded history
gitSwoleDev.reset()  // clear local state (back to a first-run app)
gitSwoleDev.empty()  // keep defaults but no workout history, for empty states
```

The flag is ignored when `NODE_ENV` is production, so it cannot disable real auth
on a deployed build. Leave it unset to exercise the real Clerk and Supabase path.

## Implemented Features

- Three-day program rotating A → B → A → C, editable per day
- Exercise modes: BB progresses by its own step, BW / TIME / DIST are logged only
- One-set-at-a-time session screen: warm-up ramp, plate maths, loaded-bar diagram,
  reps stepper, one log button, and the whole session queued underneath
- Warm-up ramp of three sets (bar / 50% / 75%), excluded from volume and progression
- Rest timer that starts itself and picks its length from the result — short after
  a hit, long after a miss — skippable and extendable by 30 s
- Any pending set cell is tappable to log out of order; warm-up cells toggle
- In-progress sessions resume after leaving the screen
- Progression: per-exercise step, fail holds, deload after 3 failed attempts
- Log of past sessions with per-set rep cells
- Progress charts with 3M / 6M / 1Y / 2Y / 5Y ranges, plus best set, best volume,
  estimated 1RM and session count
- Plate inventory: pair counts per plate, and plate maths bounded by what you own
- StrongLifts CSV import

## App Routes

- `/` Today — week strip, planned lifts, start the session
- `/workout` Session — one set at a time
- `/history` Log — past sessions
- `/progress` Progress — charts, ranges, PRs
- `/program` Program — inline-editable days
- `/settings` Settings — preferences, plate inventory, exercises & data
- `/import` StrongLifts CSV import

## Notes

- Local persistence works without auth (localStorage fallback).
- When signed in with Clerk, settings/progression/workouts sync through Supabase.
- Global exercise catalog source of truth lives in `data/global-exercises.json`.
- `npm run sync:exercises` can be safely rerun after catalog edits.
