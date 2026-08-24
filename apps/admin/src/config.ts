// Single source of truth for the API location. All admin fetches go here.
export const API_BASE_URL = "https://sarak-api.team-8db.workers.dev";

export type UserRole = "owner" | "editor";

export type User = {
  id: string;
  email: string;
  role: UserRole;
};
