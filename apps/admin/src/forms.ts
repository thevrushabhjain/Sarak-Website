// Forms domain client for /admin/forms: list/create/edit dynamic forms,
// publish (freezes a version), version history, trash. Field changes on a
// published form are refused with republish_required (409); trashing a form
// that owns registrations fails with has_submissions (409).
import { apiRequest } from "./api";

export type FieldType =
  | "text"
  | "email"
  | "phone"
  | "number"
  | "date"
  | "single-choice"
  | "multi-choice"
  | "consent"
  | "long-text";

export type FormField = {
  type: FieldType;
  label: string;
  key: string;
  required?: boolean;
  options?: string[];
  max_length?: number;
};

export type FormStatus = "draft" | "published" | "trashed";
export type FormFilter = FormStatus | "all";

export type FormRow = {
  id: string;
  name: string;
  status: FormStatus;
  program_id: string | null;
  created_at: number;
  updated_at: number;
  fields: FormField[];
};

export type FormVersion = { version: number; created_at: number; fields: FormField[] };

export type PublishedForm = { form: FormRow; version: number };

export function listForms(filter: FormFilter): Promise<FormRow[]> {
  return apiRequest<FormRow[]>("/admin/forms", filter === "all" ? "" : `?status=${filter}`);
}

export function getForm(id: string): Promise<FormRow> {
  return apiRequest<FormRow>("/admin/forms", `/${id}`);
}

export function createForm(
  name: string,
  programId: string | null,
  fields: FormField[],
): Promise<FormRow> {
  return apiRequest<FormRow>("/admin/forms", "", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      ...(programId ? { program_id: programId } : {}),
      fields,
    }),
  });
}

export function updateForm(
  id: string,
  patch: { name: string; program_id: string | null; fields?: FormField[] },
): Promise<FormRow> {
  return apiRequest<FormRow>("/admin/forms", `/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export function publishForm(id: string): Promise<PublishedForm> {
  return apiRequest<PublishedForm>("/admin/forms", `/${id}/publish`, { method: "POST" });
}

export function listVersions(id: string): Promise<FormVersion[]> {
  return apiRequest<FormVersion[]>("/admin/forms", `/${id}/versions`);
}

export function trashForm(id: string): Promise<void> {
  return apiRequest<void>("/admin/forms", `/${id}`, { method: "DELETE" });
}
