import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DispatchBoard from "./dispatch-board";

export type DispatchFlight = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  location: string | null;

  student: {
    full_name: string;
  } | null;

  instructor: {
    full_name: string;
  } | null;

  aircraft: {
    registration: string;
    aircraft_type: string;
  } | null;

  lesson: {
    name: string;
  } | null;
};

export default async function DispatchPage() {
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

  const { data, error } = await supabase
    .from("flights")
    .select(
      `
        id,
        start_time,
        end_time,
        status,
        location,
        students (
          full_name
        ),
        instructors (
          full_name
        ),
        aircraft (
          registration,
          aircraft_type
        ),
        training_lessons (
          name
        )
      `
    )
    .eq("organization_id", membership.organization_id)
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const flights: DispatchFlight[] = (data ?? []).map((flight) => ({
    id: flight.id,
    start_time: flight.start_time,
    end_time: flight.end_time,
    status: flight.status,
    location: flight.location,
    student: Array.isArray(flight.students)
      ? flight.students[0] ?? null
      : flight.students,
    instructor: Array.isArray(flight.instructors)
      ? flight.instructors[0] ?? null
      : flight.instructors,
    aircraft: Array.isArray(flight.aircraft)
      ? flight.aircraft[0] ?? null
      : flight.aircraft,
    lesson: Array.isArray(flight.training_lessons)
      ? flight.training_lessons[0] ?? null
      : flight.training_lessons,
  }));

  return (
    <DispatchBoard
      initialFlights={flights}
      organizationName="AeroOS Operations"
    />
  );
}