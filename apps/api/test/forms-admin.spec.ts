import { describe, expect, it } from "vitest";
import { SELF, env } from "cloudflare:test";
import { hashPassword } from "../src/lib/crypto";

// Same fallback-bootstrap pattern as users-admin.spec: the owner password
// depends on suite order (auth.spec recovery resets it), while a standalone
// run starts fresh where bootstrap sets OwnerPass!234.
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

// Editors ARE allowed on /admin/forms (unlike /admin/users); seeded directly
// with a fixed id so repeated runs against the persisted local D1 stay
// idempotent.
async function editorCookie(): Promise<string> {
  await env.DB.prepare(
    `INSERT OR REPLACE INTO users (id,email,password_hash,role)
     VALUES ('ed-forms','editor-forms@test.local',?,'editor')`,
  ).bind(await hashPassword("EditorForms!234")).run();
  const login = await SELF.fetch("https://example.com/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "editor-forms@test.local", password: "EditorForms!234" }),
  });
  if (login.status !== 200 || !login.headers.get("set-cookie")) {
    throw new Error(`editor login failed: ${login.status}`);
  }
  return login.headers.get("set-cookie")!.split(";")[0];
}

// Fixture forms carry the FBT- prefix; delete dependents first (submissions
// -> form_versions -> forms) so reruns over the persisted DB start clean
// without touching other specs' data.
async function purgeFixtures(): Promise<void> {
  await env.DB.prepare(
    `DELETE FROM submissions WHERE form_version_id IN (
       SELECT fv.id FROM form_versions fv JOIN forms f ON f.id = fv.form_id
       WHERE f.name LIKE 'FBT-%')`,
  ).run();
  await env.DB.prepare(
    `DELETE FROM form_versions WHERE form_id IN (SELECT id FROM forms WHERE name LIKE 'FBT-%')`,
  ).run();
  await env.DB.prepare(`DELETE FROM forms WHERE name LIKE 'FBT-%'`).run();
}

const H = (cookie: string): Record<string, string> => ({
  "Content-Type": "application/json",
  cookie,
});

// Fixed-id programs seeded straight into D1 (INSERT OR REPLACE keeps reruns
// idempotent); forms created here reference them.
async function seedPrograms(): Promise<void> {
  await env.DB.prepare(
    `INSERT OR REPLACE INTO programs (id, slug, title)
     VALUES ('prog-forms-a','forms-test-program-a','Forms Test Program A')`,
  ).run();
  await env.DB.prepare(
    `INSERT OR REPLACE INTO programs (id, slug, title)
     VALUES ('prog-forms-b','forms-test-program-b','Forms Test Program B')`,
  ).run();
}

const RICH_FIELDS = [
  { type: "text", label: "Full name", key: "full_name", max_length: 120 },
  { type: "email", label: "Email", key: "email" },
  { type: "phone", label: "Phone", key: "phone" },
  { type: "number", label: "Age", key: "age", max_length: 3 },
  { type: "date", label: "Birth date", key: "birth_date" },
  { type: "single-choice", label: "Track", key: "track", options: ["A", "B"] },
  { type: "multi-choice", label: "Days", key: "days", options: ["Sat", "Sun"] },
  { type: "consent", label: "I agree to the rules", key: "agree" },
  { type: "long-text", label: "Why this program?", key: "motivation", max_length: 2000 },
];

async function createForm(cookie: string, body: Record<string, unknown>): Promise<Response> {
  return SELF.fetch("https://example.com/admin/forms", {
    method: "POST",
    headers: H(cookie),
    body: JSON.stringify(body),
  });
}

describe("forms admin access control", () => {
  it("rejects anonymous access to every verb", async () => {
    const anon = { "Content-Type": "application/json" };
    for (const res of [
      await SELF.fetch("https://example.com/admin/forms"),
      await SELF.fetch("https://example.com/admin/forms", { method: "POST", headers: anon, body: "{}" }),
      await SELF.fetch("https://example.com/admin/forms/x"),
      await SELF.fetch("https://example.com/admin/forms/x", { method: "PATCH", headers: anon, body: "{}" }),
      await SELF.fetch("https://example.com/admin/forms/x", { method: "DELETE" }),
      await SELF.fetch("https://example.com/admin/forms/x/publish", { method: "POST" }),
      await SELF.fetch("https://example.com/admin/forms/x/versions"),
    ]) {
      expect(res.status).toBe(401);
      expect(await res.json<any>()).toEqual({ error: "unauthorized" });
    }
  });

  it("allows editors (owner+editor mount)", async () => {
    await purgeFixtures();
    await seedPrograms();
    const cookie = await editorCookie();
    const listed = await SELF.fetch("https://example.com/admin/forms", { headers: H(cookie) });
    expect(listed.status).toBe(200);
    const created = await createForm(cookie, {
      name: "FBT-Editor",
      fields: [{ type: "consent", label: "OK", key: "ok" }],
    });
    expect(created.status).toBe(201);
  });
});

