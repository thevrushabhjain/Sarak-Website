import { describe, expect, it } from "vitest";
import { SELF, env } from "cloudflare:test";
import { hashPassword } from "../src/lib/crypto";

async function ownerCookie(): Promise<string> {
  // Deterministic slate (apply-migrations wipes users), so bootstrap is
  // always the clean path here.
  await SELF.fetch("https://example.com/admin/auth/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer test-bootstrap-token" },
    body: JSON.stringify({ email: "owner@sarak.org", password: "OwnerPass!234" }),
  });
  const login = await SELF.fetch("https://example.com/admin/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "owner@sarak.org", password: "OwnerPass!234" }),
  });
  if (login.status !== 200) throw new Error(`owner login failed: ${login.status}`);
  return login.headers.get("set-cookie")!.split(";")[0];
}

async function editorCookie(): Promise<string> {
  await env.DB.prepare(
    `INSERT INTO users (id,email,password_hash,role) VALUES ('ed-ib','editor-ib@test.local',?,'editor')
     ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash, disabled_at=NULL`,
  ).bind(await hashPassword("EditorIb!234")).run();
  const login = await SELF.fetch("https://example.com/admin/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "editor-ib@test.local", password: "EditorIb!234" }),
  });
  return login.headers.get("set-cookie")!.split(";")[0];
}

async function seedFixtureForm() {
  await env.DB.prepare(
    "INSERT OR REPLACE INTO forms (id,program_id,name,status) VALUES ('frm-ib',NULL,'IB Form','published')",
  ).run();
  await env.DB.prepare(
    "INSERT OR REPLACE INTO form_versions (id,form_id,version,schema_json) VALUES ('fv-ib','frm-ib',1,'[]')",
  ).run();
}

let n = 0;
async function seedSubmission(kind: "registration" | "enquiry", opts: { unread?: boolean; trashed?: boolean } = {}) {
  n += 1;
  const id = `sub-${kind}-${n}`;
  await env.DB.prepare(
    `INSERT INTO submissions (id,kind,form_version_id,program_slug,payload_json,ip,read_at,trashed_at,created_at)
     VALUES (?,?,?,?,?,?,?,?,unixepoch()+?)`,
  ).bind(
    id, kind,
    kind === "registration" ? "fv-ib" : null,
    kind === "registration" ? "p" : null,
    JSON.stringify({ n, kind }), "1.2.3.4",
    opts.unread === false ? 100 : null,
    opts.trashed ? 200 : null,
    n,
  ).run();
  return id;
}

describe("inboxes", () => {
  // Single sequential test: Windows runner reliability; CI runs granular.
  it("covers the inbox contract", async () => {
    const editor = await editorCookie();

    // Anonymous locked out of every verb.
    expect((await SELF.fetch("https://example.com/admin/inbox/enquiry")).status).toBe(401);
    expect((await SELF.fetch("https://example.com/admin/inbox/enquiry", { method: "DELETE" })).status).toBe(401);

    await seedFixtureForm();
    const owner = await ownerCookie();
    await seedSubmission("registration", { unread: false });
    await seedSubmission("registration");
    await seedSubmission("registration");
    const enquiryId = await seedSubmission("enquiry");
    await seedSubmission("registration", { trashed: true });

    // List: newest-first, trashed excluded, unread header.
    const list = await SELF.fetch("https://example.com/admin/inbox/registration", { headers: { cookie: owner } });
    expect(list.status).toBe(200);
    expect(list.headers.get("x-unread-count")).toBe("2");
    const rows = await list.json<any[]>();
    expect(rows).toHaveLength(3);
    expect(rows[0].payload.kind).toBe("registration");

    // Unknown kind.
    expect((await SELF.fetch("https://example.com/admin/inbox/nope", { headers: { cookie: owner } })).status).toBe(404);

    // Editor can read and mark read.
    const edList = await SELF.fetch("https://example.com/admin/inbox/enquiry?unread=1", { headers: { cookie: editor } });
    expect(edList.headers.get("x-unread-count")).toBe("1");
    expect((await edList.json<any[]>())[0].id).toBe(enquiryId);
    expect((await SELF.fetch(`https://example.com/admin/inbox/submissions/${enquiryId}/read`, {
      method: "POST", headers: { cookie: editor },
    })).status).toBe(204);
    const afterRead = await SELF.fetch("https://example.com/admin/inbox/enquiry", { headers: { cookie: editor } });
    expect(afterRead.headers.get("x-unread-count")).toBe("0");

    // Soft delete hides from list.
    const victim = rows[0].id;
    expect((await SELF.fetch(`https://example.com/admin/inbox/submissions/${victim}`, {
      method: "DELETE", headers: { cookie: owner },
    })).status).toBe(204);
    const afterDel = await SELF.fetch("https://example.com/admin/inbox/registration", { headers: { cookie: owner } });
    expect((await afterDel.json<any[]>()).length).toBe(2);

    // Purge: editor forbidden; owner hard-deletes only trashed.
    expect((await SELF.fetch("https://example.com/admin/inbox/registration", {
      method: "DELETE", headers: { cookie: editor },
    })).status).toBe(403);
    const purge = await SELF.fetch("https://example.com/admin/inbox/registration", {
      method: "DELETE", headers: { cookie: owner },
    });
    expect(await purge.json<any>()).toEqual({ deleted: 2 });
    // Live rows untouched by purge.
    expect((await (await SELF.fetch("https://example.com/admin/inbox/registration", { headers: { cookie: owner } })).json<any[]>()).length).toBe(2);
  });
});
