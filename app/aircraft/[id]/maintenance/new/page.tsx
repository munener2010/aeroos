"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewMaintenancePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [maintenanceType, setMaintenanceType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueHours, setDueHours] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

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
      setError("You do not have permission to create maintenance records.");
      setLoading(false);
      return;
    }

    if (!maintenanceType.trim() || !title.trim()) {
      setError("Maintenance type and title are required.");
      setLoading(false);
      return;
    }

    const parsedDueHours = dueHours ? Number(dueHours) : null;

    if (
      parsedDueHours !== null &&
      (!Number.isFinite(parsedDueHours) || parsedDueHours < 0)
    ) {
      setError("Due hours must be zero or greater.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("maintenance_records")
      .insert({
        organization_id: membership.organization_id,
        aircraft_id: params.id,
        maintenance_type: maintenanceType.trim(),
        title: title.trim(),
        description: description.trim() || null,
        status: "open",
        due_date: dueDate || null,
        due_hours: parsedDueHours,
        performed_by: performedBy.trim() || null,
        notes: notes.trim() || null,
      });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push(`/aircraft/${params.id}`);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          AeroOS
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Add maintenance record
        </h1>

        <p className="mt-2 text-slate-400">
          Record a scheduled or outstanding maintenance item for this aircraft.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Maintenance type
            </label>

            <input
              value={maintenanceType}
              onChange={(event) => setMaintenanceType(event.target.value)}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
              placeholder="Scheduled inspection"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Title
            </label>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
              placeholder="100-hour inspection"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Description
            </label>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
              placeholder="Maintenance details..."
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Due date
              </label>

              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Due at aircraft hours
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={dueHours}
                onChange={(event) => setDueHours(event.target.value)}
                placeholder="1350.00"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Performed by
            </label>

            <input
              value={performedBy}
              onChange={(event) => setPerformedBy(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
              placeholder="Maintenance organization / engineer"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Notes
            </label>

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
              placeholder="Additional notes..."
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
              {loading ? "Saving..." : "Add maintenance record"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
