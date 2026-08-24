// Content domain: collection metadata mirroring the API's CONTENT_CONFIG plus
// a small typed client for /admin/content. Every call sends the session cookie
// (credentials:"include"); failures raise ApiError carrying the server's error
// code so screens can render precise inline messages (slug_taken, invalid_state).
import { API_BASE_URL } from "./config";

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

/** Server error code + HTTP status; `code === "network_error"` when fetch itself threw. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

// Set once by App on mount; any 401 anywhere drops the user back to login.
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void): void {
  unauthorizedHandler = fn;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/admin/content${path}`, {
      credentials: "include",
      ...init,
    });
  } catch {
    throw new ApiError(0, "network_error");
  }
  if (res.status === 401 && unauthorizedHandler) unauthorizedHandler();
  if (res.status === 204) return undefined as T;
  // Boundary: server error bodies are `{ error: string }`; anything else falls
  // back to a synthetic http_<status> code.
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const code =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : `http_${res.status}`;
    throw new ApiError(res.status, code);
  }
  return body as T;
}

export function listContent(
  name: CollectionName,
  filter: StatusFilter,
): Promise<ContentRow[]> {
  // The API treats an absent status as "everything except trashed"; there is
  // no literal `status=all`, so the All chip omits the param entirely.
  return request<ContentRow[]>(`/${name}${filter === "all" ? "" : `?status=${filter}`}`);
}

export function getContent(name: CollectionName, id: string): Promise<ContentRow> {
  return request<ContentRow>(`/${name}/${id}`);
}

export function createContent(
  name: CollectionName,
  slug: string,
  fields: Record<string, string>,
): Promise<ContentRow> {
  return request<ContentRow>(`/${name}`, {
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
  return request<ContentRow>(`/${name}/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(fields),
  });
}

export function trashContent(name: CollectionName, id: string): Promise<void> {
  return request<void>(`/${name}/${id}`, { method: "DELETE" });
}

export function restoreContent(name: CollectionName, id: string): Promise<ContentRow> {
  return request<ContentRow>(`/${name}/${id}/restore`, { method: "POST" });
}

export function publishContent(name: CollectionName, id: string): Promise<ContentRow> {
  return request<ContentRow>(`/${name}/${id}/publish`, { method: "POST" });
}

export function unpublishContent(name: CollectionName, id: string): Promise<ContentRow> {
  return request<ContentRow>(`/${name}/${id}/unpublish`, { method: "POST" });
}

export function listRevisions(
  name: CollectionName,
  id: string,
): Promise<RevisionSummary[]> {
  return request<RevisionSummary[]>(`/${name}/${id}/revisions`);
}

export function getRevision(
  name: CollectionName,
  id: string,
  version: number,
): Promise<Revision> {
  return request<Revision>(`/${name}/${id}/revisions/${version}`);
}

export function restoreRevision(
  name: CollectionName,
  id: string,
  version: number,
): Promise<ContentRow> {
  return request<ContentRow>(`/${name}/${id}/revisions/${version}/restore`, {
    method: "POST",
  });
}
