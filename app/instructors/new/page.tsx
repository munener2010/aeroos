"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewInstructorPage() {
  const router = useRouter();
  const supabase = createClient();

  const [instructorNumber, setInstructorNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [instructorType, setInstructorType] = useState("");
  const [primaryLocation, setPrimaryLocation] = useState("");
  const [totalFlightHours, setTotalFlightHours] = useState("0");
  const [totalInstructionHours, setTotalInstructionHours] = useState("0");
  const [availabilityNotes, setAvailabilityNotes] = useState("");
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

    const allowedRoles = ["owner", "operations_manager"];

    if (!allowedRoles.includes(membership.role)) {
      setError("You do not have permission to add instructors.");
      setLoading(false);
      return;
    }

    if (!fullName.trim()) {
      setError("Instructor name is required.");
      setLoading(false);
      return;
    }

    const flightHours = Number(totalFlightHours);
    const instructionHours = Number(totalInstructionHours);

    if (!Number.isFinite(flightHours) || flightHours < 0) {
      setError("Total flight hours must be zero or greater.");
      setLoading(false);
      return;
    }

    if (!Number.isFinite(instructionHours) || instructionHours < 0) {
      setError("Total instruction hours must be zero or greater.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("instructors")
      .insert({
        organization_id: membership.organization_id,
        instructor_number: instructorNumber.trim() || null,
        full_name: fullName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        status: "active",
        instructor_type: instructorType.trim() || null,
        primary_location: primaryLocation.trim() || null,
        total_flight_hours: flightHours,
        total_instruction_hours: instructionHours,
        availability_notes: availabilityNotes.trim() || null,
        notes: notes.trim() || null,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        setError(
          "That instructor number already exists in this organization."
        );
      } else {
        setError(insertError.message);
      }

      setLoading(false);
      return;
    }

    router.push("/instructors");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          AeroOS
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Add instructor
        </h1>

        <p className="mt-2 text-slate-400">
          Create an instructor profile for your organization.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-8 rounded-2xl border border-slate-800 bg-slate-900 p-8"
        >
          <section>
            <h2 className="text-lg font-semibold">
              Instructor information
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field
                label="Full name"
                value={fullName}
                onChange={setFullName}
                placeholder="Jane Wanjiku"
                required
              />

              <Field
                label="Instructor number"
                value={instructorNumber}
                onChange={setInstructorNumber}
                placeholder="INS-001"
              />

              <Field
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="instructor@example.com"
              />

              <Field
                label="Phone"
                value={phone}
                onChange={setPhone}
                placeholder="+254..."
              />

              <Field
                label="Instructor type"
                value={instructorType}
                onChange={setInstructorType}
                placeholder="Flight Instructor"
              />

              <Field
                label="Primary location"
                value={primaryLocation}
                onChange={setPrimaryLocation}
                placeholder="HKJK"
              />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold">
              Existing experience
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field
                label="Total flight hours"
                type="number"
                step="0.01"
                value={totalFlightHours}
                onChange={setTotalFlightHours}
                placeholder="0"
              />

              <Field
                label="Total instruction hours"
                type="number"
                step="0.01"
                value={totalInstructionHours}
                onChange={setTotalInstructionHours}
                placeholder="0"
              />
            </div>
          </section>

          <section>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Availability notes
            </label>

            <textarea
              value={availabilityNotes}
              onChange={(event) =>
                setAvailabilityNotes(event.target.value)
              }
              rows={4}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
              placeholder="Example: Available Monday–Friday, 07:00–17:00"
            />
          </section>

          <section>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Notes
            </label>

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
              placeholder="Optional instructor notes..."
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
              onClick={() => router.push("/instructors")}
              className="rounded-xl border border-slate-700 px-5 py-3 font-medium text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Adding instructor..." : "Add instructor"}
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