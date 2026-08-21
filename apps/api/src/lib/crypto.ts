const ITERATIONS = 100_000;

function toB64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
}

async function pbkdf2(pw: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: ITERATIONS },
    key, 256,
  );
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(input),
  );
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const hashCode = sha256Hex;

export function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function generateToken(): Promise<string> {
  return toB64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await pbkdf2(pw, salt);
  return `pbkdf2$${ITERATIONS}$${toB64url(salt)}$${toB64url(bits)}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [scheme, iterStr, saltB64, keyB64] = stored.split("$");
  if (scheme !== "pbkdf2") return false;
  if (Number(iterStr) !== ITERATIONS) return false;
  const derived = toB64url(await pbkdf2(pw, fromB64url(saltB64)));
  return timingSafeEq(derived, keyB64);
}
