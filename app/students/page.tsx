import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function StudentsPage() {
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

  const { data: students, error } = await supabase
    .from("students")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .order("full_name", { ascending: true });

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
            <h1 className="mt-1 text-2xl font-bold">Students</h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage student pilots and training progress.
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
            <h2 className="text-3xl font-bold">Student pilots</h2>
            <p className="mt-2 text-slate-400">
              {students?.length ?? 0} student
              {(students?.length ?? 0) === 1 ? "" : "s"}
            </p>
          </div>

          <Link
            href="/students/new"
            className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
          >
            Add student
          </Link>
        </div>

        {!students || students.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
            <h3 className="text-xl font-semibold">No students yet</h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              Add your first student pilot to begin building the training
              database.
            </p>

            <Link
              href="/students/new"
              className="mt-6 inline-flex rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
            >
              Add first student
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-slate-800 bg-slate-950/60">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Student
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Program
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Flight hours
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Student number
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b border-slate-800 last:border-b-0"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/students/${student.id}`}
                          className="font-semibold text-sky-400 hover:text-sky-300"
                        >
                          {student.full_name}
                        </Link>

                        <p className="mt-1 text-xs text-slate-500">
                          {student.email || "No email"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {student.training_program || "Not assigned"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs capitalize text-slate-300">
                          {student.training_status.replaceAll("_", " ")}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {Number(student.total_flight_hours).toFixed(2)}
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {student.student_number || "—"}
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