"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Student = {
  id: string;
  full_name: string;
  student_number: string | null;
};

type Instructor = {
  id: string;
  full_name: string;
  instructor_number: string | null;
  instructor_type: string | null;
};

type Aircraft = {
  id: string;
  registration: string;
  aircraft_type: string;
  status: string;
};

type Lesson = {
  id: string;
  name: string;
  lesson_type: string;
  estimated_duration_minutes: number | null;
};

type ValidationResult = {
  result: "valid" | "warning" | "blocked";
  blockers: string[];
  warnings: string[];
};

export default function NewFlightPage() {
  const router = useRouter();
  const supabase = createClient();

  const [students, setStudents] = useState<Student[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [studentId, setStudentId] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [aircraftId, setAircraftId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("08:30");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const [validation, setValidation] =
    useState<ValidationResult | null>(null);

  const [loadingData, setLoadingData] = useState(true);
  const [validating, setValidating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const [
        studentsResponse,
        instructorsResponse,
        aircraftResponse,
        lessonsResponse,
      ] = await Promise.all([
        supabase
          .from("students")
          .select("id, full_name, student_number")
          .order("full_name", { ascending: true }),

        supabase
          .from("instructors")
          .select(
            "id, full_name, instructor_number, instructor_type"
          )
          .eq("status", "active")
          .order("full_name", { ascending: true }),

        supabase
          .from("aircraft")
          .select(
            "id, registration, aircraft_type, status"
          )
          .order("registration", { ascending: true }),

        supabase
          .from("training_lessons")
          .select(
            "id, name, lesson_type, estimated_duration_minutes"
          )
          .order("name", { ascending: true }),
      ]);

      const dataError =
        studentsResponse.error ||
        instructorsResponse.error ||
        aircraftResponse.error ||
        lessonsResponse.error;

      if (dataError) {
        setError(dataError.message);
        setLoadingData(false);
        return;
      }

      const loadedStudents = studentsResponse.data ?? [];
      const loadedInstructors = instructorsResponse.data ?? [];
      const loadedAircraft = aircraftResponse.data ?? [];
      const loadedLessons = lessonsResponse.data ?? [];

      setStudents(loadedStudents);
      setInstructors(loadedInstructors);
      setAircraft(loadedAircraft);
      setLessons(loadedLessons);

      if (loadedStudents.length > 0) {
        setStudentId(loadedStudents[0].id);
      }

      if (loadedInstructors.length > 0) {
        setInstructorId(loadedInstructors[0].id);
      }

      if (loadedAircraft.length > 0) {
        setAircraftId(loadedAircraft[0].id);
      }

      if (loadedLessons.length > 0) {
        setLessonId(loadedLessons[0].id);

        const duration =
          loadedLessons[0].estimated_duration_minutes;

        if (duration) {
          setEndTime(
            addMinutesToTime(startTime, duration)
          );
        }
      }

      setDate(getTodayDate());
      setLoadingData(false);
    }

    loadData();
  }, [router, supabase]);

  async function validateBooking() {
    setError("");
    setValidation(null);

    if (
      !studentId ||
      !instructorId ||
      !aircraftId ||
      !lessonId ||
      !date ||
      !startTime ||
      !endTime
    ) {
      setError("Complete all required booking fields.");
      return;
    }

    const startDateTime = buildDateTime(date, startTime);
    const endDateTime = buildDateTime(date, endTime);

    if (endDateTime <= startDateTime) {
      setError("End time must be after start time.");
      return;
    }

    setValidating(true);

    const { data, error: validationError } =
      await supabase.rpc("validate_flight_booking", {
        p_student_id: studentId,
        p_instructor_id: instructorId,
        p_aircraft_id: aircraftId,
        p_lesson_id: lessonId,
        p_start_time: startDateTime,
        p_end_time: endDateTime,
      });

    if (validationError) {
      setError(validationError.message);
      setValidating(false);
      return;
    }

    setValidation(data as ValidationResult);
    setValidating(false);
  }

  async function createBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!validation) {
      setError("Validate the booking before creating it.");
      return;
    }

    if (validation.result === "blocked") {
      setError(
        "This booking is blocked and cannot be created."
      );
      return;
    }

    const startDateTime = buildDateTime(date, startTime);
    const endDateTime = buildDateTime(date, endTime);

    setCreating(true);

    // Re-validate immediately before saving.
    const {
      data: finalValidation,
      error: finalValidationError,
    } = await supabase.rpc("validate_flight_booking", {
      p_student_id: studentId,
      p_instructor_id: instructorId,
      p_aircraft_id: aircraftId,
      p_lesson_id: lessonId,
      p_start_time: startDateTime,
      p_end_time: endDateTime,
    });

    if (finalValidationError) {
      setError(finalValidationError.message);
      setCreating(false);
      return;
    }

    const currentValidation =
      finalValidation as ValidationResult;

    setValidation(currentValidation);

    if (currentValidation.result === "blocked") {
      setError(
        "The booking became invalid before it could be saved."
      );
      setCreating(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: membership, error: membershipError } =
      await supabase
        .from("organization_memberships")
        .select("organization_id, role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (membershipError || !membership) {
      setError("No organization membership was found.");
      setCreating(false);
      return;
    }

    if (
      membership.role !== "owner" &&
      membership.role !== "operations_manager"
    ) {
      setError(
        "You do not have permission to create flights."
      );
      setCreating(false);
      return;
    }

    const { data: createdFlight, error: insertError } =
      await supabase
        .from("flights")
        .insert({
          organization_id: membership.organization_id,
          student_id: studentId,
          instructor_id: instructorId,
          aircraft_id: aircraftId,
          lesson_id: lessonId,
          start_time: startDateTime,
          end_time: endDateTime,
          location: location.trim() || null,
          status: "scheduled",
          notes: notes.trim() || null,
          created_by: user.id,
        })
        .select("id")
        .single();

    if (insertError || !createdFlight) {
      setError(
        insertError?.message ??
          "Flight could not be created."
      );
      setCreating(false);
      return;
    }

    router.push("/flights");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
            AeroOS
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Create flight booking
          </h1>

          <p className="mt-2 text-slate-400">
            AeroOS validates the student, instructor, aircraft, lesson,
            availability, conflicts, maintenance, and dispatch blockers before
            the booking is saved.
          </p>
        </div>

        <form
          onSubmit={createBooking}
          className="space-y-8 rounded-2xl border border-slate-800 bg-slate-900 p-8"
        >
          {loadingData ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
              Loading operational data...
            </div>
          ) : (
            <>
              {/* People and resources */}
              <section>
                <h2 className="text-lg font-semibold">
                  Flight resources
                </h2>

                <div className="mt-5 space-y-5">
                  <SelectField
                    label="Student"
                    value={studentId}
                    onChange={setStudentId}
                    options={students.map((student) => ({
                      value: student.id,
                      label: student.student_number
                        ? `${student.full_name} — ${student.student_number}`
                        : student.full_name,
                    }))}
                  />

                  <SelectField
                    label="Instructor"
                    value={instructorId}
                    onChange={setInstructorId}
                    options={instructors.map((instructor) => ({
                      value: instructor.id,
                      label: instructor.instructor_number
                        ? `${instructor.full_name} — ${instructor.instructor_number}`
                        : instructor.full_name,
                    }))}
                  />

                  <SelectField
                    label="Aircraft"
                    value={aircraftId}
                    onChange={setAircraftId}
                    options={aircraft.map((item) => ({
                      value: item.id,
                      label: `${item.registration} — ${item.aircraft_type} (${item.status})`,
                    }))}
                  />

                  <SelectField
                    label="Training lesson"
                    value={lessonId}
                    onChange={(value) => {
                      setLessonId(value);

                      const selectedLesson =
                        lessons.find(
                          (lesson) => lesson.id === value
                        );

                      if (
                        selectedLesson?.estimated_duration_minutes
                      ) {
                        setEndTime(
                          addMinutesToTime(
                            startTime,
                            selectedLesson.estimated_duration_minutes
                          )
                        );
                      }
                    }}
                    options={lessons.map((lesson) => ({
                      value: lesson.id,
                      label: `${lesson.name} — ${lesson.lesson_type}`,
                    }))}
                  />
                </div>
              </section>

              {/* Time */}
              <section>
                <h2 className="text-lg font-semibold">
                  Schedule
                </h2>

                <div className="mt-5 grid gap-5 sm:grid-cols-3">
                  <Field
                    label="Date"
                    type="date"
                    value={date}
                    onChange={setDate}
                    required
                  />

                  <Field
                    label="Start time"
                    type="time"
                    value={startTime}
                    onChange={(value) => {
                      setStartTime(value);

                      const selectedLesson =
                        lessons.find(
                          (lesson) => lesson.id === lessonId
                        );

                      if (
                        selectedLesson?.estimated_duration_minutes
                      ) {
                        setEndTime(
                          addMinutesToTime(
                            value,
                            selectedLesson.estimated_duration_minutes
                          )
                        );
                      }
                    }}
                    required
                  />

                  <Field
                    label="End time"
                    type="time"
                    value={endTime}
                    onChange={setEndTime}
                    required
                  />
                </div>
              </section>

              {/* Location */}
              <section>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Location"
                    value={location}
                    onChange={setLocation}
                    placeholder="HKJK"
                  />

                  <div />
                </div>

                <div className="mt-5">
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Notes
                  </label>

                  <textarea
                    value={notes}
                    onChange={(event) =>
                      setNotes(event.target.value)
                    }
                    rows={4}
                    placeholder="Operational notes..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                  />
                </div>
              </section>

              {/* Validation */}
              <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-lg font-semibold">
                      Booking validation
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Validate before attempting to create the flight.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={validateBooking}
                    disabled={validating}
                    className="rounded-xl border border-sky-700 px-5 py-3 font-semibold text-sky-300 transition hover:bg-sky-500/10 disabled:opacity-60"
                  >
                    {validating
                      ? "Validating..."
                      : "Validate booking"}
                  </button>
                </div>

                {validation && (
                  <div className="mt-6">
                    <ValidationPanel validation={validation} />
                  </div>
                )}
              </section>
            </>
          )}

          {error && (
            <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/flights")}
              className="rounded-xl border border-slate-700 px-5 py-3 font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                creating ||
                loadingData ||
                !validation ||
                validation.result === "blocked"
              }
              className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating
                ? "Creating flight..."
                : "Confirm booking"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-500"
      >
        <option value="">Select {label.toLowerCase()}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-500"
      />
    </div>
  );
}

