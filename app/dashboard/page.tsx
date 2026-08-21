import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Flight = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  student_id: string;
  instructor_id: string;
  aircraft_id: string;
  lesson_id: string | null;
};

type Aircraft = {
  id: string;
  registration: string;
  aircraft_type: string;
  status: string;
  total_hours: number;
  total_cycles: number;
};

type MaintenanceTask = {
  id: string;
  aircraft_id: string;
  task_name: string;
  status: string;
  blocks_dispatch: boolean;
  due_date: string | null;
  due_hours: number | null;
  due_cycles: number | null;
};

type Student = {
  id: string;
  full_name: string;
  training_status: string;
};

type Instructor = {
  id: string;
  full_name: string;
  status: string;
};

type Lesson = {
  id: string;
  name: string;
};

type Defect = {
  id: string;
  aircraft_id: string;
  title: string;
  status: string;
  prevents_dispatch: boolean;
};

export default async function DashboardPage() {
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

  /*
    Load the main dashboard data separately.
    This avoids relying on Supabase's automatic relationship
    schema cache for nested queries.
  */

  const [
    flightsResponse,
    aircraftResponse,
    maintenanceResponse,
    studentsResponse,
    instructorsResponse,
    lessonsResponse,
    defectsResponse,
  ] = await Promise.all([
    supabase
      .from("flights")
      .select(
        "id, start_time, end_time, status, student_id, instructor_id, aircraft_id, lesson_id"
      )
      .eq("organization_id", organizationId)
      .order("start_time", { ascending: true }),

    supabase
      .from("aircraft")
      .select(
        "id, registration, aircraft_type, status, total_hours, total_cycles"
      )
      .eq("organization_id", organizationId)
      .order("registration", { ascending: true }),

    supabase
      .from("aircraft_maintenance_tasks")
      .select(
        "id, aircraft_id, task_name, status, blocks_dispatch, due_date, due_hours, due_cycles"
      )
      .eq("organization_id", organizationId),

    supabase
      .from("students")
      .select("id, full_name, training_status")
      .eq("organization_id", organizationId)
      .order("full_name", { ascending: true }),

    supabase
      .from("instructors")
      .select("id, full_name, status")
      .eq("organization_id", organizationId)
      .order("full_name", { ascending: true }),

    supabase
      .from("training_lessons")
      .select("id, name")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),

    supabase
      .from("aircraft_defects")
      .select(
        "id, aircraft_id, title, status, prevents_dispatch"
      )
      .eq("organization_id", organizationId)
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false }),
  ]);

  const dataError =
    flightsResponse.error ||
    aircraftResponse.error ||
    maintenanceResponse.error ||
    studentsResponse.error ||
    instructorsResponse.error ||
    lessonsResponse.error ||
    defectsResponse.error;

  if (dataError) {
    throw new Error(dataError.message);
  }

  const flights: Flight[] = flightsResponse.data ?? [];
  const aircraft: Aircraft[] = aircraftResponse.data ?? [];
  const maintenanceTasks: MaintenanceTask[] =
    maintenanceResponse.data ?? [];
  const students: Student[] = studentsResponse.data ?? [];
  const instructors: Instructor[] =
    instructorsResponse.data ?? [];
  const lessons: Lesson[] = lessonsResponse.data ?? [];
  const openDefects: Defect[] =
    defectsResponse.data ?? [];

  /*
    Refresh operational alerts so the dashboard reflects
    the latest maintenance, defect and flight conditions.
  */
  const { error: alertRefreshError } =
    await supabase.rpc(
      "refresh_operational_alerts"
    );

  if (alertRefreshError) {
    throw new Error(alertRefreshError.message);
  }

  /*
    Get current alert count.
  */
  const { data: alertRows, error: alertsError } =
    await supabase
      .from("operational_alerts")
      .select(
        "id, severity, is_active, read_at"
      )
      .eq("organization_id", organizationId)
      .eq("is_active", true);

  if (alertsError) {
    throw new Error(alertsError.message);
  }

  const activeAlerts = alertRows ?? [];

  const unreadAlerts = activeAlerts.filter(
    (alert) => !alert.read_at
  );

  const criticalAlerts = activeAlerts.filter(
    (alert) => alert.severity === "critical"
  );

  /*
    ---------------------------------------------------------
    DATE HELPERS
    ---------------------------------------------------------
  */

  const now = new Date();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  /*
    ---------------------------------------------------------
    TODAY'S FLIGHTS
    ---------------------------------------------------------
  */

  const todaysFlights = flights.filter((flight) => {
    const start = new Date(flight.start_time);

    return (
      start >= startOfToday &&
      start <= endOfToday
    );
  });

  const scheduledToday = todaysFlights.filter(
    (flight) => flight.status === "scheduled"
  );

  const checkedInToday = todaysFlights.filter(
    (flight) => flight.status === "checked_in"
  );

  const preFlightToday = todaysFlights.filter(
    (flight) => flight.status === "pre_flight"
  );

  const airborneToday = todaysFlights.filter(
    (flight) => flight.status === "airborne"
  );

  const returnedToday = todaysFlights.filter(
    (flight) => flight.status === "returned"
  );

  const delayedToday = todaysFlights.filter(
    (flight) => flight.status === "delayed"
  );

  const closedToday = todaysFlights.filter(
    (flight) => flight.status === "closed"
  );

  /*
    ---------------------------------------------------------
    AIRCRAFT
    ---------------------------------------------------------
  */

  const availableAircraft = aircraft.filter(
    (item) => item.status === "available"
  );

  const maintenanceAircraft = aircraft.filter(
    (item) => item.status === "maintenance"
  );

  const groundedAircraft = aircraft.filter(
    (item) => item.status === "grounded"
  );

  const unavailableAircraft = aircraft.filter(
    (item) => item.status === "unavailable"
  );

  /*
    ---------------------------------------------------------
    MAINTENANCE STATUS
    ---------------------------------------------------------
  */

  const maintenanceStatuses =
    maintenanceTasks.map((task) => ({
      task,
      status: getMaintenanceStatus(
        task,
        aircraft.find(
          (item) => item.id === task.aircraft_id
        )
      ),
    }));

  const overdueMaintenance =
    maintenanceStatuses.filter(
      (item) => item.status === "overdue"
    );

  const dueSoonMaintenance =
    maintenanceStatuses.filter(
      (item) => item.status === "due_soon"
    );

  const dispatchBlockingMaintenance =
    maintenanceStatuses.filter(
      (item) =>
        item.status === "overdue" &&
        item.task.blocks_dispatch
    );

  /*
    ---------------------------------------------------------
    STUDENTS
    ---------------------------------------------------------
  */

  const activeStudents = students.filter(
    (student) =>
      student.training_status === "active"
  );

  /*
    ---------------------------------------------------------
    INSTRUCTORS
    ---------------------------------------------------------
  */

  const activeInstructors = instructors.filter(
    (instructor) =>
      instructor.status === "active"
  );

  /*
    ---------------------------------------------------------
    DEFECTS
    ---------------------------------------------------------
  */

  const dispatchBlockingDefects =
    openDefects.filter(
      (defect) => defect.prevents_dispatch
    );

  /*
    ---------------------------------------------------------
    LOOKUP MAPS
    ---------------------------------------------------------
  */

  const studentMap = new Map<string, Student>();

  for (const student of students) {
    studentMap.set(student.id, student);
  }

  const instructorMap = new Map<
    string,
    Instructor
  >();

  for (const instructor of instructors) {
    instructorMap.set(
      instructor.id,
      instructor
    );
  }

  const aircraftMap = new Map<
    string,
    Aircraft
  >();

  for (const item of aircraft) {
    aircraftMap.set(item.id, item);
  }

  const lessonMap = new Map<
    string,
    Lesson
  >();

  for (const lesson of lessons) {
    lessonMap.set(lesson.id, lesson);
  }

  /*
    ---------------------------------------------------------
    UPCOMING FLIGHTS
    ---------------------------------------------------------
  */

  const upcomingFlights = flights
    .filter((flight) => {
      const start = new Date(
        flight.start_time
      );

      return (
        start >= now &&
        !["cancelled", "closed"].includes(
          flight.status
        )
      );
    })
    .slice(0, 6);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* ====================================================
          HEADER
      ==================================================== */}

      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
              AeroOS
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Operations Dashboard
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Flight-school operations at a glance.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/alerts"
              className="relative rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Alerts

              {unreadAlerts.length > 0 && (
                <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {unreadAlerts.length}
                </span>
              )}
            </Link>

            <Link
              href="/dispatch"
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              Dispatch Board
            </Link>

            <Link
              href="/flights/new"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Create Booking
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* ==================================================
            ALERT BANNER
        ================================================== */}

        {activeAlerts.length > 0 && (
          <div className="mb-8 rounded-2xl border border-amber-900 bg-amber-950/30 p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-amber-400">
                  Operational attention required
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  {activeAlerts.length} active alert
                  {activeAlerts.length === 1 ? "" : "s"}
                </h2>

                <p className="mt-1 text-sm text-amber-200/70">
                  {criticalAlerts.length} critical alert
                  {criticalAlerts.length === 1 ? "" : "s"} and{" "}
                  {unreadAlerts.length} unread.
                </p>
              </div>

              <Link
                href="/alerts"
                className="rounded-xl border border-amber-800 px-4 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-900/20"
              >
                Review alerts
              </Link>
            </div>
          </div>
        )}

        {/* ==================================================
            TODAY'S OPERATIONS
        ================================================== */}

        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Today
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                Flight Operations
              </h2>
            </div>

            <Link
              href="/dispatch"
              className="text-sm font-medium text-sky-400 hover:text-sky-300"
            >
              Open dispatch →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Scheduled"
              value={scheduledToday.length}
              href="/dispatch"
            />

            <MetricCard
              label="Pre-flight"
              value={preFlightToday.length}
              href="/dispatch"
            />

            <MetricCard
              label="Airborne"
              value={airborneToday.length}
              href="/dispatch"
            />

            <MetricCard
              label="Delayed"
              value={delayedToday.length}
              href="/dispatch"
              negative={delayedToday.length > 0}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="Checked in"
              value={checkedInToday.length}
              href="/dispatch"
            />

            <MetricCard
              label="Returned"
              value={returnedToday.length}
              href="/dispatch"
            />

            <MetricCard
              label="Closed today"
              value={closedToday.length}
              href="/flights"
            />
          </div>
        </section>

        {/* ==================================================
            UPCOMING FLIGHTS
        ================================================== */}

        <section className="mt-10">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Upcoming
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              Next Operations
            </h2>
          </div>

          {upcomingFlights.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
              <p className="font-medium text-slate-200">
                No upcoming flights
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Create a booking to populate the operational schedule.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingFlights.map((flight) => {
                const student =
                  studentMap.get(
                    flight.student_id
                  );

                const instructor =
                  instructorMap.get(
                    flight.instructor_id
                  );

                const plane =
                  aircraftMap.get(
                    flight.aircraft_id
                  );

                const lesson =
                  flight.lesson_id
                    ? lessonMap.get(
                        flight.lesson_id
                      )
                    : null;

                return (
                  <Link
                    key={flight.id}
                    href={`/flights/${flight.id}`}
                    className="block rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-sky-800"
                  >
                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                      <div>
                        <p className="font-semibold text-slate-100">
                          {formatDateTime(
                            flight.start_time
                          )}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatTime(
                            flight.start_time
                          )}
                          {" – "}
                          {formatTime(
                            flight.end_time
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Student
                        </p>

                        <p className="mt-1 text-sm text-slate-200">
                          {student?.full_name ||
                            "Unknown"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Instructor
                        </p>

                        <p className="mt-1 text-sm text-slate-200">
                          {instructor?.full_name ||
                            "Unknown"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Aircraft
                        </p>

                        <p className="mt-1 text-sm text-slate-200">
                          {plane?.registration ||
                            "Unknown"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Lesson
                        </p>

                        <p className="mt-1 text-sm text-slate-200">
                          {lesson?.name ||
                            "Unknown"}
                        </p>
                      </div>

                      <StatusBadge
                        status={flight.status}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ==================================================
            AIRCRAFT
        ================================================== */}

        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Fleet
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                Aircraft Status
              </h2>
            </div>

            <Link
              href="/aircraft"
              className="text-sm font-medium text-sky-400 hover:text-sky-300"
            >
              View fleet →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total aircraft"
              value={aircraft.length}
              href="/aircraft"
            />

            <MetricCard
              label="Available"
              value={availableAircraft.length}
              href="/aircraft"
            />

            <MetricCard
              label="Maintenance"
              value={maintenanceAircraft.length}
              href="/aircraft"
            />

            <MetricCard
              label="Grounded"
              value={groundedAircraft.length}
              href="/aircraft"
              negative={groundedAircraft.length > 0}
            />
          </div>

          {unavailableAircraft.length > 0 && (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
              <span className="text-sm text-slate-400">
                Unavailable aircraft:
              </span>

              <span className="ml-2 text-sm font-medium text-slate-200">
                {unavailableAircraft.length}
              </span>
            </div>
          )}
        </section>

        {/* ==================================================
            MAINTENANCE
        ================================================== */}

        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Maintenance
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                Fleet Maintenance Health
              </h2>
            </div>

            <Link
              href="/maintenance"
              className="text-sm font-medium text-sky-400 hover:text-sky-300"
            >
              Open maintenance →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              label="Overdue"
              value={overdueMaintenance.length}
              href="/maintenance"
              negative={
                overdueMaintenance.length > 0
              }
            />

            <MetricCard
              label="Due soon"
              value={dueSoonMaintenance.length}
              href="/maintenance"
              warning={
                dueSoonMaintenance.length > 0
              }
            />

            <MetricCard
              label="Dispatch blockers"
              value={
                dispatchBlockingMaintenance.length
              }
              href="/maintenance"
              negative={
                dispatchBlockingMaintenance.length >
                0
              }
            />
          </div>
        </section>

        {/* ==================================================
            STUDENTS + INSTRUCTORS
        ================================================== */}

        <section className="mt-10">
          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardPanel
              title="Students"
              subtitle="Training population"
              href="/students"
            >
              <div className="grid grid-cols-2 gap-4">
                <MetricCard
                  label="Total students"
                  value={students.length}
                  href="/students"
                />

                <MetricCard
                  label="Active students"
                  value={
                    activeStudents.length
                  }
                  href="/students"
                />
              </div>
            </DashboardPanel>

            <DashboardPanel
              title="Instructors"
              subtitle="Active instructional staff"
              href="/instructors"
            >
              <div className="grid grid-cols-2 gap-4">
                <MetricCard
                  label="Total instructors"
                  value={instructors.length}
                  href="/instructors"
                />

                <MetricCard
                  label="Active instructors"
                  value={
                    activeInstructors.length
                  }
                  href="/instructors"
                />
              </div>
            </DashboardPanel>
          </div>
        </section>

        {/* ==================================================
            ALERTS
        ================================================== */}

        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Attention
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                Operational Alerts
              </h2>
            </div>

            <Link
              href="/alerts"
              className="text-sm font-medium text-sky-400 hover:text-sky-300"
            >
              View all alerts →
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <AlertPanel
              title="All active alerts"
              count={activeAlerts.length}
              href="/alerts"
              negative={activeAlerts.length > 0}
            />

            <AlertPanel
              title="Critical alerts"
              count={criticalAlerts.length}
              href="/alerts"
              negative={criticalAlerts.length > 0}
            />

            <AlertPanel
              title="Unread alerts"
              count={unreadAlerts.length}
              href="/alerts"
              warning={unreadAlerts.length > 0}
            />
          </div>
        </section>
      </section>
    </main>
  );
}

/* ==========================================================
   MAINTENANCE STATUS
========================================================== */

function getMaintenanceStatus(
  task: MaintenanceTask,
  aircraft: Aircraft | undefined
) {
  if (task.status === "completed") {
    return "completed";
  }

  if (task.status === "in_progress") {
    return "in_progress";
  }

  if (task.status === "deferred") {
    return "deferred";
  }

  if (!aircraft) {
    return "current";
  }

  const aircraftHours = Number(
    aircraft.total_hours ?? 0
  );

  const aircraftCycles = Number(
    aircraft.total_cycles ?? 0
  );

  let overdue = false;
  let dueSoon = false;

  if (task.due_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(
      `${task.due_date}T00:00:00`
    );

    if (dueDate < today) {
      overdue = true;
    } else {
      const daysRemaining = Math.ceil(
        (dueDate.getTime() -
          today.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (daysRemaining <= 30) {
        dueSoon = true;
      }
    }
  }

  if (task.due_hours !== null) {
    const remaining =
      Number(task.due_hours) -
      aircraftHours;

    if (remaining <= 0) {
      overdue = true;
    } else if (remaining <= 10) {
      dueSoon = true;
    }
  }

  if (task.due_cycles !== null) {
    const remaining =
      Number(task.due_cycles) -
      aircraftCycles;

    if (remaining <= 0) {
      overdue = true;
    } else if (remaining <= 5) {
      dueSoon = true;
    }
  }

  if (overdue) {
    return "overdue";
  }

  if (dueSoon) {
    return "due_soon";
  }

  return "current";
}

/* ==========================================================
   UI COMPONENTS
========================================================== */

function MetricCard({
  label,
  value,
  href,
  negative = false,
  warning = false,
}: {
  label: string;
  value: number;
  href?: string;
  negative?: boolean;
  warning?: boolean;
}) {
  let valueClass = "text-white";

  if (negative) {
    valueClass = "text-red-300";
  } else if (warning) {
    valueClass = "text-amber-300";
  }

  const content = (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-3xl font-bold ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href}>
      {content}
    </Link>
  );
}

function DashboardPanel({
  title,
  subtitle,
  href,
  children,
}: {
  title: string;
  subtitle: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {subtitle}
          </p>
        </div>

        <Link
          href={href}
          className="text-sm font-medium text-sky-400 hover:text-sky-300"
        >
          View →
        </Link>
      </div>

      {children}
    </div>
  );
}

function AlertPanel({
  title,
  count,
  href,
  negative = false,
  warning = false,
}: {
  title: string;
  count: number;
  href: string;
  negative?: boolean;
  warning?: boolean;
}) {
  const border =
    negative && count > 0
      ? "border-red-900 bg-red-950/20"
      : warning && count > 0
        ? "border-amber-900 bg-amber-950/20"
        : "border-slate-800 bg-slate-900";

  const valueClass =
    negative && count > 0
      ? "text-red-300"
      : warning && count > 0
        ? "text-amber-300"
        : "text-emerald-300";

  return (
    <Link
      href={href}
      className={`block rounded-2xl border p-6 transition hover:border-slate-600 ${border}`}
    >
      <p className="text-sm font-medium text-slate-400">
        {title}
      </p>

      <p
        className={`mt-2 text-3xl font-bold ${valueClass}`}
      >
        {count}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        {count === 0
          ? "No current issues"
          : "Review now"}
      </p>
    </Link>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const classes: Record<string, string> = {
    scheduled:
      "border-sky-900 bg-sky-950/30 text-sky-300",

    checked_in:
      "border-indigo-900 bg-indigo-950/30 text-indigo-300",

    pre_flight:
      "border-violet-900 bg-violet-950/30 text-violet-300",

    dispatched:
      "border-cyan-900 bg-cyan-950/30 text-cyan-300",

    airborne:
      "border-emerald-900 bg-emerald-950/30 text-emerald-300",

    returned:
      "border-teal-900 bg-teal-950/30 text-teal-300",

    post_flight:
      "border-amber-900 bg-amber-950/30 text-amber-300",

    closed:
      "border-green-900 bg-green-950/30 text-green-300",

    delayed:
      "border-orange-900 bg-orange-950/30 text-orange-300",

    cancelled:
      "border-red-900 bg-red-950/30 text-red-300",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize ${
        classes[status] ??
        "border-slate-700 bg-slate-950 text-slate-300"
      }`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
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