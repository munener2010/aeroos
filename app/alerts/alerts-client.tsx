"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Alert } from "./page";

type AlertAction =
  | "read"
  | "unread"
  | "resolve"
  | "reopen";

export default function AlertsClient({
  initialAlerts,
}: {
  initialAlerts: Alert[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const [alerts, setAlerts] =
    useState<Alert[]>(initialAlerts);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const [bulkUpdating, setBulkUpdating] =
    useState(false);

  const [filter, setFilter] =
    useState<
      | "all"
      | "active"
      | "unread"
      | "critical"
      | "resolved"
    >("active");

  const [error, setError] = useState("");

  const activeAlerts = alerts.filter(
    (alert) => alert.is_active
  );

  const unreadAlerts = activeAlerts.filter(
    (alert) => !alert.read_at
  );

  const criticalAlerts = activeAlerts.filter(
    (alert) =>
      alert.severity === "critical"
  );

  const resolvedAlerts = alerts.filter(
    (alert) => !alert.is_active
  );

  const filteredAlerts = useMemo(() => {
    switch (filter) {
      case "active":
        return alerts.filter(
          (alert) => alert.is_active
        );

      case "unread":
        return alerts.filter(
          (alert) =>
            alert.is_active &&
            !alert.read_at
        );

      case "critical":
        return alerts.filter(
          (alert) =>
            alert.is_active &&
            alert.severity === "critical"
        );

      case "resolved":
        return alerts.filter(
          (alert) => !alert.is_active
        );

      case "all":
      default:
        return alerts;
    }
  }, [alerts, filter]);

  async function updateAlert(
    alertId: string,
    action: AlertAction
  ) {
    setError("");
    setUpdatingId(alertId);

    const { data, error: updateError } =
      await supabase.rpc(
        "update_operational_alert",
        {
          p_alert_id: alertId,
          p_action: action,
        }
      );

    if (updateError) {
      setError(updateError.message);
      setUpdatingId(null);
      return;
    }

    if (!data) {
      setError(
        "The alert could not be updated."
      );
      setUpdatingId(null);
      return;
    }

    setAlerts((currentAlerts) =>
      currentAlerts.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              ...data,
            }
          : alert
      )
    );

    setUpdatingId(null);

    router.refresh();
  }

  async function markAllRead() {
    setError("");
    setBulkUpdating(true);

    const { error: updateError } =
      await supabase.rpc(
        "mark_all_operational_alerts_read"
      );

    if (updateError) {
      setError(updateError.message);
      setBulkUpdating(false);
      return;
    }

    const now = new Date().toISOString();

    setAlerts((currentAlerts) =>
      currentAlerts.map((alert) =>
        alert.is_active
          ? {
              ...alert,
              read_at:
                alert.read_at ?? now,
            }
          : alert
      )
    );

    setBulkUpdating(false);

    router.refresh();
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      {/* Summary */}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Active alerts"
          value={activeAlerts.length}
          negative={activeAlerts.length > 0}
        />

        <SummaryCard
          label="Unread"
          value={unreadAlerts.length}
          warning={unreadAlerts.length > 0}
        />

        <SummaryCard
          label="Critical"
          value={criticalAlerts.length}
          negative={criticalAlerts.length > 0}
        />
      </div>

      {/* Controls */}

      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-2">
            <FilterButton
              label={`Active (${activeAlerts.length})`}
              active={filter === "active"}
              onClick={() =>
                setFilter("active")
              }
            />

            <FilterButton
              label={`Unread (${unreadAlerts.length})`}
              active={filter === "unread"}
              onClick={() =>
                setFilter("unread")
              }
            />

            <FilterButton
              label={`Critical (${criticalAlerts.length})`}
              active={filter === "critical"}
              onClick={() =>
                setFilter("critical")
              }
            />

            <FilterButton
              label={`All (${alerts.length})`}
              active={filter === "all"}
              onClick={() =>
                setFilter("all")
              }
            />

            <FilterButton
              label={`Resolved (${resolvedAlerts.length})`}
              active={filter === "resolved"}
              onClick={() =>
                setFilter("resolved")
              }
            />
          </div>

          <button
            type="button"
            onClick={markAllRead}
            disabled={
              bulkUpdating ||
              unreadAlerts.length === 0
            }
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {bulkUpdating
              ? "Updating..."
              : "Mark all read"}
          </button>
        </div>
      </div>

      {/* Error */}

      {error && (
        <div className="mt-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Alert list */}

      <div className="mt-8 space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950 text-emerald-400">
              ✓
            </div>

            <h2 className="mt-4 text-xl font-semibold">
              No alerts in this view
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              AeroOS has nothing requiring attention here.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              updating={
                updatingId === alert.id
              }
              onUpdate={updateAlert}
            />
          ))
        )}
      </div>
    </section>
  );
}

