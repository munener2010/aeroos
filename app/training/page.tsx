import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function TrainingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
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

  const { data: programs, error } = await supabase
    .from("training_programs")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
              AeroOS
            </p>

            <h1 className="mt-1 text-2xl font-bold">Training</h1>

            <p className="mt-1 text-sm text-slate-400">
              Manage training programs, stages, and lessons.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Dashboard
            </Link>

            <Link
              href="/training/new"
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              Add program
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Training programs</h2>

          <p className="mt-2 text-slate-400">
            {programs?.length ?? 0} program
            {(programs?.length ?? 0) === 1 ? "" : "s"}
          </p>
        </div>

        {!programs || programs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
            <h3 className="text-xl font-semibold">
              No training programs yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              Create your first training program and then add stages and
              lessons to it.
            </p>

            <Link
              href="/training/new"
              className="mt-6 inline-flex rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
            >
              Create first program
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {programs.map((program) => (
              <Link
                key={program.id}
                href={`/training/${program.id}`}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-sky-700 hover:bg-slate-900/80"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-xl font-semibold text-white">
                    {program.name}
                  </h3>

                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs capitalize text-slate-300">
                    {program.status}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-400">
                  {program.description || "No description provided."}
                </p>

                <p className="mt-6 text-sm font-medium text-sky-400">
                  Open program →
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}