describe("form schema validation", () => {
  it("enforces the full validation matrix on create", async () => {
    const cookie = await sessionCookie();
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ name: "FBT-Bad", fields: "nope" }, "fields_invalid"],
      [{ name: "FBT-Bad", fields: [] }, "fields_empty"],
      [
        {
          name: "FBT-Bad",
          fields: Array.from({ length: 51 }, (_, i) => ({
            type: "text",
            label: `F${i}`,
            key: `f_${i}`,
          })),
        },
        "fields_too_many",
      ],
      [{ name: "FBT-Bad", fields: [{ type: "dropdown", label: "X", key: "x" }] }, "field_type_invalid"],
      [{ name: "FBT-Bad", fields: [{ type: "text", label: "", key: "x" }] }, "field_label_invalid"],
      [{ name: "FBT-Bad", fields: [{ type: "text", key: "x" }] }, "field_label_invalid"],
      [{ name: "FBT-Bad", fields: [{ type: "text", label: "X", key: "Bad Key" }] }, "field_key_invalid"],
      [{ name: "FBT-Bad", fields: [{ type: "text", label: "X", key: "kebab-case" }] }, "field_key_invalid"],
      [{ name: "FBT-Bad", fields: [{ type: "text", label: "X", key: "9start" }] }, "field_key_invalid"],
      [
        {
          name: "FBT-Bad",
          fields: [
            { type: "text", label: "A", key: "dup" },
            { type: "text", label: "B", key: "dup" },
          ],
        },
        "field_key_duplicate",
      ],
      [{ name: "FBT-Bad", fields: [{ type: "single-choice", label: "C", key: "c" }] }, "field_options_invalid"],
      [
        { name: "FBT-Bad", fields: [{ type: "multi-choice", label: "C", key: "c", options: [] }] },
        "field_options_invalid",
      ],
      [
        {
          name: "FBT-Bad",
          fields: [
            {
              type: "single-choice",
              label: "C",
              key: "c",
              options: Array.from({ length: 21 }, (_, i) => `Option ${i + 1}`),
            },
          ],
        },
        "field_options_invalid",
      ],
      [
        { name: "FBT-Bad", fields: [{ type: "multi-choice", label: "C", key: "c", options: ["a", 5] }] },
        "field_options_invalid",
      ],
      [
        { name: "FBT-Bad", fields: [{ type: "text", label: "N", key: "n", max_length: 0 }] },
        "field_max_length_invalid",
      ],
      [
        { name: "FBT-Bad", fields: [{ type: "text", label: "N", key: "n", max_length: 2.5 }] },
        "field_max_length_invalid",
      ],
      [
        { name: "FBT-Bad", fields: [{ type: "text", label: "N", key: "n", max_length: "10" }] },
        "field_max_length_invalid",
      ],
      [
        { name: "FBT-Bad", fields: [{ type: "date", label: "D", key: "d", max_length: 10 }] },
        "field_max_length_invalid",
      ],
    ];
    for (const [body, expected] of cases) {
      const res = await createForm(cookie, body);
      expect(res.status, `${JSON.stringify(body)} -> ${expected}`).toBe(400);
      expect(await res.json<any>(), JSON.stringify(body)).toEqual({ error: expected });
    }
  });

  it("accepts boundaries: 1..50 fields, 1..20 options, every type, consent bare", async () => {
    const cookie = await sessionCookie();
    const consentOnly = await createForm(cookie, {
      name: "FBT-ConsentOnly",
      fields: [{ type: "consent", label: "I agree", key: "agree" }],
    });
    expect(consentOnly.status).toBe(201);
    const fifty = await createForm(cookie, {
      name: "FBT-Fifty",
      fields: Array.from({ length: 50 }, (_, i) => ({
        type: "text",
        label: `F${i}`,
        key: `f_${i}`,
        max_length: 10,
      })),
    });
    expect(fifty.status).toBe(201);
    const twentyOptions = await createForm(cookie, {
      name: "FBT-TwentyOptions",
      fields: [
        {
          type: "single-choice",
          label: "C",
          key: "c",
          options: Array.from({ length: 20 }, (_, i) => `Option ${i + 1}`),
        },
      ],
    });
    expect(twentyOptions.status).toBe(201);
  });

  it("rejects unknown program references", async () => {
    const cookie = await sessionCookie();
    const res = await createForm(cookie, {
      name: "FBT-NoProgram",
      program_id: "prog-does-not-exist",
      fields: RICH_FIELDS,
    });
    expect(res.status).toBe(400);
    expect(await res.json<any>()).toEqual({ error: "unknown_program" });
  });
});

