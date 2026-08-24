// Shared fetch plumbing for every /admin mount. Extracted from content.ts once
// a second domain needed identical behavior: session cookie on every call,
// global 401 drop-to-login, and ApiError carrying the server's error token
// (e.g. too_large, republish_required, email_taken) so screens render precise
// inline messages.
import { API_BASE_URL } from "./config";

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

/**
 * Sends one admin request against `mount` (e.g. "/admin/forms") + `path`.
 * Resolves with the raw Response so header-carrying callers (inbox unread
 * count) work; most callers want `apiRequest` instead. Bodies pass through
 * untouched: JSON callers set their own content-type, media sends FormData.
 */
export async function adminFetch(
  mount: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${mount}${path}`, {
      credentials: "include",
      ...init,
    });
  } catch {
    throw new ApiError(0, "network_error");
  }
  if (res.status === 401 && unauthorizedHandler) unauthorizedHandler();
  return res;
}

/** Parses an admin response body; non-2xx becomes ApiError (server `{error}` or http_<status>). */
export async function apiParse<T>(res: Response): Promise<T> {
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

/** JSON convenience over adminFetch: returns the parsed body of a 2xx response. */
export async function apiRequest<T>(
  mount: string,
  path: string = "",
  init?: RequestInit,
): Promise<T> {
  return apiParse<T>(await adminFetch(mount, path, init));
}
