import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type StudentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ProgressRow = {
  id: string;
  enrollment_id: string;
  lesson_id: string;
  status: string;
  attempt_count: number;
  completed_at: string | null;
  instructor_notes: string | null;
};

type Lesson = {
  id: string;
  name: string;
  lesson_order: number;
  lesson_type: string;
};

export default async function StudentDetailPage({
  params,
}: StudentPageProps) {
  const { id } = await params;

  if (!id || id === "undefined") {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!membership) {
    redirect("/onboarding");
  }

  const organizationId = membership.organization_id;

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (studentError) {
    throw new Error(studentError.message);
  }

  if (!student) {
    notFound();
  }

  let assignedInstructor: {
    id: string;
    full_name: string;
    instructor_number: string | null;
    instructor_type: string | null;
  } | null = null;

  if (student.assigned_instructor_id) {
    const { data: instructor, error: instructorError } =
      await supabase
        .from("instructors")
        .select(
          "id, full_name, instructor_number, instructor_type"
        )
        .eq("id", student.assigned_instructor_id)
        .eq("organization_id", organizationId)
        .maybeSingle();

    if (instructorError) {
      throw new Error(instructorError.message);
    }

    assignedInstructor = instructor;
  }

  const { data: activeEnrollment, error: enrollmentError } =
    await supabase
      .from("student_training_enrollments")
      .select("*")
      .eq("student_id", student.id)
      .eq("organization_id", organizationId)
      .eq("enrollment_status", "active")
      .limit(1)
      .maybeSingle();

  if (enrollmentError) {
    throw new Error(enrollmentError.message);
  }

  let programName = "No active training enrollment";
  let progressRows: ProgressRow[] = [];
  let lessonsById = new Map<string, Lesson>();

  if (activeEnrollment) {
    const { data: program, error: programError } =
      await supabase
        .from("training_programs")
        .select("id, name, status")
        .eq("id", activeEnrollment.training_program_id)
        .eq("organization_id", organizationId)
        .maybeSingle();

    if (programError) {
      throw new Error(programError.message);
    }

    if (program) {
      programName = program.name;
    }

    const { data: progressData, error: progressError } =
      await supabase
        .from("student_lesson_progress")
        .select(
          `
            id,
            enrollment_id,
            lesson_id,
            status,
            attempt_count,
            completed_at,
            instructor_notes
          `
        )
        .eq("enrollment_id", activeEnrollment.id)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true });

    if (progressError) {
      throw new Error(progressError.message);
    }

    progressRows = progressData ?? [];

    const lessonIds = progressRows.map((row) => row.lesson_id);

    if (lessonIds.length > 0) {
      const { data: lessons, error: lessonsError } =
        await supabase
          .from("training_lessons")
          .select(
            "id, name, lesson_order, lesson_type"
          )
          .eq("organization_id", organizationId)
          .in("id", lessonIds)
          .order("lesson_order", { ascending: true });

      if (lessonsError) {
        throw new Error(lessonsError.message);
      }

      for (const lesson of lessons ?? []) {
        lessonsById.set(lesson.id, lesson);
      }
    }
  }

  const completedLessons = progressRows.filter(
    (item) => item.status === "completed"
  ).length;

  const totalLessons = progressRows.length;

  const progressPercentage =
    totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
              AeroOS
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              {student.full_name}
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              {student.student_number || "Student profile"}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/students"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Back to students
            </Link>

            <Link
              href={`/students/${student.id}/instructor`}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Assign instructor
            </Link>

            <Link
              href={`/students/${student.id}/training/enroll`}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              Enroll in training
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm text-slate-400">
                  Student pilot
                </p>

                <h2 className="mt-1 text-3xl font-bold">
                  {student.full_name}
                </h2>

                <p className="mt-2 text-slate-400">
                  {student.training_program ||
                    "Training program not assigned"}
                </p>
              </div>

              <StatusBadge status={student.training_status} />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <InfoCard label="Email" value={student.email || "—"} />

              <InfoCard label="Phone" value={student.phone || "—"} />

              <InfoCard
                label="Student number"
                value={student.student_number || "—"}
              />

              <InfoCard
                label="Enrollment date"
                value={student.enrollment_date || "—"}
              />

              <InfoCard
                label="Target completion"
                value={student.target_completion_date || "—"}
              />

              <InfoCard
                label="Training program"
                value={student.training_program || "—"}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Training hours
            </p>

            <div className="mt-6 space-y-4">
              <InfoCard
                label="Flight hours"
                value={Number(
                  student.total_flight_hours
                ).toFixed(2)}
              />

              <InfoCard
                label="Ground hours"
                value={Number(
                  student.total_ground_hours
                ).toFixed(2)}
              />
            </div>
          </div>

          {/* Instructor */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Primary instructor
                </p>

                <h3 className="mt-2 text-xl font-semibold">
                  {assignedInstructor
                    ? assignedInstructor.full_name
                    : "No instructor assigned"}
                </h3>
              </div>

              <Link
                href={`/students/${student.id}/instructor`}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                {assignedInstructor
                  ? "Change instructor"
                  : "Assign instructor"}
              </Link>
            </div>

            {assignedInstructor && (
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <InfoCard
                  label="Instructor number"
                  value={
                    assignedInstructor.instructor_number || "—"
                  }
                />

                <InfoCard
                  label="Instructor type"
                  value={
                    assignedInstructor.instructor_type || "—"
                  }
                />

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Profile
                  </p>

                  <Link
                    href={`/instructors/${assignedInstructor.id}`}
                    className="mt-2 inline-block font-medium text-sky-400 hover:text-sky-300"
                  >
                    View instructor
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Training enrollment */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-3">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Training enrollment
                </p>

                <h3 className="mt-2 text-xl font-semibold">
                  {programName}
                </h3>
              </div>

              {activeEnrollment && (
                <StatusBadge
                  status={activeEnrollment.enrollment_status}
                />
              )}
            </div>

            {!activeEnrollment ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-8 text-center">
                <p className="font-medium text-slate-200">
                  Student is not enrolled in a training program
                </p>

                <Link
                  href={`/students/${student.id}/training/enroll`}
                  className="mt-6 inline-flex rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
                >
                  Enroll student
                </Link>
              </div>
            ) : (
              <>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <InfoCard
                    label="Started"
                    value={activeEnrollment.started_at}
                  />

                  <InfoCard
                    label="Target completion"
                    value={
                      activeEnrollment.target_completion_date ||
                      "Not set"
                    }
                  />

                  <InfoCard
                    label="Lessons"
                    value={`${completedLessons}/${totalLessons} completed`}
                  />
                </div>

                <div className="mt-6">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-slate-400">
                      Training progress
                    </span>

                    <span className="font-semibold text-sky-400">
                      {progressPercentage}%
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-sky-500 transition-all"
                      style={{
                        width: `${progressPercentage}%`,
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Lesson progress */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Lesson progress
            </p>

            <h3 className="mt-2 text-xl font-semibold">
              Training journey
            </h3>

            <div className="mt-6 space-y-3">
              {progressRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
                  <p className="font-medium text-slate-200">
                    No lesson progress yet
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Enroll the student in training to create progress records.
                  </p>
                </div>
              ) : (
                progressRows.map((progress) => {
                  const lesson = lessonsById.get(
                    progress.lesson_id
                  );

                  return (
                    <div
                      key={progress.id}
                      className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-slate-300">
                            {lesson?.lesson_order ?? "—"}
                          </span>

                          <div>
                            <h4 className="font-semibold text-slate-100">
                              {lesson?.name || "Unknown lesson"}
                            </h4>

                            <p className="text-xs uppercase tracking-wider text-slate-500">
                              {lesson?.lesson_type || "Unknown"}
                            </p>
                          </div>
                        </div>

                        <StatusBadge status={progress.status} />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                        <span>
                          Attempts: {progress.attempt_count}
                        </span>

                        {progress.completed_at && (
                          <span>
                            Completed:{" "}
                            {new Date(
                              progress.completed_at
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {progress.instructor_notes && (
                        <p className="mt-3 text-sm leading-6 text-slate-400">
                          {progress.instructor_notes}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Notes
            </p>

            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-400">
              {student.notes || "No notes recorded."}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-medium capitalize text-slate-200">
      {status.replaceAll("_", " ")}
    </span>
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

      <p className="mt-2 font-medium text-slate-200">{value}</p>
    </div>
  );
}