function ValidationPanel({
  validation,
}: {
  validation: ValidationResult;
}) {
  const isValid = validation.result === "valid";
  const isWarning = validation.result === "warning";
  const isBlocked = validation.result === "blocked";

  return (
    <div
      className={`rounded-xl border p-5 ${
        isValid
          ? "border-emerald-900 bg-emerald-950/30"
          : isWarning
            ? "border-amber-900 bg-amber-950/30"
            : "border-red-900 bg-red-950/30"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
            isValid
              ? "bg-emerald-500 text-slate-950"
              : isWarning
                ? "bg-amber-500 text-slate-950"
                : "bg-red-500 text-white"
          }`}
        >
          {isValid ? "✓" : isWarning ? "!" : "×"}
        </span>

        <div>
          <h3 className="font-semibold capitalize">
            {validation.result}
          </h3>

          <p className="text-sm opacity-70">
            {isValid
              ? "All current validation checks passed."
              : isWarning
                ? "The booking can be reviewed, but there are warnings."
                : "This booking cannot currently be created."}
          </p>
        </div>
      </div>

      {validation.blockers.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-semibold">
            Blocking issues
          </p>

          <div className="mt-2 space-y-2">
            {validation.blockers.map((blocker, index) => (
              <div
                key={`${blocker}-${index}`}
                className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200"
              >
                {blocker}
              </div>
            ))}
          </div>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-semibold">
            Warnings
          </p>

          <div className="mt-2 space-y-2">
            {validation.warnings.map((warning, index) => (
              <div
                key={`${warning}-${index}`}
                className="rounded-lg border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-200"
              >
                {warning}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getTodayDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildDateTime(
  date: string,
  time: string
) {
  return `${date}T${time}:00+03:00`;
}

function addMinutesToTime(
  time: string,
  minutes: number
) {
  const [hours, mins] = time.split(":").map(Number);

  const total = hours * 60 + mins + minutes;

  const normalized = ((total % 1440) + 1440) % 1440;

  const newHours = Math.floor(normalized / 60);
  const newMinutes = normalized % 60;

  return `${String(newHours).padStart(2, "0")}:${String(
    newMinutes
  ).padStart(2, "0")}`;
}