import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type AircraftPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type MaintenanceTask = {
  id: string;
  task_name: string;
  description: string | null;
  status: string;
  blocks_dispatch: boolean;

  interval_hours: number | null;
  interval_cycles: number | null;
  interval_days: number | null;

  last_completed_at: string | null;
  last_completed_hours: number | null;
  last_completed_cycles: number | null;

  due_date: string | null;
  due_hours: number | null;
  due_cycles: number | null;
};

type MaintenanceRecord = {
  id: string;
  maintenance_task_id: string;
  performed_at: string;
  aircraft_hours: number;
  aircraft_cycles: number;
  work_performed: string;
  findings: string | null;
  parts_used: string | null;
  notes: string | null;
  next_due_date: string | null;
  next_due_hours: number | null;
  next_due_cycles: number | null;
};

type Defect = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  prevents_dispatch: boolean;
  created_at: string;
  resolved_at: string | null;
};

export default async function AircraftDetailPage({
  params,
}: AircraftPageProps) {
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

  const organizationId = membership.organization_id;

  // =========================================================
  // AIRCRAFT
  // =========================================================

  const { data: aircraft, error: aircraftError } =
    await supabase
      .from("aircraft")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle();

  if (aircraftError) {
    throw new Error(aircraftError.message);
  }

  if (!aircraft) {
    notFound();
  }

  // =========================================================
  // MAINTENANCE TASKS
  // =========================================================

  const {
    data: maintenanceTaskRows,
    error: maintenanceTasksError,
  } = await supabase
    .from("aircraft_maintenance_tasks")
    .select(
      `
        id,
        task_name,
        description,
        status,
        blocks_dispatch,
        interval_hours,
        interval_cycles,
        interval_days,
        last_completed_at,
        last_completed_hours,
        last_completed_cycles,
        due_date,
        due_hours,
        due_cycles
      `
    )
    .eq("aircraft_id", aircraft.id)
    .eq("organization_id", organizationId)
    .order("due_date", {
      ascending: true,
      nullsFirst: false,
    });

  if (maintenanceTasksError) {
    throw new Error(maintenanceTasksError.message);
  }

  const tasks: MaintenanceTask[] =
    maintenanceTaskRows ?? [];

  // =========================================================
  // MAINTENANCE RECORDS
  //
  // IMPORTANT:
  // We deliberately DO NOT request:
  //
  // maintenance_task (...)
  //
  // because Supabase's schema cache doesn't currently
  // recognize that relationship.
  // =========================================================

  const {
    data: maintenanceRecordRows,
    error: maintenanceRecordsError,
  } = await supabase
    .from("aircraft_maintenance_records")
    .select(
      `
        id,
        maintenance_task_id,
        performed_at,
        aircraft_hours,
        aircraft_cycles,
        work_performed,
        findings,
        parts_used,
        notes,
        next_due_date,
        next_due_hours,
        next_due_cycles
      `
    )
    .eq("aircraft_id", aircraft.id)
    .eq("organization_id", organizationId)
    .order("performed_at", {
      ascending: false,
    });

  if (maintenanceRecordsError) {
    throw new Error(
      maintenanceRecordsError.message
    );
  }

  const records: MaintenanceRecord[] =
    maintenanceRecordRows ?? [];

  // Create a local lookup so each maintenance record
  // can display the associated task name.
  const taskMap = new Map<string, MaintenanceTask>();

  for (const task of tasks) {
    taskMap.set(task.id, task);
  }

  // =========================================================
  // DEFECTS
  // =========================================================

  const {
    data: defectRows,
    error: defectsError,
  } = await supabase
    .from("aircraft_defects")
    .select(
      `
        id,
        title,
        description,
        status,
        prevents_dispatch,
        created_at,
        resolved_at
      `
    )
    .eq("aircraft_id", aircraft.id)
    .eq("organization_id", organizationId)
    .order("created_at", {
      ascending: false,
    });

  if (defectsError) {
    throw new Error(defectsError.message);
  }

  const defects: Defect[] = defectRows ?? [];

  // =========================================================
  // MAINTENANCE STATUS
  // =========================================================

  const aircraftHours = Number(
    aircraft.total_hours ?? 0
  );

  const aircraftCycles = Number(
    aircraft.total_cycles ?? 0
  );

  const taskStatuses = tasks.map((task) => ({
    task,
    status: getEffectiveStatus(
      task,
      aircraftHours,
      aircraftCycles
    ),
  }));

  const overdueTasks = taskStatuses.filter(
    (item) => item.status === "overdue"
  );

  const dueSoonTasks = taskStatuses.filter(
    (item) => item.status === "due_soon"
  );

  const openBlockingDefects = defects.filter(
    (defect) =>
      defect.prevents_dispatch &&
      ["open", "in_progress"].includes(
        defect.status
      )
  );

  const maintenanceBlocksDispatch =
    overdueTasks.some(
      (item) => item.task.blocks_dispatch
    );

  const aircraftBlocked =
    ["maintenance", "grounded", "unavailable"].includes(
      aircraft.status
    ) ||
    openBlockingDefects.length > 0 ||
    maintenanceBlocksDispatch;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
              AeroOS
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              {aircraft.registration}
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              {aircraft.aircraft_type}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/aircraft"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Back to aircraft
            </Link>

            <Link
              href="/maintenance"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Maintenance
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* =================================================
            AIRCRAFT OVERVIEW
        ================================================= */}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm text-slate-400">
                  Aircraft
                </p>

                <h2 className="mt-1 text-3xl font-bold">
                  {aircraft.registration}
                </h2>

                <p className="mt-2 text-slate-400">
                  {aircraft.aircraft_type}
                </p>
              </div>

              <AircraftStatus
                status={
                  aircraftBlocked
                    ? "blocked"
                    : aircraft.status
                }
              />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <InfoCard
                label="Registration"
                value={aircraft.registration}
              />

              <InfoCard
                label="Aircraft type"
                value={aircraft.aircraft_type}
              />

              <InfoCard
                label="Total hours"
                value={aircraftHours.toFixed(2)}
              />

              <InfoCard
                label="Total cycles"
                value={String(aircraftCycles)}
              />

              <InfoCard
                label="Status"
                value={aircraft.status}
              />

              <InfoCard
                label="Base"
                value={
                  aircraft.base_location ||
                  "Not set"
                }
              />

              <InfoCard
                label="Manufacturer"
                value={
                  aircraft.manufacturer ||
                  "Not set"
                }
              />

              <InfoCard
                label="Model"
                value={
                  aircraft.model || "Not set"
                }
              />
            </div>
          </div>

          {/* =================================================
              OPERATIONAL HEALTH
          ================================================= */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Operational health
            </p>

            <div className="mt-6 space-y-4">
              <HealthCard
                label="Dispatch status"
                value={
                  aircraftBlocked
                    ? "Blocked"
                    : "Available"
                }
                negative={aircraftBlocked}
              />

              <HealthCard
                label="Overdue maintenance"
                value={String(
                  overdueTasks.length
                )}
                negative={
                  overdueTasks.length > 0
                }
              />

              <HealthCard
                label="Due soon"
                value={String(
                  dueSoonTasks.length
                )}
                warning={
                  dueSoonTasks.length > 0
                }
              />

              <HealthCard
                label="Dispatch-blocking defects"
                value={String(
                  openBlockingDefects.length
                )}
                negative={
                  openBlockingDefects.length > 0
                }
              />
            </div>
          </div>
        </div>

        {/* =================================================
            MAINTENANCE STATUS
        ================================================= */}

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Maintenance status
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Current maintenance requirements
              </h2>
            </div>

            <Link
              href="/maintenance"
              className="text-sm font-medium text-sky-400 hover:text-sky-300"
            >
              View all maintenance →
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {taskStatuses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
                <p className="font-medium text-slate-200">
                  No maintenance tasks configured
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Add maintenance requirements for this aircraft.
                </p>

                <Link
                  href="/maintenance/new"
                  className="mt-5 inline-flex rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                >
                  Add maintenance task
                </Link>
              </div>
            ) : (
              taskStatuses.map(
                ({ task, status }) => {
                  const hoursRemaining =
                    getHoursRemaining(
                      task,
                      aircraftHours
                    );

                  const cyclesRemaining =
                    getCyclesRemaining(
                      task,
                      aircraftCycles
                    );

                  return (
                    <div
                      key={task.id}
                      className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                    >
                      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-semibold">
                              {task.task_name}
                            </h3>

                            <StatusBadge
                              status={status}
                            />

                            {task.blocks_dispatch && (
                              <span className="rounded-full border border-red-900 bg-red-950/30 px-3 py-1 text-xs text-red-300">
                                Dispatch blocking
                              </span>
                            )}
                          </div>

                          {task.description && (
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                              {task.description}
                            </p>
                          )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <InfoCard
                            label="Hours remaining"
                            value={formatRemaining(
                              hoursRemaining
                            )}
                          />

                          <InfoCard
                            label="Cycles remaining"
                            value={formatCyclesRemaining(
                              cyclesRemaining
                            )}
                          />

                          <InfoCard
                            label="Due date"
                            value={
                              task.due_date ||
                              "Not set"
                            }
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <Link
                          href={`/maintenance/${task.id}/complete`}
                          className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                        >
                          Complete maintenance
                        </Link>
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>
        </div>

        {/* =================================================
            DEFECTS
        ================================================= */}

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Defects
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Aircraft defects & squawks
            </h2>
          </div>

          <div className="mt-6 space-y-4">
            {defects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
                <p className="font-medium text-slate-200">
                  No defects recorded
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  This aircraft currently has no recorded defects.
                </p>
              </div>
            ) : (
              defects.map((defect) => (
                <div
                  key={defect.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <h3 className="font-semibold text-slate-100">
                        {defect.title}
                      </h3>

                      <p className="mt-1 text-xs capitalize text-slate-500">
                        {defect.status.replaceAll(
                          "_",
                          " "
                        )}
                      </p>
                    </div>

                    {defect.prevents_dispatch && (
                      <span className="rounded-full border border-red-900 bg-red-950/30 px-3 py-1 text-xs text-red-300">
                        Blocks dispatch
                      </span>
                    )}
                  </div>

                  {defect.description && (
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      {defect.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>
                      Reported:{" "}
                      {formatDate(
                        defect.created_at
                      )}
                    </span>

                    {defect.resolved_at && (
                      <span>
                        Resolved:{" "}
                        {formatDate(
                          defect.resolved_at
                        )}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* =================================================
            MAINTENANCE HISTORY
        ================================================= */}

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Maintenance history
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Maintenance records
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Completed maintenance work recorded against this aircraft.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {records.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
                <p className="font-medium text-slate-200">
                  No maintenance history yet
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Completed maintenance events will appear here.
                </p>
              </div>
            ) : (
              records.map((record) => {
                const task =
                  taskMap.get(
                    record.maintenance_task_id
                  );

                return (
                  <div
                    key={record.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <h3 className="font-semibold text-slate-100">
                          {task?.task_name ||
                            "Maintenance"}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {formatDateTime(
                            record.performed_at
                          )}
                        </p>
                      </div>

                      <div className="text-right text-xs text-slate-500">
                        <p>
                          {Number(
                            record.aircraft_hours
                          ).toFixed(2)}{" "}
                          hours
                        </p>

                        <p className="mt-1">
                          {record.aircraft_cycles} cycles
                        </p>
                      </div>
                    </div>

                    <div className="mt-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Work performed
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                        {record.work_performed}
                      </p>
                    </div>

                    {record.findings && (
                      <div className="mt-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Findings
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                          {record.findings}
                        </p>
                      </div>
                    )}

                    {record.parts_used && (
                      <div className="mt-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Parts used
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                          {record.parts_used}
                        </p>
                      </div>
                    )}

                    {record.notes && (
                      <div className="mt-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Notes
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                          {record.notes}
                        </p>
                      </div>
                    )}

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <InfoCard
                        label="Next due hours"
                        value={
                          record.next_due_hours ===
                          null
                            ? "Not set"
                            : Number(
                                record.next_due_hours
                              ).toFixed(2)
                        }
                      />

                      <InfoCard
                        label="Next due cycles"
                        value={
                          record.next_due_cycles ===
                          null
                            ? "Not set"
                            : String(
                                record.next_due_cycles
                              )
                        }
                      />

                      <InfoCard
                        label="Next due date"
                        value={
                          record.next_due_date ||
                          "Not set"
                        }
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function getEffectiveStatus(
  task: MaintenanceTask,
  aircraftHours: number,
  aircraftCycles: number
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

  const hoursRemaining =
    getHoursRemaining(
      task,
      aircraftHours
    );

  const cyclesRemaining =
    getCyclesRemaining(
      task,
      aircraftCycles
    );

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  let overdue = false;
  let dueSoon = false;

  if (task.due_date) {
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

  if (hoursRemaining !== null) {
    if (hoursRemaining <= 0) {
      overdue = true;
    } else if (hoursRemaining <= 10) {
      dueSoon = true;
    }
  }

  if (cyclesRemaining !== null) {
    if (cyclesRemaining <= 0) {
      overdue = true;
    } else if (cyclesRemaining <= 5) {
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

function getHoursRemaining(
  task: MaintenanceTask,
  aircraftHours: number
) {
  if (task.due_hours === null) {
    return null;
  }

  return (
    Number(task.due_hours) -
    aircraftHours
  );
}

function getCyclesRemaining(
  task: MaintenanceTask,
  aircraftCycles: number
) {
  if (task.due_cycles === null) {
    return null;
  }

  return (
    Number(task.due_cycles) -
    aircraftCycles
  );
}

function formatRemaining(
  value: number | null
) {
  if (value === null) {
    return "Not set";
  }

  if (value < 0) {
    return `${Math.abs(value).toFixed(2)} overdue`;
  }

  return `${value.toFixed(2)} remaining`;
}

function formatCyclesRemaining(
  value: number | null
) {
  if (value === null) {
    return "Not set";
  }

  if (value < 0) {
    return `${Math.abs(
      Math.ceil(value)
    )} overdue`;
  }

  return `${Math.floor(value)} remaining`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
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

      <p className="mt-2 text-sm font-medium text-slate-200">
        {value}
      </p>
    </div>
  );
}

function HealthCard({
  label,
  value,
  negative = false,
  warning = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
  warning?: boolean;
}) {
  let valueClass =
    "text-emerald-300";

  if (negative) {
    valueClass = "text-red-300";
  } else if (warning) {
    valueClass = "text-amber-300";
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-lg font-bold ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function AircraftStatus({
  status,
}: {
  status: string;
}) {
  const blocked = status === "blocked";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${
        blocked
          ? "border-red-900 bg-red-950/30 text-red-300"
          : "border-emerald-900 bg-emerald-950/30 text-emerald-300"
      }`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const classes: Record<
    string,
    string
  > = {
    current:
      "border-emerald-900 bg-emerald-950/30 text-emerald-300",

    due_soon:
      "border-amber-900 bg-amber-950/30 text-amber-300",

    overdue:
      "border-red-900 bg-red-950/30 text-red-300",

    in_progress:
      "border-sky-900 bg-sky-950/30 text-sky-300",

    completed:
      "border-slate-700 bg-slate-950 text-slate-300",

    deferred:
      "border-orange-900 bg-orange-950/30 text-orange-300",
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