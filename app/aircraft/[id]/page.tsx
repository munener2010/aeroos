import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type AircraftPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AircraftDetailPage({
  params,
}: AircraftPageProps) {
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

  const { data: aircraft, error: aircraftError } = await supabase
    .from("aircraft")
    .select("*")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (aircraftError) {
    throw new Error(aircraftError.message);
  }

  if (!aircraft) {
    notFound();
  }

  const { data: defects, error: defectsError } = await supabase
    .from("aircraft_defects")
    .select(
      `
        id,
        title,
        description,
        severity,
        status,
        prevents_dispatch,
        created_at,
        resolved_at
      `
    )
    .eq("aircraft_id", aircraft.id)
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });

  if (defectsError) {
    throw new Error(defectsError.message);
  }

  const { data: maintenanceRecords, error: maintenanceError } =
    await supabase
      .from("maintenance_records")
      .select(
        `
          id,
          maintenance_type,
          title,
          description,
          status,
          due_date,
          due_hours,
          completed_date,
          completed_hours,
          performed_by,
          notes,
          created_at
        `
      )
      .eq("aircraft_id", aircraft.id)
      .eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: false });

  if (maintenanceError) {
    throw new Error(maintenanceError.message);
  }

  const openDefects =
    defects?.filter(
      (defect) =>
        defect.status === "open" || defect.status === "in_progress"
    ) ?? [];

  const dispatchBlocked = openDefects.some(
    (defect) => defect.prevents_dispatch
  );

  const openMaintenance =
    maintenanceRecords?.filter(
      (record) =>
        record.status === "open" ||
        record.status === "scheduled" ||
        record.status === "in_progress"
    ) ?? [];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
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

          <Link
            href="/aircraft"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            Back to fleet
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* Dispatch warning */}
        {dispatchBlocked && (
          <div className="mb-6 rounded-2xl border border-red-900 bg-red-950/40 p-5">
            <div className="flex items-start gap-4">
              <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-red-500" />

              <div>
                <h2 className="font-semibold text-red-300">
                  Dispatch attention required
                </h2>

                <p className="mt-1 text-sm leading-6 text-red-200/80">
                  This aircraft has an open defect marked as preventing
                  dispatch. Final operational decisions must follow the
                  organization&apos;s procedures and authorized maintenance
                  process.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Aircraft overview */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm text-slate-400">Aircraft</p>

                <h2 className="mt-1 text-3xl font-bold">
                  {aircraft.registration}
                </h2>

                <p className="mt-2 text-slate-400">
                  {aircraft.manufacturer || "Manufacturer not set"}
                  {aircraft.model ? ` ${aircraft.model}` : ""}
                </p>
              </div>

              <StatusBadge status={aircraft.status} />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <InfoCard
                label="Aircraft type"
                value={aircraft.aircraft_type}
              />

              <InfoCard
                label="Manufacturer"
                value={aircraft.manufacturer || "—"}
              />

              <InfoCard
                label="Model"
                value={aircraft.model || "—"}
              />

              <InfoCard
                label="Year"
                value={aircraft.year?.toString() || "—"}
              />

              <InfoCard
                label="Base location"
                value={aircraft.base_location || "—"}
              />

              <InfoCard
                label="Total hours"
                value={Number(aircraft.total_hours).toFixed(2)}
              />

              <InfoCard
                label="Total cycles"
                value={aircraft.total_cycles.toString()}
              />
            </div>
          </div>

          {/* Maintenance summary */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Maintenance
                </p>

                <h3 className="mt-2 text-xl font-semibold">
                  Maintenance status
                </h3>
              </div>

              <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-300">
                {openMaintenance.length} open
              </span>
            </div>

            <div className="mt-6 space-y-4">
              <InfoCard
                label="Next maintenance hours"
                value={
                  aircraft.next_maintenance_hours !== null
                    ? Number(aircraft.next_maintenance_hours).toFixed(2)
                    : "Not configured"
                }
              />

              <InfoCard
                label="Next maintenance date"
                value={aircraft.next_maintenance_date || "Not configured"}
              />
            </div>

            <Link
              href={`/aircraft/${aircraft.id}/maintenance/new`}
              className="mt-6 inline-flex rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              Add maintenance record
            </Link>
          </div>

          {/* Maintenance records */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-3">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Maintenance records
                </p>

                <h3 className="mt-2 text-xl font-semibold">
                  Upcoming and historical maintenance
                </h3>
              </div>

              <Link
                href={`/aircraft/${aircraft.id}/maintenance/new`}
                className="inline-flex rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Add record
              </Link>
            </div>

            <div className="mt-6 space-y-3">
              {!maintenanceRecords ||
              maintenanceRecords.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
                  <p className="font-medium text-slate-200">
                    No maintenance records
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Add the first maintenance item for this aircraft.
                  </p>
                </div>
              ) : (
                maintenanceRecords.map((record) => (
                  <div
                    key={record.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-slate-100">
                            {record.title}
                          </h4>

                          <StatusBadge status={record.status} />
                        </div>

                        <p className="mt-2 text-xs uppercase tracking-wider text-slate-500">
                          {record.maintenance_type}
                        </p>

                        {record.description && (
                          <p className="mt-3 text-sm leading-6 text-slate-400">
                            {record.description}
                          </p>
                        )}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <InfoCard
                          label="Due date"
                          value={record.due_date || "—"}
                        />

                        <InfoCard
                          label="Due hours"
                          value={
                            record.due_hours !== null
                              ? Number(record.due_hours).toFixed(2)
                              : "—"
                          }
                        />
                      </div>
                    </div>

                    {record.performed_by && (
                      <p className="mt-4 text-xs text-slate-500">
                        Performed by: {record.performed_by}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Defects */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Defects &amp; Squawks
                </p>

                <h3 className="mt-2 text-xl font-semibold">
                  Aircraft condition reports
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  {openDefects.length} open{" "}
                  {openDefects.length === 1 ? "defect" : "defects"}
                </p>
              </div>

              <Link
                href={`/aircraft/${aircraft.id}/defects/new`}
                className="inline-flex rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                Report defect
              </Link>
            </div>

            <div className="mt-6 space-y-3">
              {!defects || defects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
                  <p className="font-medium text-slate-200">
                    No defects recorded
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    No aircraft defects or squawks have been reported.
                  </p>
                </div>
              ) : (
                defects.map((defect) => (
                  <div
                    key={defect.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-slate-100">
                            {defect.title}
                          </h4>

                          <SeverityBadge severity={defect.severity} />

                          <StatusBadge status={defect.status} />
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-400">
                          {defect.description}
                        </p>
                      </div>

                      {defect.prevents_dispatch && (
                        <span className="shrink-0 rounded-full border border-red-900 bg-red-950/40 px-3 py-1 text-xs font-semibold text-red-300">
                          Dispatch attention
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
                      <span>
                        Reported{" "}
                        {new Date(defect.created_at).toLocaleString()}
                      </span>

                      {defect.resolved_at && (
                        <span>
                          Resolved{" "}
                          {new Date(defect.resolved_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Notes
            </p>

            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-400">
              {aircraft.notes || "No notes recorded."}
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

function SeverityBadge({ severity }: { severity: string }) {
  const classes: Record<string, string> = {
    low: "border-slate-700 bg-slate-900 text-slate-300",
    normal: "border-sky-900 bg-sky-950/40 text-sky-300",
    high: "border-amber-900 bg-amber-950/40 text-amber-300",
    critical: "border-red-900 bg-red-950/40 text-red-300",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize ${
        classes[severity] ?? classes.normal
      }`}
    >
      {severity}
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