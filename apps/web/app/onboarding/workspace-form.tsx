"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { WORKSPACE_NAME_MAX, type WorkspaceSummary } from "@veritas/shared";
import { Button, TextField } from "@veritas/ui";
import { apiFetch } from "@/lib/api-client";

export function WorkspaceForm({ suggestedName }: { suggestedName: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    setFormError("");
    if (!name) {
      setError("Name is required");
      return;
    }
    if (name.length > WORKSPACE_NAME_MAX) {
      setError(`Use ${WORKSPACE_NAME_MAX} characters or fewer`);
      return;
    }
    setError("");
    setIsSubmitting(true);
    const result = await apiFetch<WorkspaceSummary>("/api/v1/workspaces", { method: "POST", body: { name } });
    if (!result.ok) {
      setIsSubmitting(false);
      if (result.error.fields?.name) setError(result.error.fields.name);
      else setFormError(result.error.error);
      return;
    }
    router.replace(`/w/${result.data.id}`);
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <TextField
        label="Workspace name"
        name="name"
        defaultValue={suggestedName}
        maxLength={WORKSPACE_NAME_MAX + 20}
        hint="Use your company, team or practice name. You can change it later."
        error={error}
        autoFocus
      />
      {formError ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      ) : null}
      <Button type="submit" size="lg" isLoading={isSubmitting} loadingLabel="Creating workspace…">
        Create workspace
      </Button>
    </form>
  );
}
