// Users domain client — every /admin/users route is owner-only server-side
// (403 forbidden for editors); the portal additionally hides the section.
import { apiRequest } from "./api";

export type AdminUser = {
  id: string;
  email: string;
  role: "owner" | "editor";
  disabled_at: number | null;
};

export function listUsers(): Promise<AdminUser[]> {
  return apiRequest<AdminUser[]>("/admin/users");
}

export function createUser(input: {
  email: string;
  password: string;
  role: AdminUser["role"];
}): Promise<AdminUser> {
  return apiRequest<AdminUser>("/admin/users", "", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function disableUser(id: string): Promise<void> {
  return apiRequest<void>("/admin/users", `/${id}/disable`, { method: "POST" });
}

export function enableUser(id: string): Promise<void> {
  return apiRequest<void>("/admin/users", `/${id}/enable`, { method: "POST" });
}

export function resetPassword(id: string, newPassword: string): Promise<void> {
  return apiRequest<void>("/admin/users", `/${id}/reset-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ new_password: newPassword }),
  });
}
