import { describe, expect, it } from "vitest";
import { SELF } from "cloudflare:test";

// The owner's password depends on suite order in shared-storage runs:
// auth.spec's recovery test resets it to NewPass!234, while a standalone
// media.spec run starts on a fresh DB where bootstrap sets OwnerPass!234.
// Try known passwords (caching the winner to limit failed attempts against
// the login rate limiter), then fall back to bootstrapping a fresh owner.
const PASSWORDS = ["OwnerPass!234", "NewPass!234"];
let knownPassword: string | null = null;

async function tryLogin(password: string): Promise<Response> {
  return SELF.fetch("https://example.com/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "owner@sarak.org", password }),
  });
}

async function sessionCookie(): Promise<string> {
  // Known-good password first; remaining canonical passwords as fallbacks.
  const rest = PASSWORDS.filter((p) => p !== knownPassword);
  const candidates = knownPassword ? [knownPassword, ...rest] : PASSWORDS;
  for (const password of candidates) {
    const res = await tryLogin(password);
    if (res.status === 200) {
      knownPassword = password;
      return res.headers.get("set-cookie")!.split(";")[0];
    }
  }
  await SELF.fetch("https://example.com/admin/auth/bootstrap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer test-bootstrap-token",
    },
    body: JSON.stringify({ email: "owner@sarak.org", password: PASSWORDS[0] }),
  });
  const retry = await tryLogin(PASSWORDS[0]);
  if (!retry.ok || !retry.headers.get("set-cookie")) {
    throw new Error(`owner login failed even after bootstrap: ${retry.status}`);
  }
  knownPassword = PASSWORDS[0];
  return retry.headers.get("set-cookie")!.split(";")[0];
}

function pngBytes(n = 100): Uint8Array {
  const b = new Uint8Array(n);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  return b;
}

describe("media upload", () => {
  it("rejects anonymous uploads", async () => {
    const fd = new FormData();
    fd.append("file", new Blob([pngBytes()]), "x.png");
    const res = await SELF.fetch("https://example.com/admin/media", { method: "POST", body: fd });
    expect(res.status).toBe(401);
  });

  it("stores png and serves it back", async () => {
    const cookie = await sessionCookie();
    const fd = new FormData();
    fd.append("file", new Blob([pngBytes()], { type: "image/png" }), "photo.png");
    const up = await SELF.fetch("https://example.com/admin/media", {
      method: "POST", body: fd, headers: { cookie },
    });
    expect(up.status).toBe(201);
    const body = await up.json<any>();
    expect(body.mime).toBe("image/png");

    const get = await SELF.fetch(`https://example.com${body.url}`);
    expect(get.status).toBe(200);
    expect(get.headers.get("content-type")).toBe("image/png");
    expect(get.headers.get("cache-control")).toContain("immutable");
  });

  it("rejects svg masquerading as png", async () => {
    const cookie = await sessionCookie();
    const svg = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>");
    const fd = new FormData();
    fd.append("file", new Blob([svg], { type: "image/svg+xml" }), "evil.png");
    const res = await SELF.fetch("https://example.com/admin/media", {
      method: "POST", body: fd, headers: { cookie },
    });
    expect(res.status).toBe(415);
  });

  it("rejects files over 10MB", async () => {
    const cookie = await sessionCookie();
    const big = pngBytes(10 * 1024 * 1024 + 1);
    const fd = new FormData();
    fd.append("file", new Blob([big], { type: "image/png" }), "big.png");
    const res = await SELF.fetch("https://example.com/admin/media", {
      method: "POST", body: fd, headers: { cookie },
    });
    expect(res.status).toBe(413);
  });
});
