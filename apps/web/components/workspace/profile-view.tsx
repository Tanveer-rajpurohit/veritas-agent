"use client";

import { useId, useState, type FormEvent } from "react";
import { useUpdateProfile, useUser } from "../../hooks/auth/useAuth";
import type { UserProfile } from "../../types/auth/types";
import { NameBlobAvatar } from "../brand/name-blob-avatar";
import { CheckIcon } from "./workspace-icons";

interface ProfileForm {
  full_name: string;
  phone_number: string;
  law_firm: string;
  bar_council_number: string;
  city: string;
}

const EMPTY_PROFILE: ProfileForm = {
  full_name: "",
  phone_number: "",
  law_firm: "",
  bar_council_number: "",
  city: "",
};

const fields: Array<{ key: keyof ProfileForm; label: string; placeholder: string; autoComplete?: string }> = [
  { key: "full_name", label: "Full name", placeholder: "Your full name", autoComplete: "name" },
  { key: "law_firm", label: "Law firm or chambers", placeholder: "Firm or chambers" },
  { key: "bar_council_number", label: "Bar Council number", placeholder: "Enrollment number" },
  { key: "phone_number", label: "Phone", placeholder: "+91 98765 43210", autoComplete: "tel" },
  { key: "city", label: "City", placeholder: "New Delhi", autoComplete: "address-level2" },
];

export function ProfileView() {
  const { data: user, isLoading, error } = useUser();

  if (isLoading) return <div className="p-7 text-sm text-stone-500">Loading your profile…</div>;
  if (error || !user) {
    return (
      <div className="p-7" role="alert">
        <h1 className="m-0 text-xl font-semibold text-stone-950">Profile unavailable</h1>
        <p className="mt-2 text-sm text-stone-600">Sign in again to load your account details.</p>
      </div>
    );
  }

  return <ProfileEditor key={user.updated_at} user={user} />;
}

function ProfileEditor({ user }: { user: UserProfile }) {
  const formId = useId();
  const updateProfile = useUpdateProfile();
  const [form, setForm] = useState<ProfileForm>({
    ...EMPTY_PROFILE,
    full_name: user.full_name ?? user.display_name ?? "",
    phone_number: user.phone_number ?? "",
    law_firm: user.law_firm ?? "",
    bar_council_number: user.bar_council_number ?? "",
    city: user.city ?? "",
  });
  const [saved, setSaved] = useState(false);
  const displayName = form.full_name || user.email.split("@")[0] || "Veritas user";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    await updateProfile.mutateAsync(form);
    setSaved(true);
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f8fafc] px-5 py-7 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#6383a0]">Account</p>
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-stone-950">Your profile</h1>
          <p className="mt-1 text-sm text-stone-500">Details used across matters, drafts, and exports.</p>
        </header>

        <section className="overflow-hidden rounded-xl border border-[#cbe0f2] bg-white">
          <div className="flex flex-col gap-5 border-b border-[#dce9f4] bg-[#f2f7fb] p-5 sm:flex-row sm:items-center sm:p-7">
            <NameBlobAvatar name={displayName} size={78} className="shrink-0 drop-shadow-sm" />
            <div className="min-w-0">
              <h2 className="m-0 truncate text-xl font-semibold text-[#183f60]">{displayName}</h2>
              <p className="mt-1 truncate text-sm text-[#58758e]">{user.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-7">
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <label key={field.key} htmlFor={`${formId}-${field.key}`} className={field.key === "full_name" ? "sm:col-span-2" : ""}>
                  <span className="mb-1.5 block text-xs font-semibold text-stone-700">{field.label}</span>
                  <input
                    id={`${formId}-${field.key}`}
                    value={form[field.key]}
                    autoComplete={field.autoComplete}
                    onChange={(event) => {
                      setSaved(false);
                      setForm((current) => ({ ...current, [field.key]: event.target.value }));
                    }}
                    placeholder={field.placeholder}
                    className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none transition-[border-color,box-shadow] placeholder:text-stone-400 focus:border-[#487aa8] focus:ring-2 focus:ring-[#487aa8]/15"
                  />
                </label>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-5">
              <div aria-live="polite" className="text-xs">
                {saved && <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700"><CheckIcon size={13} />Profile saved</span>}
                {updateProfile.error && <span className="text-rose-700">{updateProfile.error.message}</span>}
              </div>
              <button type="submit" disabled={updateProfile.isPending || !form.full_name.trim()} className="h-10 rounded-lg bg-[#487aa8] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#38648c] disabled:cursor-not-allowed disabled:opacity-50">
                {updateProfile.isPending ? "Saving…" : "Save profile"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
