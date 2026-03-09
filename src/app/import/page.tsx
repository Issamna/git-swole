"use client";

import { useState } from "react";
import { parseStrongLiftsCsv } from "@/lib/importer";
import { useWorkoutApp } from "@/context/workout-app-context";

export default function ImportPage() {
  const { importWorkouts } = useWorkoutApp();
  const [csvText, setCsvText] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileUpload = async (file: File) => {
    const text = await file.text();
    setCsvText(text);
  };

  const runImport = async () => {
    setResultMessage(null);
    const parsed = parseStrongLiftsCsv(csvText);
    setIssues(parsed.issues);

    if (parsed.workouts.length === 0) {
      setResultMessage("No importable workouts were found in this CSV.");
      return;
    }

    setIsImporting(true);
    try {
      const result = await importWorkouts(parsed.workouts);
      setResultMessage(
        `Imported ${result.imported} workouts${result.skipped > 0 ? `, skipped ${result.skipped} duplicates.` : "."}`,
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Import Workout History</h1>

      <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
        <div className="text-sm text-[#9ab0bd]">How your CSV should look</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#d7e4eb]">
          <li>Header row must include: Date (yyyy/mm/dd), Workout Name, Exercise, SetsxReps, Set 1..5 columns.</li>
          <li>Supported exercises: Squat, Bench Press, Barbell Row, Overhead Press, Deadlift.</li>
          <li>Unsupported exercises are skipped and shown in import issues.</li>
          <li>Date format expected: yyyy/mm/dd (as exported by StrongLifts CSV).</li>
        </ul>
      </div>

      <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
        <label className="block text-sm text-[#9ab0bd]">Upload CSV file</label>
        <input
          type="file"
          accept=".csv,text/csv"
          className="mt-2 block w-full text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void handleFileUpload(file);
          }}
        />
      </div>

      <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4">
        <label className="block text-sm text-[#9ab0bd]">CSV Preview / Paste</label>
        <textarea
          className="mt-2 min-h-56 w-full rounded border border-[#334753] bg-[#2b3a43] px-3 py-2 text-sm"
          placeholder="Paste CSV contents here, or upload above."
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
        />
        <button
          type="button"
          disabled={!csvText.trim() || isImporting}
          className="mt-3 rounded-lg bg-[#45bb7c] px-4 py-2 text-sm font-medium text-[#112019] disabled:bg-[#334753] disabled:text-[#8ca5b3]"
          onClick={() => void runImport()}
        >
          {isImporting ? "Importing..." : "Import Workouts"}
        </button>
      </div>

      {resultMessage ? (
        <div className="rounded-xl border border-[#334753] bg-[#24323a] p-4 text-sm text-[#d7e4eb]">
          {resultMessage}
        </div>
      ) : null}

      {issues.length > 0 ? (
        <div className="rounded-xl border border-amber-600/40 bg-[#2b3a43] p-4">
          <div className="text-sm font-medium text-amber-300">Import issues</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-200">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
