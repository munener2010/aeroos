"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Instructor = {
  id: string;
  full_name: string;
  instructor_number: string | null;
  instructor_type: string | null;
  status: string;
};

export default function AssignInstructorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [instructorId, setInstructorId] = useState("");
  const [assignmentType, setAssignmentType] = useState("primary");
  const [notes, setNotes] = useState("");

  const [loadingData, setLoadingData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      const studentId = params.id;

      if (!studentId || studentId === "undefined") {
        setError("Invalid student.");
        setLoadingData(false);
        return;
      }

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

      if (
        membership.role !== "owner" &&
        membership.role !== "operations_manager"
      ) {
        setError(
          "You do not have permission to manage instructor assignments."
        );
        setLoadingData(false);
        return;
      }

      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("id", studentId)
        .eq("organization_id", membership.organization_id)
        .maybeSingle();

      if (studentError || !student) {
        setError("Student not found.");
        setLoadingData(false);
        return;
      }

      const { data, error: instructorError } = await supabase
        .from("instructors")
        .select(
          "id, full_name, instructor_number, instructor_type, status"
        )
        .eq("organization_id", membership.organization_id)
        .eq("status", "active")
        .order("full_name", { ascending: true });

      if (instructorError) {
        setError(instructorError.message);
        setLoadingData(false);
        return;
      }

      setInstructors(data ?? []);

      if (data && data.length > 0) {
        setInstructorId(data[0].id);
      }

      setLoadingData(false);
    }

    loadData();
  }, [params.id, router, supabase]);

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

    if (!instructorId) {
      setError("Choose an instructor.");
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

    const { data: membership, error: membershipError } =
      await supabase
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
      setError(
        "You do not have permission to manage instructor assignments."
      );
      setLoading(false);
      return;
    }

    const organizationId = membership.organization_id;

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (studentError || !student) {
      setError("Student not found.");
      setLoading(false);
      return;
    }

    const { data: instructor, error: instructorError } =
      await supabase
        .from("instructors")
        .select("id")
        .eq("id", instructorId)
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .maybeSingle();

    if (instructorError || !instructor) {
      setError("Instructor not found or inactive.");
      setLoading(false);
      return;
    }

    // If assigning a new primary instructor, end the previous
    // active primary assignment first.
    if (assignmentType === "primary") {
      const { error: endExistingError } = await supabase
        .from("student_instructor_assignments")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
        })
        .eq("organization_id", organizationId)
        .eq("student_id", student.id)
        .eq("assignment_type", "primary")
        .eq("status", "active");

      if (endExistingError) {
        setError(endExistingError.message);
        setLoading(false);
        return;
      }

      const { error: studentUpdateError } = await supabase
        .from("students")
        .update({
          assigned_instructor_id: instructor.id,
        })
        .eq("id", student.id)
        .eq("organization_id", organizationId);

      if (studentUpdateError) {
        setError(studentUpdateError.message);
        setLoading(false);
        return;
      }
    }

    const { error: assignmentError } = await supabase
      .from("student_instructor_assignments")
      .insert({
        organization_id: organizationId,
        student_id: student.id,
        instructor_id: instructor.id,
        assignment_type: assignmentType,
        status: "active",
        notes: notes.trim() || null,
      });

    if (assignmentError) {
      setError(assignmentError.message);
      setLoading(false);
      return;
    }

    router.push(`/students/${student.id}`);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          AeroOS
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Assign instructor
        </h1>

        <p className="mt-2 text-slate-400">
          Assign a primary or secondary instructor to this student.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8"
        >
          {loadingData ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
              Loading instructors...
            </div>
          ) : instructors.length === 0 ? (
            <div className="rounded-xl border border-amber-900 bg-amber-950/30 p-5">
              <p className="font-semibold text-amber-300">
                No active instructors found.
              </p>

              <p className="mt-2 text-sm text-amber-200/80">
                Create an active instructor before assigning one to a student.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label
                  htmlFor="instructor"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Instructor
                </label>

                <select
                  id="instructor"
                  value={instructorId}
                  onChange={(event) => setInstructorId(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                >
                  {instructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.full_name}
                      {instructor.instructor_number
                        ? ` — ${instructor.instructor_number}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="assignmentType"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Assignment type
                </label>

                <select
                  id="assignmentType"
                  value={assignmentType}
                  onChange={(event) =>
                    setAssignmentType(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                >
                  <option value="primary">Primary instructor</option>
                  <option value="secondary">
                    Secondary instructor
                  </option>
                </select>
              </div>

              <div>
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
                  placeholder="Optional assignment notes..."
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
              disabled={
                loading ||
                loadingData ||
                instructors.length === 0
              }
              className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Assigning..." : "Assign instructor"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}