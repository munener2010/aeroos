import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type MaintenanceTask = {
  id: string;
  aircraft_id: string;
  task_name: string;
  description: string | null;

  interval_hours: number | null;
  interval_cycles: number | null;
  interval_days: number | null;

  last_completed_at: string | null;
  last_completed_hours: number | null;
  last_completed_cycles: number | null;

  due_date: string | null;
  due_hours: number | null;
  due_cycles: number | null;

  status: string;
  blocks_dispatch: boolean;
  notes: string | null;

  aircraft: {
    registration: string;
    aircraft_type: string;
    total_hours: number;
    total_cycles: number;
  } | null;
};

export default async function MaintenancePage() {
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
    .from("aircraft_maintenance_tasks")
    .select(
      `
        id,
        aircraft_id,
        task_name,
        description,
        interval_hours,
        interval_cycles,
        interval_days,
        last_completed_at,
        last_completed_hours,
        last_completed_cycles,
        due_date,
        due_hours,
        due_cycles,
        status,
        blocks_dispatch,
        notes,
        aircraft (
          registration,
          aircraft_type,
          total_hours,
          total_cycles
        )
      `
    )
    .eq("organization_id", membership.organization_id)
    .order("due_date", {
      ascending: true,
      nullsFirst: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const tasks: MaintenanceTask[] = (data ?? []).map((task) => ({
    ...task,
    aircraft: Array.isArray(task.aircraft)
      ? task.aircraft[0] ?? null
      : task.aircraft,
  }));

  const taskStatuses = tasks.map((task) => ({
    task,
    status: getEffectiveStatus(task),
  }));

  const overdue = taskStatuses.filter(
    (item) => item.status === "overdue"
  );

  const dueSoon = taskStatuses.filter(
    (item) => item.status === "due_soon"
  );

  const current = taskStatuses.filter(
    (item) => item.status === "current"
  );

  const dispatchBlocking = taskStatuses.filter(
    (item) =>
      item.task.blocks_dispatch &&
      item.status === "overdue"
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
              AeroOS
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Maintenance
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Monitor aircraft maintenance requirements and due items.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Dashboard
            </Link>

            <Link
              href="/maintenance/new"
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              Add maintenance task
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {dispatchBlocking.length > 0 && (
          <div className="mb-6 rounded-2xl border border-red-900 bg-red-950/30 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500 font-bold text-white">
                !
              </div>

              <div>
                <h2 className="font-semibold text-red-300">
                  Dispatch-blocking maintenance
                </h2>

                <p className="mt-1 text-sm leading-6 text-red-200/70">
                  {dispatchBlocking.length} overdue maintenance task
                  {dispatchBlocking.length === 1 ? "" : "s"} currently marked
                  as blocking aircraft dispatch.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Total tasks"
            value={tasks.length}
          />

          <SummaryCard
            label="Overdue"
            value={overdue.length}
          />

          <SummaryCard
            label="Due soon"
            value={dueSoon.length}
          />

          <SummaryCard
            label="Current"
            value={current.length}
          />
        </div>

        <div className="mt-10">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-bold">
                Maintenance tasks
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Maintenance requirements across the fleet.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              {tasks.length} task
              {tasks.length === 1 ? "" : "s"}
            </p>
          </div>

          {tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
              <h3 className="text-xl font-semibold">
                No maintenance tasks yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                Add your first recurring maintenance requirement to begin
                monitoring aircraft maintenance.
              </p>

              <Link
                href="/maintenance/new"
                className="mt-6 inline-flex rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                Add first task
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {taskStatuses.map(({ task, status }) => {
                const hoursRemaining =
                  getHoursRemaining(task);

                const cyclesRemaining =
                  getCyclesRemaining(task);

                return (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
                  >
                    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-semibold">
                            {task.task_name}
                          </h3>

                          <StatusBadge status={status} />

                          {task.blocks_dispatch && (
                            <span className="rounded-full border border-red-900 bg-red-950/30 px-3 py-1 text-xs text-red-300">
                              Dispatch blocking
                            </span>
                          )}
                        </div>

                        <div className="mt-2">
                          <p className="font-medium text-slate-300">
                            {task.aircraft?.registration ||
                              "Unknown aircraft"}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {task.aircraft?.aircraft_type ||
                              "Aircraft type not available"}
                          </p>
                        </div>

                        {task.description && (
                          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
                            {task.description}
                          </p>
                        )}

                        <div className="mt-5 flex flex-wrap gap-2">
                          {task.interval_hours !== null && (
                            <span className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-400">
                              Every {task.interval_hours} hours
                            </span>
                          )}

                          {task.interval_cycles !== null && (
                            <span className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-400">
                              Every {task.interval_cycles} cycles
                            </span>
                          )}

                          {task.interval_days !== null && (
                            <span className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-400">
                              Every {task.interval_days} days
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[520px] lg:grid-cols-3">
                        <InfoCard
                          label="Aircraft hours"
                          value={
                            task.aircraft
                              ? Number(
                                  task.aircraft.total_hours
                                ).toFixed(2)
                              : "—"
                          }
                        />

                        <InfoCard
                          label="Hours remaining"
                          value={formatRemaining(hoursRemaining)}
                        />

                        <InfoCard
                          label="Due hours"
                          value={
                            task.due_hours === null
                              ? "Not set"
                              : Number(task.due_hours).toFixed(2)
                          }
                        />

                        <InfoCard
                          label="Aircraft cycles"
                          value={
                            task.aircraft
                              ? String(task.aircraft.total_cycles)
                              : "—"
                          }
                        />

                        <InfoCard
                          label="Cycles remaining"
                          value={formatCyclesRemaining(
                            cyclesRemaining
                          )}
                        />

                        <InfoCard
                          label="Due date"
                          value={task.due_date || "Not set"}
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col justify-between gap-4 border-t border-slate-800 pt-5 sm:flex-row sm:items-center">
                      <div className="text-sm text-slate-500">
                        {task.last_completed_at ? (
                          <span>
                            Last completed:{" "}
                            {formatDate(task.last_completed_at)}
                          </span>
                        ) : (
                          <span>
                            No maintenance completion recorded yet.
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/maintenance/${task.id}/complete`}
                        className="inline-flex justify-center rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                      >
                        Complete maintenance
                      </Link>
                    </div>

                    {task.notes && (
                      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-600">
                          Notes
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                          {task.notes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function getEffectiveStatus(task: MaintenanceTask) {
  if (task.status === "completed") {
    return "completed";
  }

  if (task.status === "in_progress") {
    return "in_progress";
  }

  if (task.status === "deferred") {
    return "deferred";
  }

  const hoursRemaining = getHoursRemaining(task);
  const cyclesRemaining = getCyclesRemaining(task);

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  let overdue = false;
  let dueSoon = false;

  if (task.due_date) {
    const dueDate = new Date(`${task.due_date}T00:00:00`);

    if (dueDate < today) {
      overdue = true;
    } else {
      const daysRemaining = Math.ceil(
        (dueDate.getTime() - today.getTime()) /
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

function getHoursRemaining(task: MaintenanceTask) {
  if (
    task.due_hours === null ||
    !task.aircraft
  ) {
    return null;
  }

  return (
    Number(task.due_hours) -
    Number(task.aircraft.total_hours)
  );
}

function getCyclesRemaining(task: MaintenanceTask) {
  if (
    task.due_cycles === null ||
    !task.aircraft
  ) {
    return null;
  }

  return (
    Number(task.due_cycles) -
    Number(task.aircraft.total_cycles)
  );
}

function formatRemaining(value: number | null) {
  if (value === null) {
    return "Not set";
  }

  if (value < 0) {
    return `${Math.abs(value).toFixed(2)} overdue`;
  }

  return `${value.toFixed(2)} remaining`;
}

function formatCyclesRemaining(value: number | null) {
  if (value === null) {
    return "Not set";
  }

  if (value < 0) {
    return `${Math.abs(Math.ceil(value))} overdue`;
  }

  return `${Math.floor(value)} remaining`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-white">
        {value}
      </p>
    </div>
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

      <p className="mt-2 text-sm font-medium text-slate-200">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const classes: Record<string, string> = {
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