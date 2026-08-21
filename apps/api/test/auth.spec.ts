import { describe, expect, it } from "vitest";
import { SELF, env } from "cloudflare:test";

const BOOT = { Authorization: "Bearer test-bootstrap-token" };

// Plaintext recovery codes captured from the bootstrap response (Step 1 note:
// the recover roundtrip MUST use a real code; hashes cannot be inverted).
let ownerRecoveryCodes: string[] = [];

async function bootstrapOwner() {
  return SELF.fetch("https://example.com/admin/auth/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...BOOT },
    body: JSON.stringify({ email: "owner@sarak.org", password: "OwnerPass!234" }),
  });
}

describe("bootstrap", () => {
  it("creates owner exactly once and returns 10 recovery codes", async () => {
    const res = await bootstrapOwner();
    expect(res.status).toBe(201);
    const body = await res.json<any>();
    expect(body.user.role).toBe("owner");
    expect(body.recovery_codes).toHaveLength(10);
    ownerRecoveryCodes = body.recovery_codes;

    const again = await bootstrapOwner();
    expect(again.status).toBe(409);
  });

  it("rejects wrong bearer", async () => {
    const res = await SELF.fetch("https://example.com/admin/auth/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer nope" },
      body: JSON.stringify({ email: "x@y.z", password: "whatever123" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("login + sessions", () => {
  it("logs in with valid credentials and exposes me", async () => {
    const login = await SELF.fetch("https://example.com/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@sarak.org", password: "OwnerPass!234" }),
    });
    expect(login.status).toBe(200);
    const cookie = login.headers.get("set-cookie")!;
    expect(cookie).toContain("sarak_session=");
    expect(cookie).toContain("HttpOnly");

    const me = await SELF.fetch("https://example.com/admin/auth/me", {
      headers: { cookie: cookie.split(";")[0] },
    });
    expect((await me.json<any>()).role).toBe("owner");

    const out = await SELF.fetch("https://example.com/admin/auth/logout", {
      method: "POST", headers: { cookie: cookie.split(";")[0] },
    });
    expect(out.status).toBe(204);

    const meAfter = await SELF.fetch("https://example.com/admin/auth/me", {
      headers: { cookie: cookie.split(";")[0] },
    });
    expect(meAfter.status).toBe(401);
  });

  it("rate limits after 10 bad attempts per account", async () => {
    for (let i = 0; i < 10; i++) {
      await SELF.fetch("https://example.com/admin/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "owner@sarak.org", password: "bad" + i }),
      });
    }
    const res = await SELF.fetch("https://example.com/admin/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@sarak.org", password: "OwnerPass!234" }),
    });
    expect(res.status).toBe(429);
  });
});

describe("recovery", () => {
  it("rejects garbage codes with invalid_code", async () => {
    const bad = await SELF.fetch("https://example.com/admin/auth/recover", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "AAAA-BBBB-CCCC-DDDD", new_password: "NewPass!234" }),
    });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: "invalid_code" });
  });

  it("consumes one real plaintext code from bootstrap and resets password", async () => {
    // Fixture reset: the rate-limit test above left 10 failed attempts on this
    // account inside the 15-minute window; clear them so the post-recovery
    // logins below exercise credentials, not the limiter.
    // DB is injected by miniflare at runtime; ProvidedEnv lacks the declaration.
    const db = env as unknown as { DB: D1Database };
    await db.DB.prepare(
      "DELETE FROM login_attempts WHERE email_norm='owner@sarak.org'",
    ).run();

    const rec = await SELF.fetch("https://example.com/admin/auth/recover", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: ownerRecoveryCodes[0],
        new_password: "NewPass!234",
      }),
    });
    expect(rec.status).toBe(204);

    const oldLogin = await SELF.fetch("https://example.com/admin/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@sarak.org", password: "OwnerPass!234" }),
    });
    expect(oldLogin.status).toBe(401);
    expect(await oldLogin.json()).toEqual({ error: "invalid_credentials" });

    const newLogin = await SELF.fetch("https://example.com/admin/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@sarak.org", password: "NewPass!234" }),
    });
    expect(newLogin.status).toBe(200);
    expect((await newLogin.json<any>()).user.role).toBe("owner");
  });
});
