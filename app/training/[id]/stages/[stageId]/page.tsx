import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type StagePageProps = {
  params: Promise<{
    id: string;
    stageId: string;
  }>;
};

export default async function TrainingStagePage({
  params,
}: StagePageProps) {
  const { id: programId, stageId } = await params;

  if (
    !programId ||
    programId === "undefined" ||
    !stageId ||
    stageId === "undefined"
  ) {
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

  const { data: program, error: programError } = await supabase
    .from("training_programs")
    .select("id, name, status")
    .eq("id", programId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (programError) {
    throw new Error(programError.message);
  }

  if (!program) {
    notFound();
  }

  const { data: stage, error: stageError } = await supabase
    .from("training_stages")
    .select("*")
    .eq("id", stageId)
    .eq("training_program_id", program.id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (stageError) {
    throw new Error(stageError.message);
  }

  if (!stage) {
    notFound();
  }

  const { data: lessons, error: lessonsError } = await supabase
    .from("training_lessons")
    .select("*")
    .eq("training_stage_id", stage.id)
    .eq("organization_id", membership.organization_id)
    .order("lesson_order", { ascending: true });

  if (lessonsError) {
    throw new Error(lessonsError.message);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
              AeroOS
            </p>

            <p className="mt-1 text-sm text-slate-400">
              {program.name}
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Stage {stage.stage_order}: {stage.name}
            </h1>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/training/${program.id}`}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Back to program
            </Link>

            <Link
              href={`/training/${program.id}/stages/${stage.id}/lessons/new`}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              Add lesson
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Stage description</p>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            {stage.description || "No description provided."}
          </p>
        </div>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Lessons</h2>

            <p className="mt-1 text-sm text-slate-400">
              {lessons?.length ?? 0} lesson
              {(lessons?.length ?? 0) === 1 ? "" : "s"} in this stage.
            </p>
          </div>

          <Link
            href={`/training/${program.id}/stages/${stage.id}/lessons/new`}
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Add lesson
          </Link>
        </div>

        <div className="mt-6 space-y-4">
          {!lessons || lessons.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
              <h3 className="text-xl font-semibold">No lessons yet</h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                Add the first lesson for this stage.
              </p>

              <Link
                href={`/training/${program.id}/stages/${stage.id}/lessons/new`}
                className="mt-6 inline-flex rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
              >
                Add first lesson
              </Link>
            </div>
          ) : (
            lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 font-bold text-slate-950">
                      {lesson.lesson_order}
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold">
                        {lesson.name}
                      </h3>

                      <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">
                        {lesson.lesson_type}
                      </p>

                      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                        {lesson.description || "No description provided."}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[330px]">
                    <InfoCard
                      label="Duration"
                      value={
                        lesson.estimated_duration_minutes
                          ? `${lesson.estimated_duration_minutes} min`
                          : "Not set"
                      }
                    />

                    <InfoCard
                      label="Required"
                      value={lesson.is_required ? "Yes" : "No"}
                    />

                    <InfoCard
                      label="Instructor requirement"
                      value={
                        lesson.required_instructor_qualification ||
                        "Not configured"
                      }
                    />

                    <InfoCard
                      label="Aircraft requirement"
                      value={
                        lesson.eligible_aircraft_type ||
                        "Not configured"
                      }
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
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