import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type TrainingProgramPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TrainingProgramPage({
  params,
}: TrainingProgramPageProps) {
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

  const { data: program, error: programError } = await supabase
    .from("training_programs")
    .select("*")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (programError) {
    throw new Error(programError.message);
  }

  if (!program) {
    notFound();
  }

  const { data: stages, error: stagesError } = await supabase
    .from("training_stages")
    .select("*")
    .eq("training_program_id", program.id)
    .eq("organization_id", membership.organization_id)
    .order("stage_order", { ascending: true });

  if (stagesError) {
    throw new Error(stagesError.message);
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
              {program.name}
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Training program
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/training"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Back to training
            </Link>

            <Link
              href={`/training/${program.id}/stages/new`}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              Add stage
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-bold">{program.name}</h2>

                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs capitalize text-slate-300">
                  {program.status}
                </span>
              </div>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                {program.description || "No description provided."}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-4 text-right">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Stages
              </p>

              <p className="mt-1 text-2xl font-bold">
                {stages?.length ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">Training stages</h3>

            <p className="mt-1 text-sm text-slate-400">
              Organize the program into a logical progression.
            </p>
          </div>

          <Link
            href={`/training/${program.id}/stages/new`}
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Add stage
          </Link>
        </div>

        <div className="mt-6 space-y-4">
          {!stages || stages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
              <h4 className="text-xl font-semibold">
                No stages yet
              </h4>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                Create the first stage of this training program. Lessons will
                be added inside each stage.
              </p>

              <Link
                href={`/training/${program.id}/stages/new`}
                className="mt-6 inline-flex rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
              >
                Add first stage
              </Link>
            </div>
          ) : (
            stages.map((stage) => (
              <div
                key={stage.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 font-bold text-slate-950">
                      {stage.stage_order}
                    </div>

                    <div>
                      <h4 className="text-xl font-semibold">
                        {stage.name}
                      </h4>

                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {stage.description || "No stage description."}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/training/${program.id}/stages/${stage.id}`}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                  >
                    Open stage
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}