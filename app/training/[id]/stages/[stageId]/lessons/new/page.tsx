"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const lessonTypes = [
  { value: "flight", label: "Flight" },
  { value: "ground", label: "Ground" },
  { value: "simulator", label: "Simulator" },
  { value: "exam", label: "Exam" },
  { value: "briefing", label: "Briefing" },
  { value: "other", label: "Other" },
];

export default function NewTrainingLessonPage() {
  const params = useParams<{
    id: string;
    stageId: string;
  }>();

  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [lessonOrder, setLessonOrder] = useState("1");
  const [lessonType, setLessonType] = useState("flight");
  const [duration, setDuration] = useState("");
  const [requiredQualification, setRequiredQualification] = useState("");
  const [eligibleAircraftType, setEligibleAircraftType] = useState("");
  const [isRequired, setIsRequired] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const programId = params.id;
    const stageId = params.stageId;

    if (
      !programId ||
      programId === "undefined" ||
      !stageId ||
      stageId === "undefined"
    ) {
      setError("Invalid training stage.");
      setLoading(false);
      return;
    }

    if (!name.trim()) {
      setError("Lesson name is required.");
      setLoading(false);
      return;
    }

    const order = Number(lessonOrder);

    if (!Number.isInteger(order) || order < 1) {
      setError("Lesson order must be a whole number greater than zero.");
      setLoading(false);
      return;
    }

    const parsedDuration = duration ? Number(duration) : null;

    if (
      parsedDuration !== null &&
      (!Number.isInteger(parsedDuration) || parsedDuration <= 0)
    ) {
      setError("Duration must be a positive whole number of minutes.");
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
      setError("You do not have permission to create lessons.");
      setLoading(false);
      return;
    }

    const { data: stage, error: stageError } = await supabase
      .from("training_stages")
      .select("id, training_program_id")
      .eq("id", stageId)
      .eq("training_program_id", programId)
      .eq("organization_id", membership.organization_id)
      .maybeSingle();

    if (stageError || !stage) {
      setError("Training stage not found.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("training_lessons")
      .insert({
        organization_id: membership.organization_id,
        training_stage_id: stage.id,
        name: name.trim(),
        description: description.trim() || null,
        lesson_order: order,
        lesson_type: lessonType,
        estimated_duration_minutes: parsedDuration,
        required_instructor_qualification:
          requiredQualification.trim() || null,
        eligible_aircraft_type:
          eligibleAircraftType.trim() || null,
        is_required: isRequired,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        setError(
          "That lesson order is already being used in this stage."
        );
      } else {
        setError(insertError.message);
      }

      setLoading(false);
      return;
    }

    router.push(
      `/training/${programId}/stages/${stageId}`
    );
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          AeroOS
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Add training lesson
        </h1>

        <p className="mt-2 text-slate-400">
          Define what the student must accomplish during this lesson.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-8 rounded-2xl border border-slate-800 bg-slate-900 p-8"
        >
          <section>
            <h2 className="text-lg font-semibold">
              Lesson information
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field
                label="Lesson name"
                value={name}
                onChange={setName}
                placeholder="Aircraft Familiarization"
                required
              />

              <Field
                label="Lesson order"
                type="number"
                step="1"
                value={lessonOrder}
                onChange={setLessonOrder}
                placeholder="1"
                required
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Lesson type
                </label>

                <select
                  value={lessonType}
                  onChange={(event) =>
                    setLessonType(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                >
                  {lessonTypes.map((type) => (
                    <option
                      key={type.value}
                      value={type.value}
                    >
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <Field
                label="Estimated duration (minutes)"
                type="number"
                step="1"
                value={duration}
                onChange={setDuration}
                placeholder="90"
              />
            </div>
          </section>

          <section>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Description
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={5}
              placeholder="Describe the lesson objectives..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
            />
          </section>

          <section>
            <h2 className="text-lg font-semibold">
              Scheduling requirements
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              These fields become inputs for the future Booking Validation
              Engine.
            </p>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field
                label="Required instructor qualification"
                value={requiredQualification}
                onChange={setRequiredQualification}
                placeholder="Example: Flight Instructor"
              />

              <Field
                label="Eligible aircraft type"
                value={eligibleAircraftType}
                onChange={setEligibleAircraftType}
                placeholder="Example: Cessna 172"
              />
            </div>
          </section>

          <label className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(event) =>
                setIsRequired(event.target.checked)
              }
              className="mt-1 h-4 w-4"
            />

            <span>
              <span className="block text-sm font-medium text-slate-200">
                Required lesson
              </span>

              <span className="mt-1 block text-sm text-slate-400">
                Mark whether students must complete this lesson as part of
                the program.
              </span>
            </span>
          </label>

          {error && (
            <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/training/${params.id}/stages/${params.stageId}`
                )
              }
              className="rounded-xl border border-slate-700 px-5 py-3 font-medium text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create lesson"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  step?: string;
  required?: boolean;
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  step,
  required = false,
}: FieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </label>

      <input
        type={type}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
      />
    </div>
  );
}