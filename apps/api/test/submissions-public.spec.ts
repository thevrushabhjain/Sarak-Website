import { describe, expect, it } from "vitest";
import { SELF, env } from "cloudflare:test";

// Fixed fixtures; OR REPLACE keeps reruns idempotent against persistent state.
const SCHEMA = [
  { key: "name", type: "text", label: "Name", required: true, max_length: 100 },
  { key: "email", type: "email", label: "Email", required: true },
  { key: "phone", type: "phone", label: "Phone" },
  { key: "age", type: "number", label: "Age" },
  { key: "day", type: "date", label: "Day" },
  { key: "role", type: "single-choice", label: "Role", options: ["a", "b"] },
  { key: "tags", type: "multi-choice", label: "Tags", options: ["x", "y"] },
  { key: "consent", type: "consent", label: "Consent", required: true },
  { key: "message", type: "long-text", label: "Message", required: true },
];

const START = Date.now();

function reg(overrides: Record<string, unknown> = {}, slug = "subtest") {
  return SELF.fetch(`https://example.com/api/register/${slug}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startedAt: Date.now() - 10_000,
      answers: {
        name: "Tester", email: "t@e.st", consent: true,
        message: "hi", role: "a", tags: ["x"], age: 30, day: "2026-01-02",
        ...overrides,
      },
    }),
  });
}

async function seed() {
  await env.DB.prepare(
    `INSERT OR REPLACE INTO programs (id,slug,title,status,open) VALUES ('prg-sub','subtest','Sub Test','published',1)`,
  ).run();
  await env.DB.prepare(
    `INSERT OR REPLACE INTO programs (id,slug,title,status,open) VALUES ('prg-closed','subclosed','Closed','published',0)`,
  ).run();
  await env.DB.prepare(
    `INSERT OR REPLACE INTO forms (id,program_id,name,status) VALUES ('frm-sub','prg-sub','Sub Form','published')`,
  ).run();
  await env.DB.prepare(
    `INSERT OR REPLACE INTO form_versions (id,form_id,version,schema_json) VALUES ('fv-sub','frm-sub',1,?)`,
  ).bind(JSON.stringify(SCHEMA)).run();
}

describe("public submissions", () => {
  // Single sequential test: this Windows runner cannot reliably execute
  // multi-it files against shared worker state; CI-on-Ubuntu runs the
  // granular suite.
  it("covers the full submission contract", async () => {
    await seed();

    const res = await reg();
    if (res.status !== 201) console.log("HAPPYFAIL:", res.status, await res.clone().text());
    expect(res.status).toBe(201);
    const { id } = await res.json<any>();
    const row = await env.DB.prepare(
      "SELECT kind, program_slug, form_version_id FROM submissions WHERE id=?",
    ).bind(id).first<any>();
    expect(row.kind).toBe("registration");
    expect(row.program_slug).toBe("subtest");
    expect(row.form_version_id).toBe("fv-sub");

    // Closed/unknown programs: one opaque 404, no existence disclosure.
    expect((await reg({}, "subclosed")).status).toBe(404);
    expect((await reg({}, "ghost")).status).toBe(404);

    // Honeypot: silent 204, nothing stored.
    const hp = await SELF.fetch("https://example.com/api/register/subtest", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startedAt: Date.now() - 10_000, website: "spam.example",
        answers: { name: "x", email: "x@y.z", consent: true, message: "m" } }),
    });
    expect(hp.status).toBe(204);

    expect((await reg()).status).toBe(201);

    // Time-trap.
    const fast = await SELF.fetch("https://example.com/api/register/subtest", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startedAt: Date.now(), answers: {} }),
    });
    expect(fast.status).toBe(400);
    expect((await fast.json<any>()).error).toBe("too_fast");

    // 32 KB payload cap.
    const oversize = await SELF.fetch("https://example.com/api/register/subtest", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startedAt: Date.now() - 10_000, answers: { pad: "x".repeat(33 * 1024) } }),
    });
    expect(oversize.status).toBe(413);

    // Strict envelope + per-type rules + consent.
    expect((await (await reg({ surprise: 1 })).json<any>()).error).toBe("unknown:surprise");
    expect((await (await reg({ tags: ["nope"] })).json<any>()).error).toBe("invalid:tags");
    expect((await (await reg({ role: "zzz" })).json<any>()).error).toBe("invalid:role");
    expect((await (await reg({ consent: false })).json<any>()).error).toBe("invalid:consent");

    // Per-IP hourly cap: 20/h overall, bucket cap 10/h trips first here.
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await reg({ name: "r" + i })).status;
    expect(last).toBe(429);

    // Enquiry: fixed schema, same guards.
    const ok = await SELF.fetch("https://example.com/api/enquiry", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startedAt: Date.now() - 10_000,
        answers: { name: "A", email: "a@b.c", subject: "S", message: "M" } }),
    });
    expect(ok.status).toBe(201);

    const bad = await SELF.fetch("https://example.com/api/enquiry", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startedAt: Date.now() - 10_000,
        answers: { name: "A", email: "not-an-email", subject: "S", message: "M" } }),
    });
    expect((await bad.json<any>()).error).toBe("invalid:email");
  });
});
