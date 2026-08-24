import { describe, expect, it } from "vitest";
import { SELF, env } from "cloudflare:test";
import { hashPassword } from "../src/lib/crypto";

// The owner's password depends on suite order in shared-storage runs:
// auth.spec's recovery test resets it to NewPass!234, while a standalone
// users-admin.spec run starts on a fresh DB where bootstrap sets
// OwnerPass!234. Try known passwords (caching the winner to limit failed
// attempts against the login rate limiter), then fall back to bootstrapping
// a fresh owner.
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

// The forbidden-on-all-routes editor is seeded directly (fixed id, upsert)
// so repeated runs against miniflare's persisted D1 stay idempotent.
async function editorCookie(): Promise<string> {
  await env.DB.prepare(
    `INSERT INTO users (id,email,password_hash,role) VALUES ('ed-ua','editor-ua@test.local',?,'editor')
     ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash, disabled_at=NULL`,
  ).bind(await hashPassword("EditorUa!234")).run();
  const login = await SELF.fetch("https://example.com/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "editor-ua@test.local", password: "EditorUa!234" }),
  });
  if (login.status !== 200 || !login.headers.get("set-cookie")) {
    throw new Error(`editor login failed: ${login.status}`);
  }
  return login.headers.get("set-cookie")!.split(";")[0];
}

// Fixed fixture emails; delete-before-insert keeps API-created accounts
// idempotent across runs (email is UNIQUE).
async function purgeFixtures(): Promise<void> {
  await env.DB.prepare(
    `DELETE FROM sessions WHERE user_id IN (
       SELECT id FROM users WHERE email IN ('created-ua@test.local'))`,
  ).run();
  await env.DB.prepare(
    `DELETE FROM users WHERE email IN ('created-ua@test.local')`,
  ).run();
}

const H = (cookie: string): Record<string, string> => ({
  "Content-Type": "application/json",
  cookie,
});

describe("users admin access control", () => {
  it("rejects anonymous access to every verb", async () => {
    const anon = { "Content-Type": "application/json" };
    for (const res of [
      await SELF.fetch("https://example.com/admin/users"),
      await SELF.fetch("https://example.com/admin/users", {
        method: "POST", headers: anon, body: "{}",
      }),
      await SELF.fetch("https://example.com/admin/users/x/disable", { method: "POST" }),
      await SELF.fetch("https://example.com/admin/users/x/enable", { method: "POST" }),
      await SELF.fetch("https://example.com/admin/users/x/reset-password", {
        method: "POST", headers: anon, body: "{}",
      }),
    ]) {
      expect(res.status).toBe(401);
    }
  });

  it("rejects editors with forbidden on every route", async () => {
    const cookie = await editorCookie();
    for (const res of [
      await SELF.fetch("https://example.com/admin/users", { headers: H(cookie) }),
      await SELF.fetch("https://example.com/admin/users", {
        method: "POST", headers: H(cookie),
        body: JSON.stringify({ email: "nope@test.local", password: "Nope!234", role: "editor" }),
      }),
      await SELF.fetch("https://example.com/admin/users/x/disable", {
        method: "POST", headers: H(cookie),
      }),
      await SELF.fetch("https://example.com/admin/users/x/enable", {
        method: "POST", headers: H(cookie),
      }),
      await SELF.fetch("https://example.com/admin/users/x/reset-password", {
        method: "POST", headers: H(cookie),
        body: JSON.stringify({ new_password: "Nope!234" }),
      }),
    ]) {
      expect(res.status).toBe(403);
      expect(await res.json<any>()).toEqual({ error: "forbidden" });
    }
  });
});