describe("form lifecycle", () => {
  it("creates, reads, patches drafts across programs", async () => {
    const cookie = await sessionCookie();
    const created = await createForm(cookie, {
      name: "FBT-Lifecycle",
      program_id: "prog-forms-a",
      fields: RICH_FIELDS,
    });
    expect(created.status).toBe(201);
    const draft = await created.json<any>();
    expect(draft.name).toBe("FBT-Lifecycle");
    expect(draft.program_id).toBe("prog-forms-a");
    expect(draft.status).toBe("draft");
    expect(draft.fields).toEqual(RICH_FIELDS);
    expect(typeof draft.created_at).toBe("number");

    const got = await SELF.fetch(`https://example.com/admin/forms/${draft.id}`, {
      headers: H(cookie),
    });
    expect(got.status).toBe(200);
    expect(await got.json<any>()).toEqual(draft);

    const list = await SELF.fetch("https://example.com/admin/forms", { headers: H(cookie) });
    const listed = (await list.json<any>()) as Array<Record<string, unknown>>;
    expect(listed.find((f) => f.id === draft.id)).toBeTruthy();

    const patched = await SELF.fetch(`https://example.com/admin/forms/${draft.id}`, {
      method: "PATCH",
      headers: H(cookie),
      body: JSON.stringify({
        name: "FBT-Lifecycle Renamed",
        program_id: "prog-forms-b",
        fields: [
          { type: "text", label: "Full name", key: "full_name" },
          { type: "consent", label: "New consent", key: "new_consent" },
        ],
      }),
    });
    expect(patched.status).toBe(200);
    const updated = await patched.json<any>();
    expect(updated.name).toBe("FBT-Lifecycle Renamed");
    expect(updated.program_id).toBe("prog-forms-b");
    expect(updated.fields).toEqual([
      { type: "text", label: "Full name", key: "full_name" },
      { type: "consent", label: "New consent", key: "new_consent" },
    ]);

    const badKey = await SELF.fetch(`https://example.com/admin/forms/${draft.id}`, {
      method: "PATCH",
      headers: H(cookie),
      body: JSON.stringify({ slug: "nope" }),
    });
    expect(badKey.status).toBe(400);
    expect(await badKey.json<any>()).toEqual({ error: "unknown_field" });
  });

  it("publishes frozen numbered versions and lists them newest-first", async () => {
    const cookie = await sessionCookie();
    const created = await createForm(cookie, {
      name: "FBT-Publish",
      fields: RICH_FIELDS,
    });
    const form = await created.json<any>();

    const pub1 = await SELF.fetch(`https://example.com/admin/forms/${form.id}/publish`, {
      method: "POST",
      headers: H(cookie),
    });
    expect(pub1.status).toBe(200);
    const out1 = await pub1.json<any>();
    expect(out1.version).toBe(1);
    expect(out1.form.status).toBe("published");
    expect(out1.form.fields).toEqual(RICH_FIELDS);

    let versions = await SELF.fetch(`https://example.com/admin/forms/${form.id}/versions`, {
      headers: H(cookie),
    });
    let list = (await versions.json<any>()) as Array<any>;
    expect(list.length).toBe(1);
    expect(list[0].version).toBe(1);
    expect(list[0].fields).toEqual(RICH_FIELDS);
    expect(typeof list[0].created_at).toBe("number");

    const pub2 = await SELF.fetch(`https://example.com/admin/forms/${form.id}/publish`, {
      method: "POST",
      headers: H(cookie),
    });
    expect(pub2.status).toBe(200);
    expect((await pub2.json<any>()).version).toBe(2);

    versions = await SELF.fetch(`https://example.com/admin/forms/${form.id}/versions`, {
      headers: H(cookie),
    });
    list = await versions.json<any>();
    expect(list.map((v: any) => v.version)).toEqual([2, 1]);
    expect(list[1].fields).toEqual(RICH_FIELDS);
  });

  it("rejects field edits after publish until republished, name still updates", async () => {
    const cookie = await sessionCookie();
    const created = await createForm(cookie, {
      name: "FBT-EditLock",
      fields: RICH_FIELDS,
    });
    const form = await created.json<any>();
    const pub = await SELF.fetch(`https://example.com/admin/forms/${form.id}/publish`, {
      method: "POST",
      headers: H(cookie),
    });
    expect(pub.status).toBe(200);

    const rename = await SELF.fetch(`https://example.com/admin/forms/${form.id}`, {
      method: "PATCH",
      headers: H(cookie),
      body: JSON.stringify({ name: "FBT-EditLock v2" }),
    });
    expect(rename.status).toBe(200);
    expect((await rename.json<any>()).name).toBe("FBT-EditLock v2");

    const editFields = await SELF.fetch(`https://example.com/admin/forms/${form.id}`, {
      method: "PATCH",
      headers: H(cookie),
      body: JSON.stringify({
        fields: [{ type: "text", label: "Hacked", key: "hacked" }],
      }),
    });
    expect(editFields.status).toBe(409);
    expect(await editFields.json<any>()).toEqual({ error: "republish_required" });

    // Atomic rejection: a mixed name+fields PATCH applies nothing.
    const mixed = await SELF.fetch(`https://example.com/admin/forms/${form.id}`, {
      method: "PATCH",
      headers: H(cookie),
      body: JSON.stringify({
        name: "FBT-Mixed",
        fields: [{ type: "text", label: "Nope", key: "nope" }],
      }),
    });
    expect(mixed.status).toBe(409);
    const after = await SELF.fetch(`https://example.com/admin/forms/${form.id}`, {
      headers: H(cookie),
    });
    const snapshot = await after.json<any>();
    expect(snapshot.name).toBe("FBT-EditLock v2");
    expect(snapshot.fields).toEqual(RICH_FIELDS);
    const versions = await SELF.fetch(`https://example.com/admin/forms/${form.id}/versions`, {
      headers: H(cookie),
    });
    expect(((await versions.json<any>()) as any[]).length).toBe(1);
  });
});

