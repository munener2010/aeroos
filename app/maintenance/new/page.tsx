"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Aircraft = {
  id: string;
  registration: string;
  aircraft_type: string;
  total_hours: number;
  total_cycles: number;
};

export default function NewMaintenanceTaskPage() {
  const router = useRouter();
  const supabase = createClient();

  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [aircraftId, setAircraftId] = useState("");

  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");

  const [intervalHours, setIntervalHours] = useState("");
  const [intervalCycles, setIntervalCycles] = useState("");
  const [intervalDays, setIntervalDays] = useState("");

  const [lastCompletedAt, setLastCompletedAt] = useState("");
  const [lastCompletedHours, setLastCompletedHours] = useState("");
  const [lastCompletedCycles, setLastCompletedCycles] = useState("");

  const [dueDate, setDueDate] = useState("");
  const [dueHours, setDueHours] = useState("");
  const [dueCycles, setDueCycles] = useState("");

  const [blocksDispatch, setBlocksDispatch] = useState(false);
  const [notes, setNotes] = useState("");

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAircraft() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: membership, error: membershipError } =
        await supabase
          .from("organization_memberships")
          .select("organization_id, role")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

      if (membershipError || !membership) {
        setError("No organization membership was found.");
        setLoadingData(false);
        return;
      }

      const { data, error: aircraftError } =
        await supabase
          .from("aircraft")
          .select(
            "id, registration, aircraft_type, total_hours, total_cycles"
          )
          .eq("organization_id", membership.organization_id)
          .order("registration", { ascending: true });

      if (aircraftError) {
        setError(aircraftError.message);
        setLoadingData(false);
        return;
      }

      setAircraft(data ?? []);

      if (data && data.length > 0) {
        setAircraftId(data[0].id);
      }

      setLoadingData(false);
    }

    loadAircraft();
  }, [router, supabase]);

  function calculateDueValues() {
    const selectedAircraft = aircraft.find(
      (item) => item.id === aircraftId
    );

    if (!selectedAircraft) {
      return;
    }

    const currentHours = Number(
      lastCompletedHours !== ""
        ? lastCompletedHours
        : selectedAircraft.total_hours
    );

    const currentCycles = Number(
      lastCompletedCycles !== ""
        ? lastCompletedCycles
        : selectedAircraft.total_cycles
    );

    const hoursInterval =
      intervalHours !== ""
        ? Number(intervalHours)
        : null;

    const cyclesInterval =
      intervalCycles !== ""
        ? Number(intervalCycles)
        : null;

    if (
      hoursInterval !== null &&
      Number.isFinite(hoursInterval) &&
      hoursInterval > 0
    ) {
      setDueHours(
        (currentHours + hoursInterval).toFixed(2)
      );
    }

    if (
      cyclesInterval !== null &&
      Number.isFinite(cyclesInterval) &&
      cyclesInterval > 0
    ) {
      setDueCycles(
        String(
          Math.round(
            currentCycles + cyclesInterval
          )
        )
      );
    }

    if (
      lastCompletedAt &&
      intervalDays !== "" &&
      Number(intervalDays) > 0
    ) {
      const baseDate = new Date(
        `${lastCompletedAt}T00:00:00`
      );

      baseDate.setDate(
        baseDate.getDate() + Number(intervalDays)
      );

      setDueDate(
        `${baseDate.getFullYear()}-${String(
          baseDate.getMonth() + 1
        ).padStart(2, "0")}-${String(
          baseDate.getDate()
        ).padStart(2, "0")}`
      );
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    if (!aircraftId) {
      setError("Choose an aircraft.");
      setSaving(false);
      return;
    }

    if (!taskName.trim()) {
      setError("Maintenance task name is required.");
      setSaving(false);
      return;
    }

    const hours = intervalHours
      ? Number(intervalHours)
      : null;

    const cycles = intervalCycles
      ? Number(intervalCycles)
      : null;

    const days = intervalDays
      ? Number(intervalDays)
      : null;

    if (
      hours === null &&
      cycles === null &&
      days === null
    ) {
      setError(
        "Add at least one maintenance interval: hours, cycles, or days."
      );
      setSaving(false);
      return;
    }

    if (
      hours !== null &&
      (!Number.isFinite(hours) || hours <= 0)
    ) {
      setError("Hour interval must be greater than zero.");
      setSaving(false);
      return;
    }

    if (
      cycles !== null &&
      (!Number.isInteger(cycles) || cycles <= 0)
    ) {
      setError(
        "Cycle interval must be a whole number greater than zero."
      );
      setSaving(false);
      return;
    }

    if (
      days !== null &&
      (!Number.isInteger(days) || days <= 0)
    ) {
      setError(
        "Day interval must be a whole number greater than zero."
      );
      setSaving(false);
      return;
    }

    const { data: membership, error: membershipError } =
      await supabase
        .from("organization_memberships")
        .select("organization_id, role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (membershipError || !membership) {
      setError("No organization membership was found.");
      setSaving(false);
      return;
    }

    if (
      membership.role !== "owner" &&
      membership.role !== "operations_manager"
    ) {
      setError(
        "You do not have permission to create maintenance tasks."
      );
      setSaving(false);
      return;
    }

    const { error: insertError } =
      await supabase
        .from("aircraft_maintenance_tasks")
        .insert({
          organization_id:
            membership.organization_id,

          aircraft_id: aircraftId,

          task_name: taskName.trim(),

          description:
            description.trim() || null,

          interval_hours: hours,
          interval_cycles: cycles,
          interval_days: days,

          last_completed_at:
            lastCompletedAt || null,

          last_completed_hours:
            lastCompletedHours !== ""
              ? Number(lastCompletedHours)
              : null,

          last_completed_cycles:
            lastCompletedCycles !== ""
              ? Number(lastCompletedCycles)
              : null,

          due_date: dueDate || null,

          due_hours:
            dueHours !== ""
              ? Number(dueHours)
              : null,

          due_cycles:
            dueCycles !== ""
              ? Number(dueCycles)
              : null,

          status: "current",

          blocks_dispatch: blocksDispatch,

          notes:
            notes.trim() || null,
        });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    router.push("/maintenance");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          AeroOS
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Add maintenance task
        </h1>

        <p className="mt-2 text-slate-400">
          Configure when this aircraft maintenance requirement becomes due.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-8 rounded-2xl border border-slate-800 bg-slate-900 p-8"
        >
          {loadingData ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
              Loading aircraft...
            </div>
          ) : (
            <>
              <section>
                <h2 className="text-lg font-semibold">
                  Task information
                </h2>

                <div className="mt-5 space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Aircraft
                    </label>

                    <select
                      value={aircraftId}
                      onChange={(event) =>
                        setAircraftId(event.target.value)
                      }
                      required
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                    >
                      {aircraft.map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.registration} —{" "}
                          {item.aircraft_type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Task name
                    </label>

                    <input
                      value={taskName}
                      onChange={(event) =>
                        setTaskName(event.target.value)
                      }
                      required
                      placeholder="100-hour inspection"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Description
                    </label>

                    <textarea
                      value={description}
                      onChange={(event) =>
                        setDescription(event.target.value)
                      }
                      rows={4}
                      placeholder="Describe the maintenance requirement..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold">
                  Maintenance interval
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Use one or more interval types.
                </p>

                <div className="mt-5 grid gap-5 md:grid-cols-3">
                  <NumberField
                    label="Every flight hours"
                    value={intervalHours}
                    onChange={setIntervalHours}
                    placeholder="100"
                  />

                  <NumberField
                    label="Every cycles"
                    value={intervalCycles}
                    onChange={setIntervalCycles}
                    placeholder="50"
                  />

                  <NumberField
                    label="Every days"
                    value={intervalDays}
                    onChange={setIntervalDays}
                    placeholder="365"
                  />
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold">
                  Last completion
                </h2>

                <div className="mt-5 grid gap-5 md:grid-cols-3">
                  <DateField
                    label="Completion date"
                    value={lastCompletedAt}
                    onChange={setLastCompletedAt}
                  />

                  <NumberField
                    label="Aircraft hours at completion"
                    value={lastCompletedHours}
                    onChange={setLastCompletedHours}
                    placeholder="500"
                  />

                  <NumberField
                    label="Cycles at completion"
                    value={lastCompletedCycles}
                    onChange={setLastCompletedCycles}
                    placeholder="300"
                  />
                </div>

                <button
                  type="button"
                  onClick={calculateDueValues}
                  className="mt-5 rounded-xl border border-sky-700 px-4 py-2.5 text-sm font-semibold text-sky-300 hover:bg-sky-500/10"
                >
                  Calculate due values
                </button>
              </section>

              <section>
                <h2 className="text-lg font-semibold">
                  Due thresholds
                </h2>

                <div className="mt-5 grid gap-5 md:grid-cols-3">
                  <DateField
                    label="Due date"
                    value={dueDate}
                    onChange={setDueDate}
                  />

                  <NumberField
                    label="Due aircraft hours"
                    value={dueHours}
                    onChange={setDueHours}
                    placeholder="600"
                  />

                  <NumberField
                    label="Due cycles"
                    value={dueCycles}
                    onChange={setDueCycles}
                    placeholder="350"
                  />
                </div>
              </section>

              <label className="flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/20 p-4">
                <input
                  type="checkbox"
                  checked={blocksDispatch}
                  onChange={(event) =>
                    setBlocksDispatch(event.target.checked)
                  }
                  className="mt-1 h-4 w-4"
                />

                <span>
                  <span className="block font-medium text-red-300">
                    This task blocks dispatch when overdue
                  </span>

                  <span className="mt-1 block text-sm leading-6 text-red-200/60">
                    Use this for maintenance requirements that should prevent
                    the aircraft from being dispatched when overdue.
                  </span>
                </span>
              </label>

              <section>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Notes
                </label>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  rows={4}
                  placeholder="Maintenance planning notes..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                />
              </section>
            </>
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
              disabled={saving || loadingData}
              className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : "Create maintenance task"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </label>

      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
      />
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </label>

      <input
        type="date"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
      />
    </div>
  );
}