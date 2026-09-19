"use client";

import { useState, useId, useRef, useMemo } from "react";
import { UploadIcon, CheckIcon } from "./workspace-icons";
import { useUser, useUpdateProfile } from "../../hooks/auth/useAuth";

export interface ProfileDetails {
  fullName: string;
  dateOfBirth: string;
  profession: string;
  location: string;
  education: string;
  yearOfPassing: string;
  phone: string;
  website: string;
  bio: string;
}

const INITIAL_PROFILE: ProfileDetails = {
  fullName: "Tanveer Singh",
  dateOfBirth: "1998-05-14",
  profession: "Advocate",
  location: "New Delhi, India",
  education: "NLSIU, Bangalore",
  yearOfPassing: "2021",
  phone: "+91 98765 43210",
  website: "https://tanveersingh.legal",
  bio: "Advocate practicing primarily before the National Company Law Tribunal (NCLT) and the High Court of Delhi. Specializing in insolvency and bankruptcy (IBC), corporate restructuring, debt resolution, and commercial dispute litigation.",
};

const INITIAL_USERNAME = "tanveer";

const ACCOUNT_DETAILS = {
  email: "tanveersinghrajpurohit4@gmail.com",
  signInMethod: "Google OAuth",
  memberSince: "March 2024",
  currentStreak: "14 days",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "TS";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1];
  if (!last) return first.slice(0, 2).toUpperCase();
  const firstChar = first[0] ?? "";
  const lastChar = last[0] ?? "";
  return (firstChar + lastChar).toUpperCase() || "TS";
}

