import { describe, expect, it } from "vitest";
import { SELF, env } from "cloudflare:test";

describe("GET /healthz", () => {
  it("returns ok", async () => {
    const res = await SELF.fetch("https://example.com/healthz");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe("schema 0001", () => {
  it("has auth tables", async () => {
    const db = env.DB;
    await db.exec("SELECT 1 FROM users LIMIT 1").catch(() => {});
    const rows = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    ).all<{ name: string }>();
    const names = rows.results.map((r) => r.name);
    expect(names).toContain("users");
    expect(names).toContain("sessions");
    expect(names).toContain("recovery_codes");
    expect(names).toContain("login_attempts");
  });

  it("has content and media tables", async () => {
    const db = env.DB;
    const rows = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'",
    ).all<{ name: string }>();
    const names = rows.results.map((r) => r.name);
    expect(names).toEqual(expect.arrayContaining(["media","activities","programs","news"]));
  });
});