describe("form trash semantics", () => {
  it("blocks trashing a form whose versions hold registrations, allows enquiries", async () => {
    const cookie = await sessionCookie();

    // Enquiries alone never block: publish a form, attach one enquiry.
    const free = await (
      await createForm(cookie, { name: "FBT-TrashFree", fields: RICH_FIELDS })
    ).json<any>();
    const freePub = await SELF.fetch(`https://example.com/admin/forms/${free.id}/publish`, {
      method: "POST",
      headers: H(cookie),
    });
    const freeVersion = await env.DB.prepare(
      `SELECT id FROM form_versions WHERE form_id = ? AND version = 1`,
    ).bind(free.id).first<{ id: string }>();
    await env.DB.prepare(
      `INSERT OR REPLACE INTO submissions (id, kind, form_version_id, payload_json)
       VALUES ('sub-fbt-enquiry','enquiry',?,'{}')`,
    ).bind(freeVersion!.id).run();
    const freeDelete = await SELF.fetch(`https://example.com/admin/forms/${free.id}`, {
      method: "DELETE",
      headers: H(cookie),
    });
    expect(freeDelete.status).toBe(204);

    // A registration submission blocks the trash with has_submissions.
    const blocked = await (
      await createForm(cookie, { name: "FBT-TrashBlock", fields: RICH_FIELDS })
    ).json<any>();
    await SELF.fetch(`https://example.com/admin/forms/${blocked.id}/publish`, {
      method: "POST",
      headers: H(cookie),
    });
    const reg = await env.DB.prepare(
      `INSERT OR REPLACE INTO submissions (id, kind, form_version_id, payload_json)
       VALUES ('sub-fbt-reg','registration',
         (SELECT id FROM form_versions WHERE form_id = ? AND version = 1),'{}')`,
    ).bind(blocked.id).run();
    expect(reg.success).toBe(true);

    const deny = await SELF.fetch(`https://example.com/admin/forms/${blocked.id}`, {
      method: "DELETE",
      headers: H(cookie),
    });
    expect(deny.status).toBe(409);
    expect(await deny.json<any>()).toEqual({ error: "has_submissions" });

    // Removing the submission unblocks; trashed state is sticky.
    await env.DB.prepare(`DELETE FROM submissions WHERE id = 'sub-fbt-reg'`).run();
    const allow = await SELF.fetch(`https://example.com/admin/forms/${blocked.id}`, {
      method: "DELETE",
      headers: H(cookie),
    });
    expect(allow.status).toBe(204);

    const gone = await SELF.fetch(`https://example.com/admin/forms/${blocked.id}`, {
      headers: H(cookie),
    });
    expect((await gone.json<any>()).status).toBe("trashed");

    const reDelete = await SELF.fetch(`https://example.com/admin/forms/${blocked.id}`, {
      method: "DELETE",
      headers: H(cookie),
    });
    expect(reDelete.status).toBe(409);
    expect(await reDelete.json<any>()).toEqual({ error: "trashed" });

    const rePatch = await SELF.fetch(`https://example.com/admin/forms/${blocked.id}`, {
      method: "PATCH",
      headers: H(cookie),
      body: JSON.stringify({ name: "zombie" }),
    });
    expect(rePatch.status).toBe(409);
    expect(await rePatch.json<any>()).toEqual({ error: "trashed" });

    const rePublish = await SELF.fetch(`https://example.com/admin/forms/${blocked.id}/publish`, {
      method: "POST",
      headers: H(cookie),
    });
    expect(rePublish.status).toBe(409);
    expect(await rePublish.json<any>()).toEqual({ error: "invalid_state" });
  });

  it("trashed forms drop out of the default list but match ?status=trashed", async () => {
    const cookie = await sessionCookie();
    const form = await (
      await createForm(cookie, { name: "FBT-ListTrash", fields: RICH_FIELDS })
    ).json<any>();
    await SELF.fetch(`https://example.com/admin/forms/${form.id}`, {
      method: "DELETE",
      headers: H(cookie),
    });

    const def = await SELF.fetch("https://example.com/admin/forms", { headers: H(cookie) });
    const defList = (await def.json<any>()) as any[];
    expect(defList.find((f) => f.name === "FBT-ListTrash")).toBeUndefined();

    const trashed = await SELF.fetch("https://example.com/admin/forms?status=trashed", {
      headers: H(cookie),
    });
    const trashList = (await trashed.json<any>()) as any[];
    expect(trashList.find((f) => f.name === "FBT-ListTrash")).toBeTruthy();

    const badStatus = await SELF.fetch("https://example.com/admin/forms?status=bogus", {
      headers: H(cookie),
    });
    expect(badStatus.status).toBe(400);
  });
});

