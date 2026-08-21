import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .limit(1);

  if (error) {
    return NextResponse.json(
      { connected: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    connected: true,
    data,
  });
}
