import { describe, expect, it } from "vitest";
import { SELF, env } from "cloudflare:test";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
  }
}

describe("public collections", () => {
  it("returns only published activities", async () => {
    // Delete-before-insert keeps this seed idempotent across shared-storage
    // reruns (activities.slug is UNIQUE and file storage is not isolated).
    await env.DB.prepare(`DELETE FROM activities WHERE id IN ('a1','a2')`).run();
    await env.DB.prepare(
      `INSERT INTO activities (id,slug,title,status) VALUES
       ('a1','pub-one','Published One','published'),
       ('a2','draft-one','Draft One','draft')`,
    ).run();
    const res = await SELF.fetch("https://example.com/api/collections/activities");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage=30");
    const rows = await res.json<any[]>();
    expect(rows.map((r) => r.slug)).toEqual(["pub-one"]);
  });

  it("404s unknown collections", async () => {
    const res = await SELF.fetch("https://example.com/api/collections/users");
    expect(res.status).toBe(404);
  });
});
