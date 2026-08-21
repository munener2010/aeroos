import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type FlightPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type AuditEntry = {
  id: string;
  event_type: string;
  old_status: string | null;
  new_status: string | null;
  old_start_time: string | null;
  new_start_time: string | null;
  old_end_time: string | null;
  new_end_time: string | null;
  created_at: string;
};

export default async function FlightDetailPage({
  params,
}: FlightPageProps) {
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

  const { data: membership, error: membershipError } =
    await supabase
      .from("organization_memberships")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!membership) {
    redirect("/onboarding");
  }

  const { data: flight, error: flightError } =
    await supabase
      .from("flights")
      .select(
        `
          id,
          start_time,
          end_time,
          location,
          status,
          notes,
          created_at,

          students (
            full_name,
            student_number
          ),

          instructors (
            full_name,
            instructor_number
          ),

          aircraft (
            registration,
            aircraft_type
          ),

          training_lessons (
            name,
            lesson_type
          )
        `
      )
      .eq("id", id)
      .eq("organization_id", membership.organization_id)
      .maybeSingle();

  if (flightError) {
    throw new Error(flightError.message);
  }

  if (!flight) {
    notFound();
  }

  const { data: auditRows, error: auditError } =
    await supabase
      .from("flight_audit_log")
      .select(
        `
          id,
          event_type,
          old_status,
          new_status,
          old_start_time,
          new_start_time,
          old_end_time,
          new_end_time,
          created_at
        `
      )
      .eq("flight_id", flight.id)
      .eq("organization_id", membership.organization_id)
      .order("created_at", {
        ascending: false,
      });

  if (auditError) {
    throw new Error(auditError.message);
  }

  const audits: AuditEntry[] = auditRows ?? [];

  const student = Array.isArray(flight.students)
    ? flight.students[0] ?? null
    : flight.students;

  const instructor = Array.isArray(flight.instructors)
    ? flight.instructors[0] ?? null
    : flight.instructors;

  const aircraft = Array.isArray(flight.aircraft)
    ? flight.aircraft[0] ?? null
    : flight.aircraft;

  const lesson = Array.isArray(flight.training_lessons)
    ? flight.training_lessons[0] ?? null
    : flight.training_lessons;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
              AeroOS
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Flight details
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              {flight.id}
            </p>
          </div>

          <Link
            href="/dispatch"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Dispatch Board
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">
                  Flight
                </p>

                <h2 className="mt-1 text-3xl font-bold">
                  {formatDate(flight.start_time)}
                </h2>

                <p className="mt-2 text-slate-400">
                  {formatTime(flight.start_time)}–
                  {formatTime(flight.end_time)}
                </p>
              </div>

              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs capitalize text-slate-300">
                {flight.status.replaceAll("_", " ")}
              </span>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <InfoCard
                label="Student"
                value={student?.full_name || "—"}
              />

              <InfoCard
                label="Instructor"
                value={instructor?.full_name || "—"}
              />

              <InfoCard
                label="Aircraft"
                value={aircraft?.registration || "—"}
              />

              <InfoCard
                label="Aircraft type"
                value={aircraft?.aircraft_type || "—"}
              />

              <InfoCard
                label="Lesson"
                value={lesson?.name || "—"}
              />

              <InfoCard
                label="Lesson type"
                value={lesson?.lesson_type || "—"}
              />

              <InfoCard
                label="Location"
                value={flight.location || "—"}
              />

              <InfoCard
                label="Created"
                value={formatDateTime(flight.created_at)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Notes
            </p>

            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-400">
              {flight.notes || "No flight notes recorded."}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Flight history
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Operational audit trail
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Every important change to this flight is recorded automatically.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {audits.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
                <p className="font-medium text-slate-200">
                  No history recorded
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  The audit trail will appear here as the flight changes.
                </p>
              </div>
            ) : (
              audits.map((audit) => (
                <div
                  key={audit.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="font-semibold text-slate-100">
                        {eventTitle(audit.event_type)}
                      </p>

                      {audit.old_status &&
                        audit.new_status &&
                        audit.old_status !== audit.new_status && (
                          <p className="mt-2 text-sm text-slate-400">
                            {audit.old_status.replaceAll("_", " ")}
                            {" → "}
                            <span className="text-slate-200">
                              {audit.new_status.replaceAll(
                                "_",
                                " "
                              )}
                            </span>
                          </p>
                        )}

                      {audit.event_type === "schedule_changed" && (
                        <p className="mt-2 text-sm text-slate-400">
                          Schedule changed.
                        </p>
                      )}

                      {audit.event_type === "resources_changed" && (
                        <p className="mt-2 text-sm text-slate-400">
                          Student, instructor, aircraft, or lesson changed.
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-slate-500">
                      {formatDateTime(audit.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
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

      <p className="mt-2 font-medium text-slate-200">
        {value}
      </p>
    </div>
  );
}

function eventTitle(eventType: string) {
  switch (eventType) {
    case "flight_created":
      return "Flight created";

    case "status_changed":
      return "Flight status changed";

    case "schedule_changed":
      return "Schedule changed";

    case "resources_changed":
      return "Flight resources changed";

    case "flight_updated":
      return "Flight updated";

    case "flight_deleted":
      return "Flight deleted";

    default:
      return eventType.replaceAll("_", " ");
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}