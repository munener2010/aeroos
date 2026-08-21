"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PostFlightPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [actualMinutes, setActualMinutes] = useState("90");
  const [aircraftCycles, setAircraftCycles] = useState("1");
  const [lessonResult, setLessonResult] = useState("completed");
  const [instructorNotes, setInstructorNotes] = useState("");
  const [flightNotes, setFlightNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const flightId = params.id;

    if (!flightId || flightId === "undefined") {
      setError("Invalid flight.");
      setLoading(false);
      return;
    }

    const minutes = Number(actualMinutes);
    const cycles = Number(aircraftCycles);

    if (!Number.isInteger(minutes) || minutes <= 0) {
      setError("Actual flight time must be a positive whole number of minutes.");
      setLoading(false);
      return;
    }

    if (!Number.isInteger(cycles) || cycles < 0) {
      setError("Aircraft cycles must be a whole number of zero or greater.");
      setLoading(false);
      return;
    }

    const { data, error: completionError } = await supabase.rpc(
      "complete_flight",
      {
        p_flight_id: flightId,
        p_actual_flight_minutes: minutes,
        p_aircraft_cycles: cycles,
        p_lesson_result: lessonResult,
        p_instructor_notes: instructorNotes.trim() || null,
        p_flight_notes: flightNotes.trim() || null,
      }
    );

    if (completionError) {
      setError(completionError.message);
      setLoading(false);
      return;
    }

    if (!data) {
      setError("Flight could not be completed.");
      setLoading(false);
      return;
    }

    router.push("/dispatch");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          AeroOS
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Post-flight report
        </h1>

        <p className="mt-2 text-slate-400">
          Record the actual operation and close the flight.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Actual flight time (minutes)
            </label>

            <input
              type="number"
              min="1"
              step="1"
              value={actualMinutes}
              onChange={(event) =>
                setActualMinutes(event.target.value)
              }
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              Example: 90 = 1.5 hours.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Aircraft cycles
            </label>

            <input
              type="number"
              min="0"
              step="1"
              value={aircraftCycles}
              onChange={(event) =>
                setAircraftCycles(event.target.value)
              }
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Lesson result
            </label>

            <select
              value={lessonResult}
              onChange={(event) =>
                setLessonResult(event.target.value)
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            >
              <option value="completed">
                Completed
              </option>

              <option value="needs_review">
                Needs review
              </option>

              <option value="not_completed">
                Not completed
              </option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Instructor notes
            </label>

            <textarea
              value={instructorNotes}
              onChange={(event) =>
                setInstructorNotes(event.target.value)
              }
              rows={5}
              placeholder="Training assessment and instructor observations..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Flight notes
            </label>

            <textarea
              value={flightNotes}
              onChange={(event) =>
                setFlightNotes(event.target.value)
              }
              rows={4}
              placeholder="Operational notes, delays, observations..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/dispatch")}
              className="rounded-xl border border-slate-700 px-5 py-3 font-medium text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Closing flight..." : "Complete flight"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}