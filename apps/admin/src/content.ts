// Content domain: collection metadata mirroring the API's CONTENT_CONFIG plus
// a small typed client for /admin/content. Fetch plumbing (session cookie,
// 401 drop-to-login, ApiError carrying the server's error token) lives in api.ts.
import { apiRequest } from "./api";

export type CollectionName = "activities" | "programs" | "news";
export type ContentStatus = "draft" | "published" | "unpublished" | "trashed";
export type StatusFilter = ContentStatus | "all";

export type FieldSpec = { key: string; label: string; multiline?: boolean };

// Keep in sync with apps/api/src/lib/content-config.ts.
export const COLLECTIONS: { name: CollectionName; label: string; fields: FieldSpec[] }[] = [
  {
    name: "activities",
    label: "Activities",
    fields: [
      { key: "title", label: "Title" },
      { key: "tag", label: "Tag" },
      { key: "image_url", label: "Image URL" },
      { key: "description", label: "Description", multiline: true },
      { key: "body", label: "Body", multiline: true },
    ],
  },
  {
    name: "programs",
    label: "Programs",
    fields: [
      { key: "title", label: "Title" },
      { key: "image_url", label: "Image URL" },
      { key: "description", label: "Description", multiline: true },
      { key: "deadline_text", label: "Deadline text" },
    ],
  },
  {
    name: "news",
    label: "News",
    fields: [
      { key: "title", label: "Title" },
      { key: "image_url", label: "Image URL" },
      { key: "excerpt", label: "Excerpt", multiline: true },
    ],
  },
];

// Admin view of a record: identity/lifecycle plus the merged content fields.
export type ContentRow = {
  id: string;
  slug: string;
  _status: ContentStatus;
  updated_at: number;
} & Record<string, unknown>;

export type RevisionSummary = { version: number; created_at: number };
export type Revision = {
  version: number;
  data: Record<string, unknown>;
  created_at: number;
};

export function listContent(
  name: CollectionName,
  filter: StatusFilter,
): Promise<ContentRow[]> {
  // The API treats an absent status as "everything except trashed"; there is
  // no literal `status=all`, so the All chip omits the param entirely.
  return apiRequest<ContentRow[]>("/admin/content", `/${name}${filter === "all" ? "" : `?status=${filter}`}`);
}

export function getContent(name: CollectionName, id: string): Promise<ContentRow> {
  return apiRequest<ContentRow>("/admin/content", `/${name}/${id}`);
}

export function createContent(
  name: CollectionName,
  slug: string,
  fields: Record<string, string>,
): Promise<ContentRow> {
  return apiRequest<ContentRow>("/admin/content", `/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug, ...fields }),
  });
}

// The API forbids a slug key on PATCH (slugs are immutable); callers pass only
// field values.
export function updateContent(
  name: CollectionName,
  id: string,
  fields: Record<string, string>,
): Promise<ContentRow> {
  return apiRequest<ContentRow>("/admin/content", `/${name}/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(fields),
  });
}

export function trashContent(name: CollectionName, id: string): Promise<void> {
  return apiRequest<void>("/admin/content", `/${name}/${id}`, { method: "DELETE" });
}

export function restoreContent(name: CollectionName, id: string): Promise<ContentRow> {
  return apiRequest<ContentRow>("/admin/content", `/${name}/${id}/restore`, { method: "POST" });
}

export function publishContent(name: CollectionName, id: string): Promise<ContentRow> {
  return apiRequest<ContentRow>("/admin/content", `/${name}/${id}/publish`, { method: "POST" });
}

export function unpublishContent(name: CollectionName, id: string): Promise<ContentRow> {
  return apiRequest<ContentRow>("/admin/content", `/${name}/${id}/unpublish`, { method: "POST" });
}

export function listRevisions(
  name: CollectionName,
  id: string,
): Promise<RevisionSummary[]> {
  return apiRequest<RevisionSummary[]>("/admin/content", `/${name}/${id}/revisions`);
}

export function getRevision(
  name: CollectionName,
  id: string,
  version: number,
): Promise<Revision> {
  return apiRequest<Revision>("/admin/content", `/${name}/${id}/revisions/${version}`);
}

export function restoreRevision(
  name: CollectionName,
  id: string,
  version: number,
): Promise<ContentRow> {
  return apiRequest<ContentRow>("/admin/content", `/${name}/${id}/revisions/${version}/restore`, {
    method: "POST",
  });
}
