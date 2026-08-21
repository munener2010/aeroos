"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DispatchFlight } from "./page";

const columns = [
  {
    status: "scheduled",
    title: "Scheduled",
  },
  {
    status: "checked_in",
    title: "Checked In",
  },
  {
    status: "pre_flight",
    title: "Pre-Flight",
  },
  {
    status: "dispatched",
    title: "Dispatched",
  },
  {
    status: "airborne",
    title: "Airborne",
  },
  {
    status: "returned",
    title: "Returned",
  },
  {
    status: "post_flight",
    title: "Post-Flight",
  },
  {
    status: "closed",
    title: "Closed",
  },
  {
    status: "delayed",
    title: "Delayed",
  },
  {
    status: "cancelled",
    title: "Cancelled",
  },
];

const nextStatuses: Record<
  string,
  Array<{ status: string; label: string }>
> = {
  scheduled: [
    {
      status: "checked_in",
      label: "Check in",
    },
    {
      status: "delayed",
      label: "Mark delayed",
    },
    {
      status: "cancelled",
      label: "Cancel",
    },
  ],

  checked_in: [
    {
      status: "pre_flight",
      label: "Start pre-flight",
    },
    {
      status: "delayed",
      label: "Mark delayed",
    },
    {
      status: "cancelled",
      label: "Cancel",
    },
  ],

  pre_flight: [
    {
      status: "dispatched",
      label: "Dispatch",
    },
    {
      status: "delayed",
      label: "Mark delayed",
    },
    {
      status: "cancelled",
      label: "Cancel",
    },
  ],

  dispatched: [
    {
      status: "airborne",
      label: "Mark airborne",
    },
    {
      status: "delayed",
      label: "Mark delayed",
    },
  ],

  airborne: [
    {
      status: "returned",
      label: "Mark returned",
    },
  ],

  returned: [
    {
      status: "post_flight",
      label: "Start post-flight",
    },
  ],

  post_flight: [
    {
      status: "closed",
      label: "Close flight",
    },
  ],

  delayed: [
    {
      status: "scheduled",
      label: "Reschedule",
    },
    {
      status: "checked_in",
      label: "Check in",
    },
    {
      status: "cancelled",
      label: "Cancel",
    },
  ],

  closed: [],

  cancelled: [],
};

export default function DispatchBoard({
  initialFlights,
  organizationName,
}: {
  initialFlights: DispatchFlight[];
  organizationName: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [flights, setFlights] =
    useState<DispatchFlight[]>(initialFlights);

  const [updatingFlightId, setUpdatingFlightId] =
    useState<string | null>(null);

  const [error, setError] = useState("");

  const groupedFlights = useMemo(() => {
    const groups: Record<string, DispatchFlight[]> = {};

    for (const column of columns) {
      groups[column.status] = [];
    }

    for (const flight of flights) {
      if (!groups[flight.status]) {
        groups[flight.status] = [];
      }

      groups[flight.status].push(flight);
    }

    return groups;
  }, [flights]);

  async function transitionFlight(
    flightId: string,
    newStatus: string
  ) {
    setError("");
    setUpdatingFlightId(flightId);

    const { data, error: transitionError } =
      await supabase.rpc(
        "transition_flight_status",
        {
          p_flight_id: flightId,
          p_new_status: newStatus,
        }
      );

    if (transitionError) {
      setError(transitionError.message);
      setUpdatingFlightId(null);
      return;
    }

    if (!data) {
      setError("Flight status could not be updated.");
      setUpdatingFlightId(null);
      return;
    }

    setFlights((currentFlights) =>
      currentFlights.map((flight) =>
        flight.id === flightId
          ? {
              ...flight,
              status: data.status,
            }
          : flight
      )
    );

    setUpdatingFlightId(null);

    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
              AeroOS
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Dispatch Board
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              {organizationName}
            </p>
          </div>

          <div className="flex gap-3">
            <a
              href="/flights"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Flights
            </a>

            <a
              href="/dashboard"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Dashboard
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1800px] px-6 py-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Total flights"
            value={flights.length}
          />

          <SummaryCard
            label="Active"
            value={
              flights.filter(
                (flight) =>
                  !["closed", "cancelled"].includes(
                    flight.status
                  )
              ).length
            }
          />

          <SummaryCard
            label="Airborne"
            value={
              flights.filter(
                (flight) => flight.status === "airborne"
              ).length
            }
          />

          <SummaryCard
            label="Delayed"
            value={
              flights.filter(
                (flight) => flight.status === "delayed"
              ).length
            }
          />
        </div>

        {flights.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
            <h2 className="text-xl font-semibold">
              No flights on the dispatch board
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
              Create a validated flight booking first, then it will appear
              here as Scheduled.
            </p>

            <a
              href="/flights/new"
              className="mt-6 inline-flex rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
            >
              Create booking
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto pb-6">
            <div className="flex min-w-[1600px] gap-4">
              {columns.map((column) => (
                <div
                  key={column.status}
                  className="w-[300px] shrink-0 rounded-2xl border border-slate-800 bg-slate-900/70"
                >
                  <div className="border-b border-slate-800 px-4 py-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold">
                        {column.title}
                      </h2>

                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-400">
                        {groupedFlights[column.status]?.length ?? 0}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 p-3">
                    {(groupedFlights[column.status] ?? []).length ===
                    0 ? (
                      <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-600">
                        Empty
                      </div>
                    ) : (
                      groupedFlights[column.status].map((flight) => (
                        <FlightCard
                          key={flight.id}
                          flight={flight}
                          updating={
                            updatingFlightId === flight.id
                          }
                          onTransition={transitionFlight}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function FlightCard({
  flight,
  updating,
  onTransition,
}: {
  flight: DispatchFlight;
  updating: boolean;
  onTransition: (
    flightId: string,
    newStatus: string
  ) => void;
}) {
  const actions = nextStatuses[flight.status] ?? [];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-100">
            {formatTime(flight.start_time)}–
            {formatTime(flight.end_time)}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {new Date(flight.start_time).toLocaleDateString()}
          </p>
        </div>

        <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] capitalize text-slate-400">
          {flight.status.replaceAll("_", " ")}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <Info label="Student">
          {flight.student?.full_name || "—"}
        </Info>

        <Info label="Instructor">
          {flight.instructor?.full_name || "—"}
        </Info>

        <Info label="Aircraft">
          {flight.aircraft?.registration || "—"}
        </Info>

        <Info label="Lesson">
          {flight.lesson?.name || "—"}
        </Info>

        {flight.location && (
          <Info label="Location">
            {flight.location}
          </Info>
        )}
      </div>

      {actions.length > 0 && (
        <div className="mt-4 space-y-2">
          {actions.map((action) => (
            <button
              key={action.status}
              type="button"
              disabled={updating}
              onClick={() =>
                onTransition(flight.id, action.status)
              }
              className="w-full rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updating
                ? "Updating..."
                : action.label}
            </button>
          ))}
        </div>
      )}

      {flight.status === "pre_flight" && (
        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          Dispatch will run the final booking validation again before the
          aircraft can be dispatched.
        </p>
      )}
    </div>
  );
}

function Info({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-0.5 text-sm text-slate-300">
        {children}
      </p>
    </div>
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

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}