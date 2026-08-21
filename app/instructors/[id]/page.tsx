import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type InstructorPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InstructorDetailPage({
  params,
}: InstructorPageProps) {
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

  const { data: instructor, error: instructorError } = await supabase
    .from("instructors")
    .select("*")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (instructorError) {
    throw new Error(instructorError.message);
  }

  if (!instructor) {
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
              {instructor.full_name}
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              {instructor.instructor_number || "Instructor profile"}
            </p>
          </div>

          <Link
            href="/instructors"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Back to instructors
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm text-slate-400">
                  Instructor
                </p>

                <h2 className="mt-1 text-3xl font-bold">
                  {instructor.full_name}
                </h2>

                <p className="mt-2 text-slate-400">
                  {instructor.instructor_type || "Instructor type not assigned"}
                </p>
              </div>

              <StatusBadge status={instructor.status} />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <InfoCard
                label="Email"
                value={instructor.email || "—"}
              />

              <InfoCard
                label="Phone"
                value={instructor.phone || "—"}
              />

              <InfoCard
                label="Instructor number"
                value={instructor.instructor_number || "—"}
              />

              <InfoCard
                label="Instructor type"
                value={instructor.instructor_type || "—"}
              />

              <InfoCard
                label="Primary location"
                value={instructor.primary_location || "—"}
              />

              <InfoCard
                label="Status"
                value={instructor.status.replaceAll("_", " ")}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Experience
            </p>

            <div className="mt-6 space-y-4">
              <InfoCard
                label="Flight hours"
                value={Number(instructor.total_flight_hours).toFixed(2)}
              />

              <InfoCard
                label="Instruction hours"
                value={Number(
                  instructor.total_instruction_hours
                ).toFixed(2)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Availability
            </p>

            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-400">
              {instructor.availability_notes ||
                "No availability information recorded."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Assigned students
            </p>

            <p className="mt-4 text-sm leading-6 text-slate-400">
              Student assignments will be connected after we establish the
              instructor-student relationship.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Notes
            </p>

            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-400">
              {instructor.notes || "No notes recorded."}
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