export function ProfileView() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formId = useId();

  const { data: userProfile } = useUser();
  const updateProfileMutation = useUpdateProfile();

  const savedDetails: ProfileDetails = useMemo(() => {
    if (!userProfile) return INITIAL_PROFILE;
    return {
      fullName: userProfile.full_name || INITIAL_PROFILE.fullName,
      dateOfBirth: INITIAL_PROFILE.dateOfBirth,
      profession: userProfile.law_firm || INITIAL_PROFILE.profession,
      location: userProfile.city || INITIAL_PROFILE.location,
      education: INITIAL_PROFILE.education,
      yearOfPassing: INITIAL_PROFILE.yearOfPassing,
      phone: userProfile.phone_number || INITIAL_PROFILE.phone,
      website: INITIAL_PROFILE.website,
      bio: INITIAL_PROFILE.bio,
    };
  }, [userProfile]);

  const [formEdits, setFormEdits] = useState<Partial<ProfileDetails>>({});
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const formDetails: ProfileDetails = useMemo(() => {
    return { ...savedDetails, ...formEdits };
  }, [savedDetails, formEdits]);

  const defaultUsername = useMemo(() => {
    if (userProfile?.email) {
      const emailPrefix = userProfile.email.split("@")[0];
      if (emailPrefix) return emailPrefix;
    }
    return INITIAL_USERNAME;
  }, [userProfile]);

  const [customUsername, setCustomUsername] = useState<string | null>(null);
  const savedUsername = customUsername !== null ? customUsername : defaultUsername;
  const [usernameInput, setUsernameInput] = useState<string | null>(null);
  const activeUsernameInput = usernameInput !== null ? usernameInput : savedUsername;
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<string | null>(null);

  const [photoUploaded, setPhotoUploaded] = useState(false);

  const isDirty = Object.keys(formEdits).length > 0;

  const handleFieldChange = (field: keyof ProfileDetails, value: string) => {
    setFormEdits((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (saveStatus) setSaveStatus(null);
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus("Changes saved successfully");
    updateProfileMutation.mutate({
      full_name: formDetails.fullName,
      phone_number: formDetails.phone,
      law_firm: formDetails.profession,
      city: formDetails.location,
    });
    setFormEdits({});
    setTimeout(() => {
      setSaveStatus(null);
    }, 3500);
  };

  const handleDiscardDetails = () => {
    setFormEdits({});
    setSaveStatus(null);
  };

  const handleUpdateUsername = (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError(null);
    setUsernameStatus(null);

    const trimmed = activeUsernameInput.trim();
    if (trimmed.length < 3 || trimmed.length > 30) {
      setUsernameError("Username must be between 3 and 30 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9._]+$/.test(trimmed)) {
      setUsernameError("Letters, numbers, dots and underscores only.");
      return;
    }

    setCustomUsername(trimmed);
    setUsernameInput(trimmed);
    setUsernameStatus("Username updated successfully");
    setTimeout(() => {
      setUsernameStatus(null);
    }, 3500);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPhotoUploaded(true);
      setTimeout(() => setPhotoUploaded(false), 3000);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5 sm:p-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* 1. Header */}
      <header className="flex flex-col gap-1 pb-6">
        <h1 className="m-0 font-sans text-2xl font-semibold tracking-tight text-stone-950">
          Profile
        </h1>
        <p className="m-0 max-w-2xl pt-0.5 text-xs text-stone-500">
          Manage how you appear across your matters, drafts and hearing briefs.
        </p>
      </header>

      <div className="flex flex-col gap-5 sm:gap-6 pb-12">
        {/* 2. Profile summary card */}
        <section className="rounded-xl border border-stone-200/90 bg-white p-5 shadow-2xs sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
              {/* Large circular avatar with initials */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[#cbe0f2] bg-[#edf4fa] font-sans text-lg font-bold text-[#2c5478] shadow-2xs sm:h-18 sm:w-18 sm:text-xl">
                {getInitials(savedDetails.fullName)}
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="m-0 text-base font-semibold text-stone-900 sm:text-lg">
                    {savedDetails.fullName}
                  </h2>
                  <span className="inline-flex items-center rounded-md border border-[#cbe0f2] bg-[#edf4fa] px-2 py-0.5 text-xs font-medium text-[#2c5478]">
                    {savedDetails.profession || "Advocate"}
                  </span>
                  <span className="inline-flex items-center rounded-md border border-stone-200/90 bg-stone-100 px-2 py-0.5 font-mono text-xs font-medium text-stone-700">
                    @{savedUsername}
                  </span>
                  <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Unverified
                  </span>
                </div>
                <p className="m-0 text-xs text-stone-500 truncate">
                  {ACCOUNT_DETAILS.email}
                </p>
              </div>
            </div>

            {/* Upload photo button */}
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
                aria-label="Upload profile photo"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-stone-200/90 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-700 shadow-2xs hover:bg-[#edf4fa] hover:text-[#2c5478] transition-colors cursor-pointer"
              >
                <UploadIcon size={14} className="text-[#487aa8]" />
                <span>Upload photo</span>
              </button>
              {photoUploaded && (
                <span className="text-[11px] font-medium text-emerald-600">
                  Photo selected (mock)
                </span>
              )}
            </div>
          </div>
        </section>

        {/* 3. Personal details card */}
        <section className="rounded-xl border border-stone-200/90 bg-white p-5 shadow-2xs sm:p-6">
          <div className="border-b border-stone-100 pb-4">
            <h2 className="m-0 font-sans text-sm font-semibold text-stone-900 sm:text-base">
              Personal details
            </h2>
            <p className="m-0 pt-1 text-xs text-stone-500">
              This information appears on your drafts, notes and matter records.
            </p>
          </div>

          <form onSubmit={handleSaveDetails} className="pt-4 flex flex-col gap-4">
            {/* Desktop layout: Six fields across the first row on wide desktop */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {/* 1. Full name */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`${formId}-fullName`}
                  className="text-xs font-semibold text-stone-700"
                >
                  Full name
                </label>
                <input
                  id={`${formId}-fullName`}
                  type="text"
                  value={formDetails.fullName}
                  onChange={(e) => handleFieldChange("fullName", e.target.value)}
                  className="h-9 w-full rounded-lg border border-stone-200/90 bg-white px-3 text-xs text-stone-900 shadow-2xs transition-[border-color,box-shadow] placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none"
                  placeholder="e.g. Tanveer Singh"
                />
              </div>

              {/* 2. Date of birth */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`${formId}-dateOfBirth`}
                  className="text-xs font-semibold text-stone-700"
                >
                  Date of birth
                </label>
                <input
                  id={`${formId}-dateOfBirth`}
                  type="date"
                  value={formDetails.dateOfBirth}
                  onChange={(e) =>
                    handleFieldChange("dateOfBirth", e.target.value)
                  }
                  className="h-9 w-full rounded-lg border border-stone-200/90 bg-white px-3 text-xs text-stone-900 shadow-2xs transition-[border-color,box-shadow] placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none"
                />
              </div>

              {/* 3. Profession */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`${formId}-profession`}
                  className="text-xs font-semibold text-stone-700"
                >
                  Profession
                </label>
                <input
                  id={`${formId}-profession`}
                  type="text"
                  value={formDetails.profession}
                  onChange={(e) =>
                    handleFieldChange("profession", e.target.value)
                  }
                  className="h-9 w-full rounded-lg border border-stone-200/90 bg-white px-3 text-xs text-stone-900 shadow-2xs transition-[border-color,box-shadow] placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none"
                  placeholder="e.g. Advocate"
                />
              </div>

              {/* 4. Location */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`${formId}-location`}
                  className="text-xs font-semibold text-stone-700"
                >
                  Location
                </label>
                <input
                  id={`${formId}-location`}
                  type="text"
                  value={formDetails.location}
                  onChange={(e) =>
                    handleFieldChange("location", e.target.value)
                  }
                  className="h-9 w-full rounded-lg border border-stone-200/90 bg-white px-3 text-xs text-stone-900 shadow-2xs transition-[border-color,box-shadow] placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none"
                  placeholder="e.g. New Delhi, India"
                />
              </div>

              {/* 5. Education */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`${formId}-education`}
                  className="text-xs font-semibold text-stone-700"
                >
                  Education
                </label>
                <input
                  id={`${formId}-education`}
                  type="text"
                  value={formDetails.education}
                  onChange={(e) =>
                    handleFieldChange("education", e.target.value)
                  }
                  className="h-9 w-full rounded-lg border border-stone-200/90 bg-white px-3 text-xs text-stone-900 shadow-2xs transition-[border-color,box-shadow] placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none"
                  placeholder="e.g. NLSIU, Bangalore"
                />
              </div>

              {/* 6. Year of passing */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`${formId}-yearOfPassing`}
                  className="text-xs font-semibold text-stone-700"
                >
                  Year of passing
                </label>
                <input
                  id={`${formId}-yearOfPassing`}
                  type="text"
                  value={formDetails.yearOfPassing}
                  onChange={(e) =>
                    handleFieldChange("yearOfPassing", e.target.value)
                  }
                  className="h-9 w-full rounded-lg border border-stone-200/90 bg-white px-3 text-xs text-stone-900 shadow-2xs transition-[border-color,box-shadow] placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none"
                  placeholder="e.g. 2021"
                />
              </div>
            </div>

            {/* Second row: Phone + Website */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {/* Phone */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`${formId}-phone`}
                  className="text-xs font-semibold text-stone-700"
                >
                  Phone
                </label>
                <input
                  id={`${formId}-phone`}
                  type="tel"
                  value={formDetails.phone}
                  onChange={(e) => handleFieldChange("phone", e.target.value)}
                  className="h-9 w-full rounded-lg border border-stone-200/90 bg-white px-3 text-xs text-stone-900 shadow-2xs transition-[border-color,box-shadow] placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none"
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              {/* Website */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`${formId}-website`}
                  className="text-xs font-semibold text-stone-700"
                >
                  Website
                </label>
                <input
                  id={`${formId}-website`}
                  type="url"
                  value={formDetails.website}
                  onChange={(e) =>
                    handleFieldChange("website", e.target.value)
                  }
                  className="h-9 w-full rounded-lg border border-stone-200/90 bg-white px-3 text-xs text-stone-900 shadow-2xs transition-[border-color,box-shadow] placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none"
                  placeholder="e.g. https://lawvriksh.com"
                />
              </div>
            </div>

            {/* Full-width Bio textarea */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`${formId}-bio`}
                  className="text-xs font-semibold text-stone-700"
                >
                  Bio
                </label>
                <span className="text-[11px] font-mono text-stone-400">
                  {formDetails.bio.length}/500
                </span>
              </div>
              <textarea
                id={`${formId}-bio`}
                rows={3}
                maxLength={500}
                value={formDetails.bio}
                onChange={(e) => handleFieldChange("bio", e.target.value)}
                className="w-full resize-y rounded-lg border border-stone-200/90 bg-white p-3 text-xs text-stone-900 shadow-2xs transition-[border-color,box-shadow] placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none"
                placeholder="Brief professional background, areas of practice, and admissions..."
              />
            </div>

            {/* Form actions: Discard & Save changes */}
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between border-t border-stone-100">
              <div className="flex items-center gap-1.5">
                {saveStatus && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 animate-in fade-in duration-200">
                    <CheckIcon size={13} />
                    <span>{saveStatus}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleDiscardDetails}
                  disabled={!isDirty}
                  className="rounded-lg border border-stone-200/90 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-600 shadow-2xs hover:bg-stone-50 hover:text-stone-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={!isDirty}
                  className="rounded-lg bg-[#487aa8] px-4 py-1.5 text-xs font-medium text-white shadow-2xs hover:bg-[#3b668d] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save changes
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* 4. Username card */}
        <section className="rounded-xl border border-stone-200/90 bg-white p-5 shadow-2xs sm:p-6">
          <div className="border-b border-stone-100 pb-4">
            <h2 className="m-0 font-sans text-sm font-semibold text-stone-900 sm:text-base">
              Username
            </h2>
            <p className="m-0 pt-1 text-xs text-stone-500">
              Your unique handle across LawVriksh.
            </p>
          </div>

          <form onSubmit={handleUpdateUsername} className="pt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5 sm:max-w-md">
              <label
                htmlFor={`${formId}-username`}
                className="text-xs font-semibold text-stone-700"
              >
                Username handle
              </label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3 font-mono text-xs text-stone-400">
                  @
                </span>
                <input
                  id={`${formId}-username`}
                  type="text"
                  value={activeUsernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    if (usernameError) setUsernameError(null);
                    if (usernameStatus) setUsernameStatus(null);
                  }}
                  className="h-9 w-full rounded-lg border border-stone-200/90 bg-white pl-7 pr-3 font-mono text-xs text-stone-900 shadow-2xs transition-[border-color,box-shadow] placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none"
                  placeholder="username"
                />
              </div>
              <p className="m-0 text-[11px] text-stone-400">
                3–30 characters. Letters, numbers, dots and underscores only.
              </p>
              {usernameError && (
                <p className="m-0 text-[11px] font-medium text-rose-600">
                  {usernameError}
                </p>
              )}
              {usernameStatus && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <CheckIcon size={13} />
                  <span>{usernameStatus}</span>
                </span>
              )}
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={activeUsernameInput.trim() === savedUsername}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#487aa8] px-3.5 py-1.5 text-xs font-medium text-white shadow-2xs hover:bg-[#3b668d] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>@ Update username</span>
              </button>
            </div>
          </form>
        </section>

        {/* 5. Account card */}
        <section className="rounded-xl border border-stone-200/90 bg-white p-5 shadow-2xs sm:p-6">
          <div className="border-b border-stone-100 pb-4">
            <h2 className="m-0 font-sans text-sm font-semibold text-stone-900 sm:text-base">
              Account
            </h2>
            <p className="m-0 pt-1 text-xs text-stone-500">
              Details managed by your sign-in method — edit these from Settings.
            </p>
          </div>

          <div className="pt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-stone-200/70 bg-stone-50/70 p-3.5 select-text">
              <span className="block text-[11px] font-medium text-stone-400">
                Email
              </span>
              <span className="mt-1 block text-xs font-medium text-stone-800 truncate" title={userProfile?.email || ACCOUNT_DETAILS.email}>
                {userProfile?.email || ACCOUNT_DETAILS.email}
              </span>
            </div>

            <div className="rounded-lg border border-stone-200/70 bg-stone-50/70 p-3.5 select-text">
              <span className="block text-[11px] font-medium text-stone-400">
                Sign-in method
              </span>
              <span className="mt-1 block text-xs font-medium text-stone-800">
                {ACCOUNT_DETAILS.signInMethod}
              </span>
            </div>

            <div className="rounded-lg border border-stone-200/70 bg-stone-50/70 p-3.5 select-text">
              <span className="block text-[11px] font-medium text-stone-400">
                Member since
              </span>
              <span className="mt-1 block text-xs font-medium text-stone-800">
                {userProfile?.created_at
                  ? new Date(userProfile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                  : ACCOUNT_DETAILS.memberSince}
              </span>
            </div>

            {/* Current streak */}
            <div className="rounded-lg border border-stone-200/70 bg-stone-50/70 p-3.5 select-text">
              <span className="block text-[11px] font-medium text-stone-400">
                Current streak
              </span>
              <span className="mt-1 block text-xs font-medium text-stone-800">
                {ACCOUNT_DETAILS.currentStreak}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