describe("owner account management", () => {
  it("creates an account and enforces email + role validation", async () => {
    await purgeFixtures();
    const cookie = await sessionCookie();
    const created = await SELF.fetch("https://example.com/admin/users", {
      method: "POST",
      headers: H(cookie),
      body: JSON.stringify({ email: " Created-Ua@Test.Local ", password: "Created!234", role: "editor" }),
    });
    expect(created.status).toBe(201);
    const body = await created.json<any>();
    expect(typeof body.id).toBe("string");
    expect(body.email).toBe("created-ua@test.local"); // normalized like login/bootstrap
    expect(body.role).toBe("editor");

    const dup = await SELF.fetch("https://example.com/admin/users", {
      method: "POST",
      headers: H(cookie),
      body: JSON.stringify({ email: "created-ua@test.local", password: "Other!234", role: "editor" }),
    });
    expect(dup.status).toBe(409);
    expect(await dup.json<any>()).toEqual({ error: "email_taken" });

    const badRole = await SELF.fetch("https://example.com/admin/users", {
      method: "POST",
      headers: H(cookie),
      body: JSON.stringify({ email: "admin-ua@test.local", password: "Admin!234", role: "admin" }),
    });
    expect(badRole.status).toBe(400);
  });

  it("lists all accounts with id, email, role and disabled_at", async () => {
    const cookie = await sessionCookie();
    const res = await SELF.fetch("https://example.com/admin/users", { headers: H(cookie) });
    expect(res.status).toBe(200);
    const rows = await res.json<any[]>();
    expect(Array.isArray(rows)).toBe(true);
    const owner = rows.find((r) => r.email === "owner@sarak.org");
    expect(owner.role).toBe("owner");
    expect(owner.disabled_at).toBeNull();
    const created = rows.find((r) => r.email === "created-ua@test.local");
    expect(created.role).toBe("editor");
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(["disabled_at", "email", "id", "role"]);
    }
  });

  it("refuses to disable self and rejects unknown ids", async () => {
    const cookie = await sessionCookie();
    const me = await SELF.fetch("https://example.com/admin/auth/me", { headers: H(cookie) });
    const selfId = (await me.json<any>()).id;

    const self = await SELF.fetch(`https://example.com/admin/users/${selfId}/disable`, {
      method: "POST", headers: H(cookie),
    });
    expect(self.status).toBe(400);
    expect(await self.json<any>()).toEqual({ error: "cannot_disable_self" });

    const ghost = await SELF.fetch("https://example.com/admin/users/no-such-id/disable", {
      method: "POST", headers: H(cookie),
    });
    expect(ghost.status).toBe(404);

    const stillListed = await SELF.fetch("https://example.com/admin/users", { headers: H(cookie) });
    const owner = (await stillListed.json<any[]>()).find((r) => r.email === "owner@sarak.org");
    expect(owner.disabled_at).toBeNull();
  });

  it("disables, revokes mid-use, re-enables, then reset-password kills sessions", async () => {
    await purgeFixtures();
    const ownerCookie = await sessionCookie();

    // Create a fresh editor through the API under test.
    const created = await SELF.fetch("https://example.com/admin/users", {
      method: "POST",
      headers: H(ownerCookie),
      body: JSON.stringify({ email: "created-ua@test.local", password: "Created!234", role: "editor" }),
    });
    expect(created.status).toBe(201);
    const { id } = await created.json<any>();

    // Editor signs in and uses /me — live session works.
    const login = await SELF.fetch("https://example.com/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "created-ua@test.local", password: "Created!234" }),
    });
    expect(login.status).toBe(200);
    const edCookie = login.headers.get("set-cookie")!.split(";")[0];

    // Disable: 204, no sessions touched, list reflects disabled_at.
    const disable = await SELF.fetch(`https://example.com/admin/users/${id}/disable`, {
      method: "POST", headers: H(ownerCookie),
    });
    expect(disable.status).toBe(204);
    const afterDisable = await SELF.fetch("https://example.com/admin/users", {
      headers: H(ownerCookie),
    });
    const disabledRow = (await afterDisable.json<any[]>()).find((r) => r.id === id);
    expect(disabledRow.disabled_at).not.toBeNull();

    // The live session must fail requireSession mid-use (join checks disabled_at).
    const revoked = await SELF.fetch("https://example.com/admin/auth/me", {
      headers: { cookie: edCookie },
    });
    expect(revoked.status).toBe(401);

    // A disabled account cannot sign in again either.
    const relogin = await SELF.fetch("https://example.com/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "created-ua@test.local", password: "Created!234" }),
    });
    expect(relogin.status).toBe(401);

    // Enable clears disabled_at; the untouched session becomes valid again.
    const enable = await SELF.fetch(`https://example.com/admin/users/${id}/enable`, {
      method: "POST", headers: H(ownerCookie),
    });
    expect(enable.status).toBe(204);
    const afterEnable = await SELF.fetch("https://example.com/admin/users", {
      headers: H(ownerCookie),
    });
    const enabledRow = (await afterEnable.json<any[]>()).find((r) => r.id === id);
    expect(enabledRow.disabled_at).toBeNull();
    const revived = await SELF.fetch("https://example.com/admin/auth/me", {
      headers: { cookie: edCookie },
    });
    expect(revived.status).toBe(200);

    // Reset-password rotates the hash AND deletes that user's sessions.
    const reset = await SELF.fetch(`https://example.com/admin/users/${id}/reset-password`, {
      method: "POST",
      headers: H(ownerCookie),
      body: JSON.stringify({ new_password: "Rotated!234" }),
    });
    expect(reset.status).toBe(204);
    const dead = await SELF.fetch("https://example.com/admin/auth/me", {
      headers: { cookie: edCookie },
    });
    expect(dead.status).toBe(401); // session row deleted by the reset

    const oldPw = await SELF.fetch("https://example.com/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "created-ua@test.local", password: "Created!234" }),
    });
    expect(oldPw.status).toBe(401);
    const newPw = await SELF.fetch("https://example.com/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "created-ua@test.local", password: "Rotated!234" }),
    });
    expect(newPw.status).toBe(200);
  });
});
