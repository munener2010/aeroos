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

  // Protect the route from an invalid dynamic URL.
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

  const { data: qualifications, error: qualificationsError } =
    await supabase
      .from("instructor_qualifications")
      .select("*")
      .eq("instructor_id", instructor.id)
      .eq("organization_id", membership.organization_id)
      .order("expiry_date", {
        ascending: true,
        nullsFirst: false,
      });

  if (qualificationsError) {
    throw new Error(qualificationsError.message);
  }

  const { data: availability, error: availabilityError } =
    await supabase
      .from("instructor_availability")
      .select("*")
      .eq("instructor_id", instructor.id)
      .eq("organization_id", membership.organization_id)
      .order("day_of_week", { ascending: true })
      .order("specific_date", {
        ascending: true,
        nullsFirst: false,
      });

  if (availabilityError) {
    throw new Error(availabilityError.message);
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

          <div className="flex gap-3">
            <Link
              href="/instructors"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Back to instructors
            </Link>

            <Link
              href={`/instructors/${instructor.id}/qualifications/new`}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              Add qualification
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Overview */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm text-slate-400">Instructor</p>

                <h2 className="mt-1 text-3xl font-bold">
                  {instructor.full_name}
                </h2>

                <p className="mt-2 text-slate-400">
                  {instructor.instructor_type ||
                    "Instructor type not assigned"}
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

          {/* Experience */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Experience
            </p>

            <div className="mt-6 space-y-4">
              <InfoCard
                label="Flight hours"
                value={Number(
                  instructor.total_flight_hours
                ).toFixed(2)}
              />

              <InfoCard
                label="Instruction hours"
                value={Number(
                  instructor.total_instruction_hours
                ).toFixed(2)}
              />
            </div>
          </div>

          {/* Qualifications */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-3">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Qualifications
                </p>

                <h3 className="mt-2 text-xl font-semibold">
                  Instructor credentials
                </h3>
              </div>

              <Link
                href={`/instructors/${instructor.id}/qualifications/new`}
                className="inline-flex rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                Add qualification
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {!qualifications || qualifications.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center md:col-span-2">
                  <p className="font-medium text-slate-200">
                    No qualifications recorded
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Add the instructor&apos;s qualifications or
                    organization-defined authorizations.
                  </p>
                </div>
              ) : (
                qualifications.map((qualification) => (
                  <div
                    key={qualification.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          {qualification.qualification_type}
                        </p>

                        <h4 className="mt-1 font-semibold text-slate-100">
                          {qualification.name}
                        </h4>
                      </div>

                      <span className="rounded-full border border-slate-700 px-3 py-1 text-xs capitalize text-slate-300">
                        {qualification.status}
                      </span>
                    </div>

                    <div className="mt-5 space-y-2 text-sm text-slate-400">
                      <p>
                        Issuing authority:{" "}
                        {qualification.issuing_authority || "—"}
                      </p>

                      <p>
                        Issued: {qualification.issue_date || "—"}
                      </p>

                      <p>
                        Expires:{" "}
                        {qualification.expiry_date || "No expiry"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Availability */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Availability
                </p>

                <h3 className="mt-2 text-xl font-semibold">
                  Instructor availability
                </h3>
              </div>

              <Link
  href={`/instructors/${instructor.id}/availability/new`}
  className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
>
  Add availability
</Link>
            </div>

            <div className="mt-6">
              {!availability || availability.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
                  <p className="font-medium text-slate-200">
                    No availability configured
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Weekly schedules and specific-date exceptions will appear
                    here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availability.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium capitalize text-slate-200">
                            {item.specific_date
                              ? item.specific_date
                              : dayName(item.day_of_week)}
                          </p>

                          <p className="mt-1 text-sm text-slate-400">
                            {item.start_time || "—"} –{" "}
                            {item.end_time || "—"}
                          </p>
                        </div>

                        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs capitalize text-slate-300">
                          {item.availability_type}
                        </span>
                      </div>

                      {item.reason && (
                        <p className="mt-3 text-sm text-slate-500">
                          {item.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Students */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Assigned students
            </p>

            <p className="mt-4 text-sm leading-6 text-slate-400">
              Student assignments will appear here once the assignment
              interface is connected.
            </p>
          </div>

          {/* Notes */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-3">
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

function dayName(day: number | null) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  if (day === null || day < 0 || day > 6) {
    return "Unspecified";
  }

  return days[day];
}