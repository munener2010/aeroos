"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Program = {
  id: string;
  name: string;
  description: string | null;
  status: string;
};

export default function EnrollStudentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState("");
  const [targetCompletionDate, setTargetCompletionDate] = useState("");
  const [notes, setNotes] = useState("");

  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPrograms() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("training_programs")
        .select("id, name, description, status")
        .eq("status", "active")
        .order("name", { ascending: true });

      if (error) {
        setError(error.message);
        setLoadingPrograms(false);
        return;
      }

      setPrograms(data ?? []);

      if (data && data.length > 0) {
        setProgramId(data[0].id);
      }

      setLoadingPrograms(false);
    }

    loadPrograms();
  }, [router, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const studentId = params.id;

    if (!studentId || studentId === "undefined") {
      setError("Invalid student.");
      setLoading(false);
      return;
    }

    if (!programId) {
      setError("Choose a training program.");
      setLoading(false);
      return;
    }

    const { data, error: enrollmentError } = await supabase.rpc(
      "enroll_student_in_training",
      {
        p_student_id: studentId,
        p_training_program_id: programId,
        p_target_completion_date: targetCompletionDate || null,
        p_notes: notes.trim() || null,
      }
    );

    if (enrollmentError) {
      setError(enrollmentError.message);
      setLoading(false);
      return;
    }

    if (!data) {
      setError("Enrollment was not created.");
      setLoading(false);
      return;
    }

    router.push(`/students/${studentId}`);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          AeroOS
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Enroll student in training
        </h1>

        <p className="mt-2 text-slate-400">
          Select a training program and AeroOS will create the student&apos;s
          complete lesson-progress structure automatically.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8"
        >
          {loadingPrograms ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
              Loading training programs...
            </div>
          ) : programs.length === 0 ? (
            <div className="rounded-xl border border-amber-900 bg-amber-950/30 p-5">
              <p className="font-semibold text-amber-300">
                No active training programs found.
              </p>

              <p className="mt-2 text-sm leading-6 text-amber-200/80">
                Create an active program with at least one stage and lesson
                first.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Training program
                </label>

                <select
                  value={programId}
                  onChange={(event) => setProgramId(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                >
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Target completion date
                </label>

                <input
                  type="date"
                  value={targetCompletionDate}
                  onChange={(event) =>
                    setTargetCompletionDate(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
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
                  placeholder="Optional enrollment notes..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                />
              </div>
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
              onClick={() => router.push(`/students/${params.id}`)}
              className="rounded-xl border border-slate-700 px-5 py-3 font-medium text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || loadingPrograms || programs.length === 0}
              className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Enrolling..." : "Enroll student"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}