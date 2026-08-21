"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(value: string) {
    setOrganizationName(value);

    const generatedSlug = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    setOrganizationSlug(generatedSlug);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const cleanName = organizationName.trim();
    const cleanSlug = organizationSlug.trim().toLowerCase();

    if (cleanName.length < 2) {
      setError("Organization name must be at least 2 characters.");
      setLoading(false);
      return;
    }

    if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
      setError(
        "Organization slug can only contain lowercase letters, numbers, and hyphens."
      );
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      router.refresh();
      return;
    }

    const { error: createError } = await supabase.rpc(
      "create_organization",
      {
        organization_name: cleanName,
        organization_slug: cleanSlug,
      }
    );

    if (createError) {
      setError(createError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
            AeroOS
          </p>

          <h1 className="text-3xl font-bold text-white">
            Set up your aviation organization
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            This creates your organization and makes your account its first
            owner.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="organizationName"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Organization name
            </label>

            <input
              id="organizationName"
              type="text"
              value={organizationName}
              onChange={(event) => handleNameChange(event.target.value)}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-500"
              placeholder="Nairobi Flight Academy"
            />
          </div>

          <div>
            <label
              htmlFor="organizationSlug"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Organization URL slug
            </label>

            <input
              id="organizationSlug"
              type="text"
              value={organizationSlug}
              onChange={(event) =>
                setOrganizationSlug(
                  event.target.value.toLowerCase().replace(/\s+/g, "-")
                )
              }
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-500"
              placeholder="nairobi-flight-academy"
            />

            <p className="mt-2 text-xs text-slate-500">
              Use lowercase letters, numbers, and hyphens only.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating organization..." : "Create organization"}
          </button>
        </form>
      </div>
    </main>
  );
}