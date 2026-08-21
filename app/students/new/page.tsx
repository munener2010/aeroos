"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewStudentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [studentNumber, setStudentNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [trainingProgram, setTrainingProgram] = useState("");
  const [enrollmentDate, setEnrollmentDate] = useState("");
  const [targetCompletionDate, setTargetCompletionDate] = useState("");
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
      setError("You do not have permission to add students.");
      setLoading(false);
      return;
    }

    if (!fullName.trim()) {
      setError("Student name is required.");
      setLoading(false);
      return;
    }

    if (
      enrollmentDate &&
      targetCompletionDate &&
      targetCompletionDate < enrollmentDate
    ) {
      setError("Target completion date cannot be before enrollment date.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("students").insert({
      organization_id: membership.organization_id,
      student_number: studentNumber.trim() || null,
      full_name: fullName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      training_program: trainingProgram.trim() || null,
      enrollment_date: enrollmentDate || null,
      target_completion_date: targetCompletionDate || null,
      training_status: "active",
      total_flight_hours: 0,
      total_ground_hours: 0,
      notes: notes.trim() || null,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        setError("That student number already exists in this organization.");
      } else {
        setError(insertError.message);
      }

      setLoading(false);
      return;
    }

    router.push("/students");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          AeroOS
        </p>

        <h1 className="mt-2 text-3xl font-bold">Add student</h1>

        <p className="mt-2 text-slate-400">
          Create a student pilot record for your organization.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-8 rounded-2xl border border-slate-800 bg-slate-900 p-8"
        >
          <section>
            <h2 className="text-lg font-semibold">Student information</h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field
                label="Full name"
                value={fullName}
                onChange={setFullName}
                placeholder="John Mwangi"
                required
              />

              <Field
                label="Student number"
                value={studentNumber}
                onChange={setStudentNumber}
                placeholder="STU-001"
              />

              <Field
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="student@example.com"
              />

              <Field
                label="Phone"
                value={phone}
                onChange={setPhone}
                placeholder="+254..."
              />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Training</h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field
                label="Training program"
                value={trainingProgram}
                onChange={setTrainingProgram}
                placeholder="Private Pilot Licence"
              />

              <Field
                label="Enrollment date"
                type="date"
                value={enrollmentDate}
                onChange={setEnrollmentDate}
              />

              <Field
                label="Target completion date"
                type="date"
                value={targetCompletionDate}
                onChange={setTargetCompletionDate}
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
              rows={5}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
              placeholder="Optional student notes..."
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
              onClick={() => router.push("/students")}
              className="rounded-xl border border-slate-700 px-5 py-3 font-medium text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Adding student..." : "Add student"}
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
  required?: boolean;
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: FieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
      />
    </div>
  );
}
