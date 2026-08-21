import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AlertsClient from "./alerts-client";

export type Alert = {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  is_active: boolean;
  read_at: string | null;
  resolved_at: string | null;
  created_at: string;
};

export default async function AlertsPage() {
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

  /*
    Refresh the current operational state first.
  */
  const { error: refreshError } =
    await supabase.rpc(
      "refresh_operational_alerts"
    );

  if (refreshError) {
    throw new Error(refreshError.message);
  }

  const { data, error } = await supabase
    .from("operational_alerts")
    .select(
      `
        id,
        alert_type,
        severity,
        title,
        message,
        entity_type,
        entity_id,
        is_active,
        read_at,
        resolved_at,
        created_at
      `
    )
    .eq("organization_id", membership.organization_id)
    .order("is_active", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const alerts: Alert[] = data ?? [];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
              AeroOS
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Alerts Center
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Monitor, review, and resolve operational alerts.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Dashboard
            </Link>

            <Link
              href="/dispatch"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Dispatch
            </Link>
          </div>
        </div>
      </header>

      <AlertsClient initialAlerts={alerts} />
    </main>
  );
}