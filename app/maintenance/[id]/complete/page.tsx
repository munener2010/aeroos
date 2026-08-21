"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type MaintenanceTask = {
  id: string;
  task_name: string;
  aircraft_id: string;

  interval_hours: number | null;
  interval_cycles: number | null;
  interval_days: number | null;

  due_date: string | null;
  due_hours: number | null;
  due_cycles: number | null;

  aircraft: {
    registration: string;
    aircraft_type: string;
    total_hours: number;
    total_cycles: number;
  } | null;
};

export default function CompleteMaintenancePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const supabase = createClient();

  const [task, setTask] =
    useState<MaintenanceTask | null>(null);

  const [aircraftHours, setAircraftHours] = useState("");
  const [aircraftCycles, setAircraftCycles] = useState("");

  const [workPerformed, setWorkPerformed] = useState("");
  const [findings, setFindings] = useState("");
  const [partsUsed, setPartsUsed] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTask() {
      const taskId = params.id;

      if (!taskId || taskId === "undefined") {
        setError("Invalid maintenance task.");
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: taskData, error: taskError } =
        await supabase
          .from("aircraft_maintenance_tasks")
          .select(
            `
              id,
              task_name,
              aircraft_id,
              interval_hours,
              interval_cycles,
              interval_days,
              due_date,
              due_hours,
              due_cycles,

              aircraft (
                registration,
                aircraft_type,
                total_hours,
                total_cycles
              )
            `
          )
          .eq("id", taskId)
          .maybeSingle();

      if (taskError || !taskData) {
        setError(
          taskError?.message ??
            "Maintenance task not found."
        );
        setLoading(false);
        return;
      }

      const normalizedTask: MaintenanceTask = {
        ...taskData,
        aircraft: Array.isArray(taskData.aircraft)
          ? taskData.aircraft[0] ?? null
          : taskData.aircraft,
      };

      setTask(normalizedTask);

      if (normalizedTask.aircraft) {
        setAircraftHours(
          Number(
            normalizedTask.aircraft.total_hours
          ).toFixed(2)
        );

        setAircraftCycles(
          String(
            normalizedTask.aircraft.total_cycles
          )
        );
      }

      setLoading(false);
    }

    loadTask();
  }, [params.id, router, supabase]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    if (!task) {
      setError("Maintenance task not found.");
      setSaving(false);
      return;
    }

    const hours = Number(aircraftHours);
    const cycles = Number(aircraftCycles);

    if (!Number.isFinite(hours) || hours < 0) {
      setError(
        "Aircraft hours must be zero or greater."
      );
      setSaving(false);
      return;
    }

    if (
      !Number.isInteger(cycles) ||
      cycles < 0
    ) {
      setError(
        "Aircraft cycles must be a whole number of zero or greater."
      );
      setSaving(false);
      return;
    }

    if (!workPerformed.trim()) {
      setError("Work performed is required.");
      setSaving(false);
      return;
    }

    const { data, error: completionError } =
      await supabase.rpc(
        "complete_aircraft_maintenance",
        {
          p_maintenance_task_id: task.id,
          p_aircraft_hours: hours,
          p_aircraft_cycles: cycles,
          p_work_performed: workPerformed.trim(),
          p_findings: findings.trim() || null,
          p_parts_used: partsUsed.trim() || null,
          p_notes: notes.trim() || null,
        }
      );

    if (completionError) {
      setError(completionError.message);
      setSaving(false);
      return;
    }

    if (!data) {
      setError(
        "Maintenance completion could not be recorded."
      );
      setSaving(false);
      return;
    }

    router.push("/maintenance");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
            Loading maintenance task...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          AeroOS
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Complete maintenance
        </h1>

        <p className="mt-2 text-slate-400">
          Record the maintenance work and establish the next due threshold.
        </p>

        {task && (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Maintenance task
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              {task.task_name}
            </h2>

            <p className="mt-2 text-slate-400">
              {task.aircraft?.registration || "Unknown aircraft"}
              {task.aircraft?.aircraft_type
                ? ` — ${task.aircraft.aircraft_type}`
                : ""}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <InfoCard
                label="Current hours"
                value={
                  task.aircraft
                    ? Number(
                        task.aircraft.total_hours
                      ).toFixed(2)
                    : "—"
                }
              />

              <InfoCard
                label="Current cycles"
                value={
                  task.aircraft
                    ? String(
                        task.aircraft.total_cycles
                      )
                    : "—"
                }
              />

              <InfoCard
                label="Current status"
                value={
                  task.due_hours !== null ||
                  task.due_cycles !== null ||
                  task.due_date
                    ? "Maintenance due threshold configured"
                    : "No threshold configured"
                }
              />
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Aircraft hours at completion
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={aircraftHours}
              onChange={(event) =>
                setAircraftHours(
                  event.target.value
                )
              }
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              This should normally match the aircraft&apos;s current hour
              total.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Aircraft cycles at completion
            </label>

            <input
              type="number"
              min="0"
              step="1"
              value={aircraftCycles}
              onChange={(event) =>
                setAircraftCycles(
                  event.target.value
                )
              }
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Work performed
            </label>

            <textarea
              value={workPerformed}
              onChange={(event) =>
                setWorkPerformed(
                  event.target.value
                )
              }
              rows={5}
              required
              placeholder="Describe the maintenance work completed..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Findings
            </label>

            <textarea
              value={findings}
              onChange={(event) =>
                setFindings(event.target.value)
              }
              rows={4}
              placeholder="Inspection findings or discrepancies..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Parts used
            </label>

            <textarea
              value={partsUsed}
              onChange={(event) =>
                setPartsUsed(event.target.value)
              }
              rows={3}
              placeholder="Parts, components, or materials used..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Notes
            </label>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              rows={4}
              placeholder="Additional maintenance notes..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            />
          </div>

          {task && (
            <div className="rounded-xl border border-sky-900 bg-sky-950/20 p-4">
              <p className="font-medium text-sky-300">
                Next due values will be calculated automatically.
              </p>

              <div className="mt-3 space-y-1 text-sm text-sky-200/70">
                {task.interval_hours !== null && (
                  <p>
                    Every {task.interval_hours} flight hours
                  </p>
                )}

                {task.interval_cycles !== null && (
                  <p>
                    Every {task.interval_cycles} cycles
                  </p>
                )}

                {task.interval_days !== null && (
                  <p>
                    Every {task.interval_days} days
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() =>
                router.push("/maintenance")
              }
              className="rounded-xl border border-slate-700 px-5 py-3 font-medium text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Recording..."
                : "Complete maintenance"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-medium text-slate-200">
        {value}
      </p>
    </div>
  );
}