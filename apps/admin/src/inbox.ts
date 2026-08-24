// Inbox domain client for /admin/inbox: enquiry + registration submissions.
// The list response carries the current unread total in the x-unread-count
// header (the tab badges), so this client returns rows and the count together.
// Deletion is soft (trashed_at); owners may hard-purge trashed rows per kind.
import { adminFetch, apiParse, apiRequest } from "./api";

export type InboxKind = "enquiry" | "registration";
export type InboxRow = {
  id: string;
  payload: Record<string, unknown>;
  read_at: number | null;
  created_at: number;
};

export async function listInbox(
  kind: InboxKind,
  unreadOnly: boolean,
): Promise<{ rows: InboxRow[]; unread: number }> {
  const res = await adminFetch("/admin/inbox", `/${kind}${unreadOnly ? "?unread=1" : ""}`);
  const rows = await apiParse<InboxRow[]>(res);
  const unread = Number(res.headers.get("x-unread-count") ?? "0");
  return { rows, unread: Number.isFinite(unread) ? unread : 0 };
}

export function markInboxRead(id: string): Promise<void> {
  return apiRequest<void>("/admin/inbox", `/submissions/${id}/read`, { method: "POST" });
}

export function deleteInboxRow(id: string): Promise<void> {
  return apiRequest<void>("/admin/inbox", `/submissions/${id}`, { method: "DELETE" });
}

export function purgeTrashed(kind: InboxKind): Promise<{ deleted: number }> {
  return apiRequest<{ deleted: number }>("/admin/inbox", `/${kind}`, { method: "DELETE" });
}
