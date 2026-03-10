import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allow running via `npm run sync:exercises` without manual env export.
loadEnv({ path: path.resolve(__dirname, "../.env.local"), override: false });
loadEnv({ path: path.resolve(__dirname, "../.env"), override: false });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing env vars. Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const catalogPath = path.resolve(__dirname, "../data/global-exercises.json");
const rawCatalog = await readFile(catalogPath, "utf8");
const catalog = JSON.parse(rawCatalog);

if (!Array.isArray(catalog)) {
  console.error("Invalid catalog format. Expected an array in data/global-exercises.json.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const rows = catalog.map((exercise) => ({
  slug: exercise.slug,
  name: exercise.name,
  primary_muscle: exercise.primaryMuscle,
  secondary_muscles: exercise.secondaryMuscles ?? [],
  equipment: exercise.equipment,
  movement_pattern: exercise.movementPattern,
  description: exercise.description,
  is_global: true,
  created_by: null,
  is_active: true,
}));

const { error } = await supabase.from("exercises").upsert(rows, {
  onConflict: "slug",
});

if (error) {
  console.error("Failed to sync global exercises:", error.message);
  process.exit(1);
}

console.log(`Synced ${rows.length} global exercises from data/global-exercises.json`);
