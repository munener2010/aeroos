import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type StudentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function StudentDetailPage({
  params,
}: StudentPageProps) {
  const { id } = await params;

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

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (studentError) {
    throw new Error(studentError.message);
  }

  if (!student) {
    notFound();
  }

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

          <Link
            href="/students"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Back to students
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm text-slate-400">Student pilot</p>

                <h2 className="mt-1 text-3xl font-bold">
                  {student.full_name}
                </h2>

                <p className="mt-2 text-slate-400">
                  {student.training_program || "Training program not assigned"}
                </p>
              </div>

              <StatusBadge status={student.training_status} />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <InfoCard
                label="Email"
                value={student.email || "—"}
              />

              <InfoCard
                label="Phone"
                value={student.phone || "—"}
              />

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
                value={Number(student.total_flight_hours).toFixed(2)}
              />

              <InfoCard
                label="Ground hours"
                value={Number(student.total_ground_hours).toFixed(2)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Training progress
            </p>

            <h3 className="mt-2 text-xl font-semibold">
              Student training journey
            </h3>

            <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-8 text-center">
              <p className="font-medium text-slate-200">
                Training progression engine
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Lessons, milestones, assessments, and progress tracking will
                be connected here.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Instructor
            </p>

            <p className="mt-4 text-sm text-slate-400">
              No instructor is assigned yet.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Notes
            </p>

            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-400">
              {student.notes || "No notes recorded."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Activity
            </p>

            <p className="mt-4 text-sm leading-6 text-slate-400">
              Student activity history will appear here as flights, lessons,
              documents, and other events are recorded.
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
