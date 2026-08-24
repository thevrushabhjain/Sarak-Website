// Media domain client. The API exposes upload only — there is no list
// endpoint yet, so the screen keeps session-local tiles of what was uploaded
// here. `url` from the API is root-relative; `absoluteUrl` builds the public
// link for previews and copy-to-clipboard.
import { API_BASE_URL } from "./config";
import { apiRequest } from "./api";

export type MediaUpload = {
  id: string;
  key: string;
  mime: string;
  bytes: number;
  url: string;
};

export function absoluteMediaUrl(url: string): string {
  return url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
}

export function uploadMedia(file: File, alt: string): Promise<MediaUpload> {
  // FormData must reach fetch untouched so the browser sets the multipart
  // boundary; alt is optional metadata.
  const form = new FormData();
  form.append("file", file);
  form.append("alt", alt);
  return apiRequest<MediaUpload>("/admin/media", "", {
    method: "POST",
    body: form,
  });
}
