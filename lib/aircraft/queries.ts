import { createClient } from "@/lib/supabase/server";

export async function getCurrentOrganization() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: membership, error } = await supabase
    .from("organization_memberships")
    .select(
      `
        organization_id,
        role,
        organizations (
          id,
          name,
          slug
        )
      `
    )
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error || !membership) {
    return null;
  }

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;

  if (!organization) {
    return null;
  }

  return {
    user,
    membership,
    organization,
  };
}

export async function getAircraft() {
  const context = await getCurrentOrganization();

  if (!context) {
    return {
      organization: null,
      aircraft: [],
    };
  }

  const supabase = await createClient();

  const { data: aircraft, error } = await supabase
    .from("aircraft")
    .select("*")
    .eq("organization_id", context.organization.id)
    .order("registration", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return {
    organization: context.organization,
    aircraft: aircraft ?? [],
  };
}