function AlertCard({
  alert,
  updating,
  onUpdate,
}: {
  alert: Alert;
  updating: boolean;
  onUpdate: (
    alertId: string,
    action: AlertAction
  ) => void;
}) {
  const href = getEntityHref(alert);

  return (
    <div
      className={`rounded-2xl border p-5 ${
        alert.is_active
          ? alert.severity === "critical"
            ? "border-red-900 bg-red-950/20"
            : alert.severity === "warning"
              ? "border-amber-900 bg-amber-950/20"
              : "border-slate-800 bg-slate-900"
          : "border-slate-800 bg-slate-950 opacity-65"
      }`}
    >
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div className="flex min-w-0 gap-4">
          <SeverityIcon
            severity={alert.severity}
          />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-semibold text-slate-100">
                {alert.title}
              </h2>

              {alert.is_active &&
                !alert.read_at && (
                  <span className="rounded-full bg-sky-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-950">
                    New
                  </span>
                )}

              {!alert.is_active && (
                <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-500">
                  Resolved
                </span>
              )}
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              {alert.message}
            </p>

            <p className="mt-3 text-xs text-slate-600">
              {formatDateTime(
                alert.created_at
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {href && (
            <a
              href={href}
              className="rounded-lg border border-sky-800 px-3 py-2 text-xs font-medium text-sky-300 hover:bg-sky-950/30"
            >
              Open
            </a>
          )}

          {alert.is_active ? (
            <>
              <button
                type="button"
                disabled={updating}
                onClick={() =>
                  onUpdate(
                    alert.id,
                    alert.read_at
                      ? "unread"
                      : "read"
                  )
                }
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                {updating
                  ? "Updating..."
                  : alert.read_at
                    ? "Mark unread"
                    : "Mark read"}
              </button>

              <button
                type="button"
                disabled={updating}
                onClick={() =>
                  onUpdate(
                    alert.id,
                    "resolve"
                  )
                }
                className="rounded-lg border border-emerald-800 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-950/30 disabled:opacity-50"
              >
                {updating
                  ? "Updating..."
                  : "Resolve"}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={updating}
              onClick={() =>
                onUpdate(
                  alert.id,
                  "reopen"
                )
              }
              className="rounded-lg border border-amber-800 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-950/30 disabled:opacity-50"
            >
              {updating
                ? "Updating..."
                : "Reopen"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
        active
          ? "bg-sky-500 text-slate-950"
          : "border border-slate-700 text-slate-400 hover:bg-slate-800"
      }`}
    >
      {label}
    </button>
  );
}

function SeverityIcon({
  severity,
}: {
  severity: string;
}) {
  if (severity === "critical") {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 font-bold text-white">
        !
      </div>
    );
  }

  if (severity === "warning") {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 font-bold text-slate-950">
        !
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500 font-bold text-slate-950">
      i
    </div>
  );
}

function SummaryCard({
  label,
  value,
  negative = false,
  warning = false,
}: {
  label: string;
  value: number;
  negative?: boolean;
  warning?: boolean;
}) {
  let valueClass = "text-white";

  if (negative) {
    valueClass = "text-red-300";
  } else if (warning) {
    valueClass = "text-amber-300";
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
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
}

function getEntityHref(alert: Alert) {
  if (
    !alert.entity_type ||
    !alert.entity_id
  ) {
    return null;
  }

  switch (alert.entity_type) {
    case "aircraft":
      return `/aircraft/${alert.entity_id}`;

    case "flight":
      return `/flights/${alert.entity_id}`;

    case "maintenance_task":
      return `/maintenance/${alert.entity_id}/complete`;

    default:
      return null;
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}