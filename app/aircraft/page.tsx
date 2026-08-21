import Link from "next/link";
import { redirect } from "next/navigation";
import { getAircraft } from "@/lib/aircraft/queries";

export default async function AircraftPage() {
  const { organization, aircraft } = await getAircraft();

  if (!organization) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
              AeroOS
            </p>
            <h1 className="mt-1 text-2xl font-bold">Aircraft Fleet</h1>
            <p className="mt-1 text-sm text-slate-400">
              {organization.name}
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Fleet</h2>
            <p className="mt-2 text-slate-400">
              Manage aircraft assigned to your organization.
            </p>
          </div>

          <Link
            href="/aircraft/new"
            className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
          >
            Add aircraft
          </Link>
        </div>

        {aircraft.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
            <h3 className="text-xl font-semibold">No aircraft yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              Add your first aircraft to begin building the fleet.
            </p>

            <Link
              href="/aircraft/new"
              className="mt-6 inline-flex rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
            >
              Add your first aircraft
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-slate-800 bg-slate-950/60">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Registration
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Type
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Hours
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Location
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {aircraft.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-800 last:border-b-0"
                    >
                      <td className="px-5 py-4 font-semibold">
  <Link
    href={`/aircraft/${item.id}`}
    className="text-sky-400 hover:text-sky-300"
  >
    {item.registration}
  </Link>
</td>

                      <td className="px-5 py-4 text-slate-300">
                        {item.aircraft_type}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs capitalize text-slate-300">
                          {item.status.replaceAll("_", " ")}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {Number(item.total_hours).toFixed(2)}
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {item.base_location || "—"}
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