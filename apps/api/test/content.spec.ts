import { describe, expect, it } from "vitest";
import { SELF, env } from "cloudflare:test";

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

  it("returns published news ordered by sort", async () => {
    // Delete-before-insert keeps this seed idempotent across shared-storage
    // reruns (news.slug is UNIQUE and file storage is not isolated).
    // Wipe the whole table: other specs publish news rows (shared storage).
    await env.DB.prepare(`DELETE FROM news`).run();
    await env.DB.prepare(
      `INSERT INTO news (id,slug,title,status,sort) VALUES
       ('n2','news-second','News Second','published',20),
       ('n1','news-first','News First','published',10),
       ('n3','news-draft','News Draft','draft',5)`,
    ).run();
    const res = await SELF.fetch("https://example.com/api/collections/news");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage=30");
    const rows = await res.json<any[]>();
    expect(rows.map((r) => r.slug)).toEqual(["news-first", "news-second"]);
  });

  it("404s unknown collections", async () => {
    const res = await SELF.fetch("https://example.com/api/collections/users");
    expect(res.status).toBe(404);
  });
});
