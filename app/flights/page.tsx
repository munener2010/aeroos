import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Flight = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  location: string | null;
  notes: string | null;

  students: {
    full_name: string;
    student_number: string | null;
  } | null;

  instructors: {
    full_name: string;
    instructor_number: string | null;
  } | null;

  aircraft: {
    registration: string;
    aircraft_type: string;
  } | null;

  training_lessons: {
    name: string;
    lesson_type: string;
  } | null;
};

export default async function FlightsPage() {
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

  const { data, error } = await supabase
    .from("flights")
    .select(
      `
        id,
        start_time,
        end_time,
        status,
        location,
        notes,
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
    .eq("organization_id", membership.organization_id)
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const flights: Flight[] = (data ?? []).map((flight) => ({
    id: flight.id,
    start_time: flight.start_time,
    end_time: flight.end_time,
    status: flight.status,
    location: flight.location,
    notes: flight.notes,

    students: Array.isArray(flight.students)
      ? flight.students[0] ?? null
      : flight.students,

    instructors: Array.isArray(flight.instructors)
      ? flight.instructors[0] ?? null
      : flight.instructors,

    aircraft: Array.isArray(flight.aircraft)
      ? flight.aircraft[0] ?? null
      : flight.aircraft,

    training_lessons: Array.isArray(flight.training_lessons)
      ? flight.training_lessons[0] ?? null
      : flight.training_lessons,
  }));

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
              AeroOS
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Flights
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Manage scheduled and completed flight operations.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Dashboard
            </Link>

            <Link
              href="/dispatch"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Dispatch
            </Link>

            <Link
              href="/flights/new"
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              Create booking
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-3xl font-bold">
              Flight schedule
            </h2>

            <p className="mt-2 text-slate-400">
              {flights.length} flight
              {flights.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {flights.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
            <h3 className="text-xl font-semibold">
              No flights yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              Create your first validated flight booking to begin building
              your operational history.
            </p>

            <Link
              href="/flights/new"
              className="mt-6 inline-flex rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              Create first booking
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-slate-800 bg-slate-950/60">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Time
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Student
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Instructor
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Aircraft
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Lesson
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Location
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Details
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {flights.map((flight) => (
                    <tr
                      key={flight.id}
                      className="border-b border-slate-800 last:border-b-0 hover:bg-slate-800/30"
                    >
                      {/* Time */}
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-200">
                          {formatDate(flight.start_time)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatTime(flight.start_time)}
                          {" – "}
                          {formatTime(flight.end_time)}
                        </p>
                      </td>

                      {/* Student */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/flights/${flight.id}`}
                          className="font-medium text-sky-400 transition hover:text-sky-300"
                        >
                          {flight.students?.full_name || "—"}
                        </Link>

                        {flight.students?.student_number && (
                          <p className="mt-1 text-xs text-slate-500">
                            {flight.students.student_number}
                          </p>
                        )}
                      </td>

                      {/* Instructor */}
                      <td className="px-5 py-4">
                        <p className="text-slate-300">
                          {flight.instructors?.full_name || "—"}
                        </p>

                        {flight.instructors?.instructor_number && (
                          <p className="mt-1 text-xs text-slate-500">
                            {flight.instructors.instructor_number}
                          </p>
                        )}
                      </td>

                      {/* Aircraft */}
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-200">
                          {flight.aircraft?.registration || "—"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {flight.aircraft?.aircraft_type || ""}
                        </p>
                      </td>

                      {/* Lesson */}
                      <td className="px-5 py-4">
                        <p className="text-slate-300">
                          {flight.training_lessons?.name || "—"}
                        </p>

                        {flight.training_lessons?.lesson_type && (
                          <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">
                            {flight.training_lessons.lesson_type}
                          </p>
                        )}
                      </td>

                      {/* Location */}
                      <td className="px-5 py-4 text-slate-400">
                        {flight.location || "—"}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge status={flight.status} />
                      </td>

                      {/* Details */}
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/flights/${flight.id}`}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                        >
                          View history
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const statusClasses: Record<string, string> = {
    scheduled:
      "border-sky-900 bg-sky-950/40 text-sky-300",

    checked_in:
      "border-indigo-900 bg-indigo-950/40 text-indigo-300",

    pre_flight:
      "border-violet-900 bg-violet-950/40 text-violet-300",

    dispatched:
      "border-cyan-900 bg-cyan-950/40 text-cyan-300",

    airborne:
      "border-emerald-900 bg-emerald-950/40 text-emerald-300",

    returned:
      "border-teal-900 bg-teal-950/40 text-teal-300",

    post_flight:
      "border-amber-900 bg-amber-950/40 text-amber-300",

    closed:
      "border-green-900 bg-green-950/40 text-green-300",

    delayed:
      "border-orange-900 bg-orange-950/40 text-orange-300",

    cancelled:
      "border-red-900 bg-red-950/40 text-red-300",
  };

  const className =
    statusClasses[status] ??
    "border-slate-700 bg-slate-950 text-slate-300";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize ${className}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
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