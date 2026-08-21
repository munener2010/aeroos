"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const days = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

export default function NewAvailabilityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [scope, setScope] = useState<"weekly" | "specific">("weekly");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [specificDate, setSpecificDate] = useState("");
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("17:00");
  const [availabilityType, setAvailabilityType] =
    useState<"available" | "unavailable">("available");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    if (!params.id || params.id === "undefined") {
      setError("Invalid instructor.");
      setLoading(false);
      return;
    }

    if (endTime <= startTime) {
      setError("End time must be after start time.");
      setLoading(false);
      return;
    }

    if (scope === "specific" && !specificDate) {
      setError("Choose a specific date.");
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

    const { data: membership, error: membershipError } = await supabase
      .from("organization_memberships")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership) {
      setError("No organization membership was found.");
      setLoading(false);
      return;
    }

    if (
      membership.role !== "owner" &&
      membership.role !== "operations_manager"
    ) {
      setError("You do not have permission to manage availability.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("instructor_availability")
      .insert({
        organization_id: membership.organization_id,
        instructor_id: params.id,
        day_of_week: scope === "weekly" ? Number(dayOfWeek) : null,
        specific_date: scope === "specific" ? specificDate : null,
        start_time: startTime,
        end_time: endTime,
        availability_type: availabilityType,
        reason: reason.trim() || null,
      });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push(`/instructors/${params.id}`);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          AeroOS
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Add instructor availability
        </h1>

        <p className="mt-2 text-slate-400">
          Configure a recurring schedule or a specific-date exception.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Availability type
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setAvailabilityType("available")}
                className={`rounded-xl border px-4 py-3 text-left ${
                  availabilityType === "available"
                    ? "border-sky-500 bg-sky-500/10 text-sky-300"
                    : "border-slate-700 text-slate-300"
                }`}
              >
                <span className="block font-semibold">Available</span>
                <span className="mt-1 block text-xs text-slate-500">
                  Instructor can be scheduled.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAvailabilityType("unavailable")}
                className={`rounded-xl border px-4 py-3 text-left ${
                  availabilityType === "unavailable"
                    ? "border-red-500 bg-red-500/10 text-red-300"
                    : "border-slate-700 text-slate-300"
                }`}
              >
                <span className="block font-semibold">Unavailable</span>
                <span className="mt-1 block text-xs text-slate-500">
                  Instructor cannot be scheduled.
                </span>
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Schedule scope
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setScope("weekly")}
                className={`rounded-xl border px-4 py-3 text-left ${
                  scope === "weekly"
                    ? "border-sky-500 bg-sky-500/10 text-sky-300"
                    : "border-slate-700 text-slate-300"
                }`}
              >
                <span className="block font-semibold">Weekly</span>
                <span className="mt-1 block text-xs text-slate-500">
                  Repeats every week.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScope("specific")}
                className={`rounded-xl border px-4 py-3 text-left ${
                  scope === "specific"
                    ? "border-sky-500 bg-sky-500/10 text-sky-300"
                    : "border-slate-700 text-slate-300"
                }`}
              >
                <span className="block font-semibold">
                  Specific date
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  One-time exception.
                </span>
              </button>
            </div>
          </div>

          {scope === "weekly" ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Day
              </label>

              <select
                value={dayOfWeek}
                onChange={(event) => setDayOfWeek(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
              >
                {days.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Specific date
              </label>

              <input
                type="date"
                value={specificDate}
                onChange={(event) =>
                  setSpecificDate(event.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
              />
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Start time
              </label>

              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                End time
              </label>

              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Reason / notes
            </label>

            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
              placeholder="Optional explanation..."
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
              onClick={() => router.back()}
              className="rounded-xl border border-slate-700 px-5 py-3 font-medium text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save availability"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
