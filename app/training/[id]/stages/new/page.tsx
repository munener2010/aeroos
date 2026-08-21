"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewTrainingStagePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stageOrder, setStageOrder] = useState("1");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const programId = params.id;

    if (!programId || programId === "undefined") {
      setError("Invalid training program.");
      setLoading(false);
      return;
    }

    const order = Number(stageOrder);

    if (!Number.isInteger(order) || order < 1) {
      setError("Stage order must be a whole number greater than zero.");
      setLoading(false);
      return;
    }

    if (!name.trim()) {
      setError("Stage name is required.");
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: membership, error: membershipError } = await supabase
      .from("organization_memberships")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership) {
      setError("No organization membership was found.");
      setLoading(false);
      return;
    }

    if (
      membership.role !== "owner" &&
      membership.role !== "operations_manager"
    ) {
      setError("You do not have permission to create training stages.");
      setLoading(false);
      return;
    }

    const { data: program, error: programError } = await supabase
      .from("training_programs")
      .select("id")
      .eq("id", programId)
      .eq("organization_id", membership.organization_id)
      .maybeSingle();

    if (programError || !program) {
      setError("Training program not found.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("training_stages")
      .insert({
        organization_id: membership.organization_id,
        training_program_id: programId,
        name: name.trim(),
        description: description.trim() || null,
        stage_order: order,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        setError(
          "That stage order is already being used in this training program."
        );
      } else {
        setError(insertError.message);
      }

      setLoading(false);
      return;
    }

    router.push(`/training/${programId}`);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          AeroOS
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Add training stage
        </h1>

        <p className="mt-2 text-slate-400">
          Add a stage to this training program.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8"
        >
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Stage name
            </label>

            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="Fundamentals"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label
              htmlFor="stageOrder"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Stage order
            </label>

            <input
              id="stageOrder"
              type="number"
              min="1"
              step="1"
              value={stageOrder}
              onChange={(event) => setStageOrder(event.target.value)}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              Example: 1 for the first stage, 2 for the second.
            </p>
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Description
            </label>

            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              placeholder="Describe the goals of this stage..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push(`/training/${params.id}`)}
              className="rounded-xl border border-slate-700 px-5 py-3 font-medium text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create stage"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}