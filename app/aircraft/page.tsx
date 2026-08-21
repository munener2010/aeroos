import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Aircraft = {
  id: string;
  registration: string;
  aircraft_type: string;
  manufacturer: string | null;
  model: string | null;
  year: number | null;
  base_location: string | null;
  total_hours: number;
  total_cycles: number;
  status: string;
  notes: string | null;
};

export default async function AircraftPage() {
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
    .from("aircraft")
    .select(
      `
        id,
        registration,
        aircraft_type,
        manufacturer,
        model,
        year,
        base_location,
        total_hours,
        total_cycles,
        status,
        notes
      `
    )
    .eq("organization_id", membership.organization_id)
    .order("registration", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  const aircraft: Aircraft[] = data ?? [];

  const availableCount = aircraft.filter(
    (item) => item.status === "available"
  ).length;

  const maintenanceCount = aircraft.filter(
    (item) => item.status === "maintenance"
  ).length;

  const groundedCount = aircraft.filter(
    (item) => item.status === "grounded"
  ).length;

  const unavailableCount = aircraft.filter(
    (item) => item.status === "unavailable"
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
              AeroOS
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Aircraft
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Fleet management and aircraft operational status.
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
              href="/maintenance"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Maintenance
            </Link>

            <Link
              href="/aircraft/new"
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              Add aircraft
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* Summary */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            label="Total aircraft"
            value={aircraft.length}
          />

          <SummaryCard
            label="Available"
            value={availableCount}
          />

          <SummaryCard
            label="Maintenance"
            value={maintenanceCount}
          />

          <SummaryCard
            label="Grounded"
            value={groundedCount}
          />

          <SummaryCard
            label="Unavailable"
            value={unavailableCount}
          />
        </div>

        {/* Fleet */}

        <div className="mt-10">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-bold">
                Fleet
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Select an aircraft to view its complete operational profile.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              {aircraft.length} aircraft
            </p>
          </div>

          {aircraft.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
              <h3 className="text-xl font-semibold">
                No aircraft yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                Add your first aircraft to begin managing your fleet.
              </p>

              <Link
                href="/aircraft/new"
                className="mt-6 inline-flex rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                Add first aircraft
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {aircraft.map((item) => (
                <Link
                  key={item.id}
                  href={`/aircraft/${item.id}`}
                  className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-sky-700 hover:bg-slate-900/80"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Aircraft
                      </p>

                      <h3 className="mt-1 text-2xl font-bold text-white group-hover:text-sky-300">
                        {item.registration}
                      </h3>

                      <p className="mt-1 text-sm text-slate-400">
                        {item.aircraft_type}
                      </p>
                    </div>

                    <StatusBadge status={item.status} />
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <InfoCard
                      label="Total hours"
                      value={Number(
                        item.total_hours ?? 0
                      ).toFixed(2)}
                    />

                    <InfoCard
                      label="Total cycles"
                      value={String(
                        item.total_cycles ?? 0
                      )}
                    />

                    <InfoCard
                      label="Base"
                      value={
                        item.base_location ||
                        "Not set"
                      }
                    />

                    <InfoCard
                      label="Year"
                      value={
                        item.year
                          ? String(item.year)
                          : "Not set"
                      }
                    />
                  </div>

                  <div className="mt-6 border-t border-slate-800 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">
                        Open aircraft profile
                      </span>

                      <span className="text-sm font-semibold text-sky-400">
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
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
    available:
      "border-emerald-900 bg-emerald-950/30 text-emerald-300",

    maintenance:
      "border-amber-900 bg-amber-950/30 text-amber-300",

    grounded:
      "border-red-900 bg-red-950/30 text-red-300",

    unavailable:
      "border-slate-700 bg-slate-950 text-slate-400",
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