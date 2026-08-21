import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error: "Not authenticated",
      },
      { status: 401 }
    );
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json(
      {
        error: "No organization membership found.",
      },
      { status: 400 }
    );
  }

  const organizationId = membership.organization_id;

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, full_name")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: instructor, error: instructorError } = await supabase
    .from("instructors")
    .select("id, full_name")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: aircraft, error: aircraftError } = await supabase
    .from("aircraft")
    .select("id, registration, aircraft_type")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: lesson, error: lessonError } = await supabase
    .from("training_lessons")
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    studentError ||
    instructorError ||
    aircraftError ||
    lessonError ||
    !student ||
    !instructor ||
    !aircraft ||
    !lesson
  ) {
    return NextResponse.json(
      {
        error: "Could not find all test records.",
        details: {
          studentError: studentError?.message ?? null,
          instructorError: instructorError?.message ?? null,
          aircraftError: aircraftError?.message ?? null,
          lessonError: lessonError?.message ?? null,
        },
      },
      { status: 400 }
    );
  }

  const { data: validation, error: validationError } =
    await supabase.rpc("validate_flight_booking", {
      p_student_id: student.id,
      p_instructor_id: instructor.id,
      p_aircraft_id: aircraft.id,
      p_lesson_id: lesson.id,
      p_start_time: "2026-08-22T07:00:00+03:00",
      p_end_time: "2026-08-22T08:30:00+03:00",
    });

  if (validationError) {
    return NextResponse.json(
      {
        error: validationError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    student: student.full_name,
    instructor: instructor.full_name,
    aircraft: aircraft.registration,
    lesson: lesson.name,
    validation,
  });
}
