import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships, error } = await supabase
    .from("organization_memberships")
    .select(
      `
        id,
        role,
        organization_id,
        organizations (
          id,
          name,
          slug
        )
      `
    )
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  const membership = memberships?.[0];

  if (!membership) {
    redirect("/onboarding");
  }

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;

  if (!organization) {
    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
              AeroOS
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              {organization.name}
            </h1>
          </div>

          <div className="text-right">
            <p className="text-sm text-slate-400">{user.email}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-sky-400">
              {membership.role.replaceAll("_", " ")}
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm text-slate-400">
            Aviation Operations Command Center
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Welcome to AeroOS
          </h2>

          <p className="mt-2 max-w-2xl text-slate-400">
            Your aviation operations platform is ready for its first modules.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Students",
              description: "Manage student pilots and training progress.",
            },
            {
              title: "Instructors",
              description: "Manage instructors, qualifications, and schedules.",
            },
            {
              title: "Aircraft",
              description: "Manage fleet availability, hours, and maintenance.",
            },
            {
              title: "Flights",
              description: "Schedule and operate daily flight activity.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <h3 className="text-lg font-semibold">{item.title}</h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                {item.description}
              </p>

              <div className="mt-6 text-xs font-medium uppercase tracking-wider text-sky-400">
                Coming next
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}