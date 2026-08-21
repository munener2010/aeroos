"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewAircraftPage() {
  const router = useRouter();
  const supabase = createClient();

  const [registration, setRegistration] = useState("");
  const [aircraftType, setAircraftType] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [baseLocation, setBaseLocation] = useState("");
  const [totalHours, setTotalHours] = useState("0");
  const [totalCycles, setTotalCycles] = useState("0");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
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

    const allowedRoles = [
      "owner",
      "operations_manager",
    ];

    if (!allowedRoles.includes(membership.role)) {
      setError("You do not have permission to add aircraft.");
      setLoading(false);
      return;
    }

    const cleanRegistration = registration.trim().toUpperCase();
    const cleanAircraftType = aircraftType.trim();

    if (!cleanRegistration) {
      setError("Aircraft registration is required.");
      setLoading(false);
      return;
    }

    if (!cleanAircraftType) {
      setError("Aircraft type is required.");
      setLoading(false);
      return;
    }

    const parsedYear = year ? Number(year) : null;
    const parsedHours = Number(totalHours);
    const parsedCycles = Number(totalCycles);

    if (year && (!Number.isInteger(parsedYear) || parsedYear < 1900)) {
      setError("Enter a valid aircraft year.");
      setLoading(false);
      return;
    }

    if (!Number.isFinite(parsedHours) || parsedHours < 0) {
      setError("Total hours must be zero or greater.");
      setLoading(false);
      return;
    }

    if (!Number.isInteger(parsedCycles) || parsedCycles < 0) {
      setError("Total cycles must be a whole number of zero or greater.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("aircraft").insert({
      organization_id: membership.organization_id,
      registration: cleanRegistration,
      aircraft_type: cleanAircraftType,
      manufacturer: manufacturer.trim() || null,
      model: model.trim() || null,
      year: parsedYear,
      status: "available",
      base_location: baseLocation.trim() || null,
      total_hours: parsedHours,
      total_cycles: parsedCycles,
      notes: notes.trim() || null,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        setError(
          `Aircraft ${cleanRegistration} already exists in this organization.`
        );
      } else {
        setError(insertError.message);
      }

      setLoading(false);
      return;
    }

    router.push("/aircraft");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
            AeroOS
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Add aircraft
          </h1>

          <p className="mt-2 text-slate-400">
            Add an aircraft to your organization's fleet.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-8 rounded-2xl border border-slate-800 bg-slate-900 p-8"
        >
          <section>
            <h2 className="text-lg font-semibold">Aircraft identity</h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field
                label="Registration"
                value={registration}
                onChange={setRegistration}
                placeholder="5Y-ABC"
                required
              />

              <Field
                label="Aircraft type"
                value={aircraftType}
                onChange={setAircraftType}
                placeholder="Cessna 172"
                required
              />

              <Field
                label="Manufacturer"
                value={manufacturer}
                onChange={setManufacturer}
                placeholder="Cessna"
              />

              <Field
                label="Model"
                value={model}
                onChange={setModel}
                placeholder="172S"
              />

              <Field
                label="Year"
                type="number"
                value={year}
                onChange={setYear}
                placeholder="2024"
              />

              <Field
                label="Base location"
                value={baseLocation}
                onChange={setBaseLocation}
                placeholder="HKJK"
              />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Current aircraft readings</h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field
                label="Total hours"
                type="number"
                step="0.01"
                value={totalHours}
                onChange={setTotalHours}
                placeholder="0"
              />

              <Field
                label="Total cycles"
                type="number"
                step="1"
                value={totalCycles}
                onChange={setTotalCycles}
                placeholder="0"
              />
            </div>
          </section>

          <section>
            <label
              htmlFor="notes"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Notes
            </label>

            <textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
              placeholder="Optional operational notes"
            />
          </section>

          {error && (
            <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/aircraft")}
              className="rounded-xl border border-slate-700 px-5 py-3 font-medium text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Adding aircraft..." : "Add aircraft"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  step?: string;
  required?: boolean;
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  step,
  required = false,
}: FieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </label>

      <input
        type={type}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
      />
    </div>
  );
}