describe("forms admin misc", () => {
  it("404s every route for unknown ids", async () => {
    const cookie = await sessionCookie();
    for (const res of [
      await SELF.fetch("https://example.com/admin/forms/no-such-form", { headers: H(cookie) }),
      await SELF.fetch("https://example.com/admin/forms/no-such-form", {
        method: "PATCH",
        headers: H(cookie),
        body: JSON.stringify({ name: "x" }),
      }),
      await SELF.fetch("https://example.com/admin/forms/no-such-form", {
        method: "DELETE",
        headers: H(cookie),
      }),
      await SELF.fetch("https://example.com/admin/forms/no-such-form/publish", {
        method: "POST",
        headers: H(cookie),
      }),
      await SELF.fetch("https://example.com/admin/forms/no-such-form/versions", {
        headers: H(cookie),
      }),
    ]) {
      expect(res.status).toBe(404);
      expect(await res.json<any>()).toEqual({ error: "not_found" });
    }
  });

  it("rejects malformed bodies and bad names", async () => {
    const cookie = await sessionCookie();
    const noName = await createForm(cookie, { fields: RICH_FIELDS });
    expect(noName.status).toBe(400);
    const blankName = await createForm(cookie, { name: "   ", fields: RICH_FIELDS });
    expect(blankName.status).toBe(400);
    const noBody = await SELF.fetch("https://example.com/admin/forms", {
      method: "POST",
      headers: H(cookie),
    });
    expect(noBody.status).toBe(400);
  });
});
