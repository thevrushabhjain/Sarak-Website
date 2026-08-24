import { describe, expect, it } from "vitest";
import { SELF, env } from "cloudflare:test";
import { ensureOwnerCookie } from "./helpers";
import { hashPassword } from "../src/lib/crypto";

// The owner's password depends on suite order in shared-storage runs:
// auth.spec's recovery test resets it to NewPass!234, while a standalone run
// starts on a fresh DB where bootstrap sets OwnerPass!234.
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

// Editors are allowed on every /admin/content route; users-admin routes that
// would create one arrive in a later task, so seed the editor row directly.
async function editorCookie(): Promise<string> {
  await env.DB.prepare(
    `INSERT INTO users (id,email,password_hash,role) VALUES ('ed-ca','editor-ca@test.local',?,'editor')
     ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash, disabled_at=NULL`,
  ).bind(await hashPassword("EditorPass!234")).run();
  const login = await SELF.fetch("https://example.com/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "editor-ca@test.local", password: "EditorPass!234" }),
  });
  if (login.status !== 200 || !login.headers.get("set-cookie")) {
    throw new Error(`editor login failed: ${login.status}`);
  }
  return login.headers.get("set-cookie")!.split(";")[0];
}

// Fixed fixture ids; delete-before-insert keeps runs idempotent against
// miniflare's persisted D1 file (slugs are UNIQUE, revisions accumulate).
async function resetFixtures(): Promise<void> {
  for (const [table, ids] of [
    ["activities", ["ca-act-1", "ca-act-2"]],
    ["programs", ["ca-prg-1"]],
    ["news", ["ca-news-1"]],
  ] as const) {
    await env.DB.prepare(
      `DELETE FROM ${table} WHERE id IN (${ids.map(() => "?").join(",")})`,
    ).bind(...ids).run();
  }
  await env.DB.prepare(
    `DELETE FROM revisions WHERE record_id IN ('ca-act-1','ca-act-2','ca-prg-1','ca-news-1')`,
  ).run();
}

const H = (cookie: string): Record<string, string> => ({
  "Content-Type": "application/json",
  cookie,
});

describe("content admin auth", () => {
  it("rejects anonymous access to every verb", async () => {
    for (const req of [
      SELF.fetch("https://example.com/admin/content/activities"),
      SELF.fetch("https://example.com/admin/content/activities/x", { method: "PATCH" }),
      SELF.fetch("https://example.com/admin/content/activities", { method: "POST" }),
      SELF.fetch("https://example.com/admin/content/activities/x", { method: "DELETE" }),
      SELF.fetch("https://example.com/admin/content/activities/x/publish", { method: "POST" }),
      SELF.fetch("https://example.com/admin/content/activities/x/unpublish", { method: "POST" }),
      SELF.fetch("https://example.com/admin/content/activities/x/restore", { method: "POST" }),
      SELF.fetch("https://example.com/admin/content/activities/x/revisions"),
      SELF.fetch("https://example.com/admin/content/activities/x/revisions/1"),
      SELF.fetch("https://example.com/admin/content/activities/x/revisions/1/restore", { method: "POST" }),
    ]) {
      const res = await req;
      expect(res.status).toBe(401);
      expect(await res.json<object>()).toEqual({ error: "unauthorized" });
    }
  });
});

describe("content lifecycle", () => {
  it("creates a draft and returns the merged row (201)", async () => {
    const cookie = await ensureOwnerCookie();
    await resetFixtures();
    const res = await SELF.fetch("https://example.com/admin/content/activities", {
      method: "POST",
      headers: H(cookie),
      body: JSON.stringify({
        slug: "ca-draft-one",
        title: "Draft One",
        tag: "Test",
        description: "desc",
        body: "body text",
      }),
    });
    expect(res.status).toBe(201);
    const row = await res.json<any>();
    expect(row.slug).toBe("ca-draft-one");
    expect(row.title).toBe("Draft One");
    expect(row.status).toBe("draft");
    expect(row._status).toBe("draft");

    // Unknown collection → 404 unknown_collection (list + create + single).
    const listUnknown = await SELF.fetch("https://example.com/admin/content/widgets", {
      headers: H(cookie),
    });
    expect(listUnknown.status).toBe(404);
    expect(await listUnknown.json<any>()).toEqual({ error: "unknown_collection" });
    const postUnknown = await SELF.fetch("https://example.com/admin/content/widgets", {
      method: "POST",
      headers: H(cookie),
      body: JSON.stringify({ slug: "x" }),
    });
    expect(postUnknown.status).toBe(404);
    expect(await postUnknown.json<any>()).toEqual({ error: "unknown_collection" });
  });

  it("rejects duplicate slugs with 409 slug_taken", async () => {
    const cookie = await ensureOwnerCookie();
    const dup = await SELF.fetch("https://example.com/admin/content/activities", {
      method: "POST",
      headers: H(cookie),
      body: JSON.stringify({ slug: "ca-draft-one", title: "Dup" }),
    });
    expect(dup.status).toBe(409);
    expect(await dup.json<any>()).toEqual({ error: "slug_taken" });
  });

  it("GET list merges draft overlay, includes _status, excludes trashed by default", async () => {
    const cookie = await ensureOwnerCookie();
    // Seed a published row with a pending draft overlay written via PATCH.
    await env.DB.prepare(
      `INSERT OR REPLACE INTO activities (id,slug,title,status) VALUES ('ca-act-1','ca-live-one','Live One','published')`,
    ).run();
    const patchRes = await SELF.fetch("https://example.com/admin/content/activities/ca-act-1", {
      method: "PATCH",
      headers: H(cookie),
      body: JSON.stringify({ title: "Edited Title" }),
    });
    expect(patchRes.status).toBe(200);

    // ?status=trashed surfaces trashed rows explicitly.
    await env.DB.prepare(
      `INSERT OR REPLACE INTO activities (id,slug,title,status,prev_status)
       VALUES ('ca-act-2','ca-trashed-one','Trashed One','trashed','published')`,
    ).run();
    const trashedList = await SELF.fetch(
      "https://example.com/admin/content/activities?status=trashed",
      { headers: H(cookie) },
    );
    const trashedRows = await trashedList.json<any[]>();
    expect(trashedRows.map((r) => r.id)).toContain("ca-act-2");
    expect(trashedRows.every((r) => r._status === "trashed")).toBe(true);

    // Single-item merged view; unknown id → 404.
    const single = await SELF.fetch("https://example.com/admin/content/activities/ca-act-1", {
      headers: H(cookie),
    });
    expect(single.status).toBe(200);
    expect((await single.json<any>()).title).toBe("Edited Title");
    const missing = await SELF.fetch("https://example.com/admin/content/activities/nope", {
      headers: H(cookie),
    });
    expect(missing.status).toBe(404);
  });

  it("PATCH blocks slug and unknown fields", async () => {
    const cookie = await ensureOwnerCookie();
    const slugRes = await SELF.fetch("https://example.com/admin/content/activities/ca-act-1", {
      method: "PATCH",
      headers: H(cookie),
      body: JSON.stringify({ slug: "new-slug" }),
    });
    expect(slugRes.status).toBe(400);

    const unkRes = await SELF.fetch("https://example.com/admin/content/activities/ca-act-1", {
      method: "PATCH",
      headers: H(cookie),
      body: JSON.stringify({ bogus: "x" }),
    });
    expect(unkRes.status).toBe(400);
    expect(await unkRes.json<any>()).toEqual({ error: "unknown_field" });
  });

  it("PATCH writes ONLY draft_json + updated_at — public read unchanged until publish", async () => {
    const cookie = await ensureOwnerCookie();
    const before = await (
      await SELF.fetch("https://example.com/api/collections/activities")
    ).json<any[]>();
    const pubBefore = before.find((r) => r.slug === "ca-live-one");
    expect(pubBefore.title).toBe("Live One");

    const patchRes = await SELF.fetch("https://example.com/admin/content/activities/ca-act-1", {
      method: "PATCH",
      headers: H(cookie),
      body: JSON.stringify({ title: "Still Hidden", description: "hidden desc" }),
    });
    expect(patchRes.status).toBe(200);

    // Base columns untouched in storage.
    const dbRow = await env.DB.prepare(
      `SELECT title, description, draft_json FROM activities WHERE id='ca-act-1'`,
    ).first<any>();
    expect(dbRow.title).toBe("Live One");
    expect(dbRow.description).toBe("");
    expect(JSON.parse(dbRow.draft_json)).toEqual({
      title: "Still Hidden",
      description: "hidden desc",
    });

    const after = await (
      await SELF.fetch("https://example.com/api/collections/activities")
    ).json<any[]>();
    expect(after.find((r) => r.slug === "ca-live-one").title).toBe("Live One");
  });

  it("publish is blocked while published; unpublish removes from the public read", async () => {
    const cookie = await ensureOwnerCookie();
    // ca-act-1 is published (with a pending draft overlay): direct publish → 409.
    const blocked = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-1/publish",
      { method: "POST", headers: H(cookie) },
    );
    expect(blocked.status).toBe(409);
    expect(await blocked.json<any>()).toEqual({ error: "invalid_state" });

    const unpub = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-1/unpublish",
      { method: "POST", headers: H(cookie) },
    );
    expect(unpub.status).toBe(200);
    expect((await unpub.json<any>()).status).toBe("unpublished");
    const rows = await (
      await SELF.fetch("https://example.com/api/collections/activities")
    ).json<any[]>();
    expect(rows.find((r) => r.slug === "ca-live-one")).toBeUndefined();
  });

  it("publish applies the draft live atomically and writes revision v1 with the PRIOR state", async () => {
    const cookie = await ensureOwnerCookie();
    const pubRes = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-1/publish",
      { method: "POST", headers: H(cookie) },
    );
    expect(pubRes.status).toBe(200); // allowed from unpublished
    const row = await pubRes.json<any>();
    expect(row.status).toBe("published");
    expect(row._status).toBe("published");
    expect(row.title).toBe("Still Hidden");
    expect(row.draft_json).toBeUndefined(); // overlay cleared

    // Public read now serves the published edit.
    const publicRows = await (
      await SELF.fetch("https://example.com/api/collections/activities")
    ).json<any[]>();
    expect(publicRows.find((r) => r.slug === "ca-live-one").title).toBe("Still Hidden");

    // Revision v1 captured the exact pre-publish base columns.
    const rev = await env.DB.prepare(
      `SELECT version, data FROM revisions WHERE collection='activities' AND record_id='ca-act-1'`,
    ).first<any>();
    expect(rev.version).toBe(1);
    expect(JSON.parse(rev.data)).toEqual({
      slug: "ca-live-one",
      title: "Live One",
      tag: "",
      image_url: "",
      description: "",
      body: "",
    });
  });

  it("second publish writes revision v2 (unpublish between edits)", async () => {
    const cookie = await ensureOwnerCookie();
    const unpub = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-1/unpublish",
      { method: "POST", headers: H(cookie) },
    );
    expect(unpub.status).toBe(200);
    const patchRes = await SELF.fetch("https://example.com/admin/content/activities/ca-act-1", {
      method: "PATCH",
      headers: H(cookie),
      body: JSON.stringify({ title: "Second Edit" }),
    });
    expect(patchRes.status).toBe(200);
    const pubRes = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-1/publish",
      { method: "POST", headers: H(cookie) },
    );
    expect(pubRes.status).toBe(200);
    expect((await pubRes.json<any>()).title).toBe("Second Edit");
    const versions = await env.DB.prepare(
      `SELECT version FROM revisions WHERE collection='activities' AND record_id='ca-act-1' ORDER BY version`,
    ).all<{ version: number }>();
    expect(versions.results.map((r) => r.version)).toEqual([1, 2]);
  });

  it("enforces the state machine on publish/unpublish", async () => {
    const cookie = await ensureOwnerCookie();
    // Publish on published → 409 invalid_state.
    await env.DB.prepare(`UPDATE activities SET status='published' WHERE id='ca-act-1'`).run();
    const p1 = await SELF.fetch("https://example.com/admin/content/activities/ca-act-1/publish", {
      method: "POST",
      headers: H(cookie),
    });
    expect(p1.status).toBe(409);
    expect(await p1.json<any>()).toEqual({ error: "invalid_state" });

    // Unpublish on unpublished → 409.
    await env.DB.prepare(`UPDATE activities SET status='unpublished' WHERE id='ca-act-1'`).run();
    const u1 = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-1/unpublish",
      { method: "POST", headers: H(cookie) },
    );
    expect(u1.status).toBe(409);
    expect(await u1.json<any>()).toEqual({ error: "invalid_state" });
  });

  it("trash hides from admin default, PATCH-on-trashed is blocked, restore returns prior state", async () => {
    const cookie = await ensureOwnerCookie();
    // Deterministic precondition regardless of prior tests' ending state.
    await env.DB.prepare(
      `UPDATE activities SET status='published', prev_status=NULL WHERE id='ca-act-1'`,
    ).run();
    const del = await SELF.fetch("https://example.com/admin/content/activities/ca-act-1", {
      method: "DELETE",
      headers: H(cookie),
    });
    expect(del.status).toBe(204);

    // prev_status recorded, status trashed.
    const dbRow = await env.DB.prepare(
      `SELECT status, prev_status FROM activities WHERE id='ca-act-1'`,
    ).first<any>();
    expect(dbRow.status).toBe("trashed");
    expect(dbRow.prev_status).toBe("published");

    // Admin default list hides it; ?status=trashed shows it.
    const def = await (
      await SELF.fetch("https://example.com/admin/content/activities", { headers: H(cookie) })
    ).json<any[]>();
    expect(def.find((r) => r.id === "ca-act-1")).toBeUndefined();

    // PATCH on trashed target → 409 trashed.
    const patch = await SELF.fetch("https://example.com/admin/content/activities/ca-act-1", {
      method: "PATCH",
      headers: H(cookie),
      body: JSON.stringify({ title: "nope" }),
    });
    expect(patch.status).toBe(409);
    expect(await patch.json<any>()).toEqual({ error: "trashed" });

    // Restore returns the prior (published) state and clears prev_status.
    const restore = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-1/restore",
      { method: "POST", headers: H(cookie) },
    );
    expect(restore.status).toBe(200);
    const restored = await restore.json<any>();
    expect(restored.status).toBe("published");
    expect(restored.prev_status == null).toBe(true);
    const after = await env.DB.prepare(
      `SELECT status, prev_status FROM activities WHERE id='ca-act-1'`,
    ).first<any>();
    expect(after.status).toBe("published");
    expect(after.prev_status).toBeNull();

    // Restore on a non-trashed row → 409 not_trashed.
    const notTrashed = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-1/restore",
      { method: "POST", headers: H(cookie) },
    );
    expect(notTrashed.status).toBe(409);
    expect(await notTrashed.json<any>()).toEqual({ error: "not_trashed" });

    // Publish on trashed → 409 invalid_state.
    await env.DB.prepare(`UPDATE activities SET status='trashed', prev_status='draft' WHERE id='ca-act-1'`).run();
    const pTrashed = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-1/publish",
      { method: "POST", headers: H(cookie) },
    );
    expect(pTrashed.status).toBe(409);
    expect(await pTrashed.json<any>()).toEqual({ error: "invalid_state" });
  });

  it("works across collections (news) and allows editors", async () => {
    const owner = await ensureOwnerCookie();
    const ed = await editorCookie();

    // Owner creates a news draft; editor can read and publish it.
    const created = await SELF.fetch("https://example.com/admin/content/news", {
      method: "POST",
      headers: H(owner),
      body: JSON.stringify({
        slug: "ca-news-flash",
        title: "News Flash",
        excerpt: "fresh",
      }),
    });
    expect(created.status).toBe(201);
    const newsId = (await created.json<any>()).id;

    const edList = await SELF.fetch("https://example.com/admin/content/news", {
      headers: H(ed),
    });
    expect(edList.status).toBe(200);

    const edPatch = await SELF.fetch(`https://example.com/admin/content/news/${newsId}`, {
      method: "PATCH",
      headers: H(ed),
      body: JSON.stringify({ excerpt: "edited by editor" }),
    });
    expect(edPatch.status).toBe(200);

    const edPublish = await SELF.fetch(
      `https://example.com/admin/content/news/${newsId}/publish`,
      { method: "POST", headers: H(ed) },
    );
    expect(edPublish.status).toBe(200);

    const publicNews = await (
      await SELF.fetch("https://example.com/api/collections/news")
    ).json<any[]>();
    expect(publicNews.find((r) => r.slug === "ca-news-flash").excerpt).toBe("edited by editor");
  });
});

describe("content revisions", () => {
  // Fixture: ca-act-2 accumulates two revisions — v1 snapshots the seeded
  // base columns ("Rev One"), v2 captures "Rev Two" written via PATCH
  // between publishes. Later tests in this block chain on that state.
  it("lists revisions newest-first (data omitted) and serves one parsed revision", async () => {
    const cookie = await ensureOwnerCookie();
    await resetFixtures();
    await env.DB.prepare(
      `INSERT OR REPLACE INTO activities (id,slug,title,status) VALUES ('ca-act-2','ca-rev-live','Rev One','unpublished')`,
    ).run();
    const pub1 = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-2/publish",
      { method: "POST", headers: H(cookie) },
    );
    expect(pub1.status).toBe(200); // revision v1 = Rev One
    const patchRes = await SELF.fetch("https://example.com/admin/content/activities/ca-act-2", {
      method: "PATCH",
      headers: H(cookie),
      body: JSON.stringify({ title: "Rev Two" }),
    });
    expect(patchRes.status).toBe(200);
    // Publish requires draft/unpublished — flip back before the second round.
    const unpub = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-2/unpublish",
      { method: "POST", headers: H(cookie) },
    );
    expect(unpub.status).toBe(200);
    const pub2 = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-2/publish",
      { method: "POST", headers: H(cookie) },
    );
    expect(pub2.status).toBe(200); // revision v2 = Rev Two

    const listRes = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-2/revisions",
      { headers: H(cookie) },
    );
    expect(listRes.status).toBe(200);
    const revs = await listRes.json<any[]>();
    expect(revs.map((r) => r.version)).toEqual([2, 1]); // newest first
    expect(revs.every((r) => typeof r.created_at === "number" && r.created_at > 0)).toBe(true);
    expect(revs.every((r) => !("data" in r))).toBe(true);

    const oneRes = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-2/revisions/1",
      { headers: H(cookie) },
    );
    expect(oneRes.status).toBe(200);
    const v1 = await oneRes.json<any>();
    expect(v1.version).toBe(1);
    expect(v1.created_at).toBeGreaterThan(0);
    expect(v1.data).toEqual({
      slug: "ca-rev-live",
      title: "Rev One",
      tag: "",
      image_url: "",
      description: "",
      body: "",
    });

    // Absent version → 404.
    const missRes = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-2/revisions/99",
      { headers: H(cookie) },
    );
    expect(missRes.status).toBe(404);
  });

  it("restore overlays a prior revision as draft; state and public read unchanged until publish", async () => {
    const cookie = await ensureOwnerCookie(); // ca-act-2: v1=Rev One, v2=Rev Two, published
    const res = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-2/revisions/1/restore",
      { method: "POST", headers: H(cookie) },
    );
    expect(res.status).toBe(200);
    const row = await res.json<any>();
    expect(row._status).toBe("published"); // any live state allowed, none changed
    expect(row.title).toBe("Rev One"); // overlay merged over the live base

    // Storage: base columns untouched, draft_json holds the restored payload.
    const dbRow = await env.DB.prepare(
      `SELECT title, draft_json FROM activities WHERE id='ca-act-2'`,
    ).first<any>();
    expect(dbRow.title).toBe("Rev Two");
    expect(JSON.parse(dbRow.draft_json).title).toBe("Rev One");

    // Public read still serves the live v2 — publishing remains explicit.
    const before = await (
      await SELF.fetch("https://example.com/api/collections/activities")
    ).json<any[]>();
    expect(before.find((r) => r.slug === "ca-rev-live").title).toBe("Rev Two");

    // Publishing remains explicit — and the publish state machine still
    // applies (record is published here, so flip to unpublished first).
    const flip = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-2/unpublish",
      { method: "POST", headers: H(cookie) },
    );
    expect(flip.status).toBe(200);

    const pubRes = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-2/publish",
      { method: "POST", headers: H(cookie) },
    );
    expect(pubRes.status).toBe(200);
    const after = await (
      await SELF.fetch("https://example.com/api/collections/activities")
    ).json<any[]>();
    expect(after.find((r) => r.slug === "ca-rev-live").title).toBe("Rev One");
  });

  it("blocks restore onto trashed targets and rejects missing records or collections", async () => {
    const cookie = await ensureOwnerCookie(); // ca-act-2: three revisions after the last test's publish
    await env.DB.prepare(
      `UPDATE activities SET status='trashed', prev_status='published' WHERE id='ca-act-2'`,
    ).run();
    const trashedRes = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-2/revisions/1/restore",
      { method: "POST", headers: H(cookie) },
    );
    expect(trashedRes.status).toBe(409);
    expect(await trashedRes.json<any>()).toEqual({ error: "not_trashed" });

    // Missing record → 404 across all three endpoints.
    for (const req of [
      SELF.fetch("https://example.com/admin/content/activities/nope/revisions", {
        headers: H(cookie),
      }),
      SELF.fetch("https://example.com/admin/content/activities/nope/revisions/1", {
        headers: H(cookie),
      }),
      SELF.fetch("https://example.com/admin/content/activities/nope/revisions/1/restore", {
        method: "POST",
        headers: H(cookie),
      }),
    ]) {
      const res = await req;
      expect(res.status).toBe(404);
      expect(await res.json<object>()).toEqual({ error: "not_found" });
    }

    // Unknown collection → 404 unknown_collection.
    const unknown = await SELF.fetch("https://example.com/admin/content/widgets/x/revisions", {
      headers: H(cookie),
    });
    expect(unknown.status).toBe(404);
    expect(await unknown.json<any>()).toEqual({ error: "unknown_collection" });
  });

  it("allows editors on the revision endpoints", async () => {
    const ed = await editorCookie();
    // Leave the trashed precondition of the prior test behind.
    await env.DB.prepare(
      `UPDATE activities SET status='unpublished', prev_status=NULL WHERE id='ca-act-2'`,
    ).run();
    const edList = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-2/revisions",
      { headers: H(ed) },
    );
    expect(edList.status).toBe(200);
    const edDetail = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-2/revisions/2",
      { headers: H(ed) },
    );
    expect(edDetail.status).toBe(200);
    const edRestore = await SELF.fetch(
      "https://example.com/admin/content/activities/ca-act-2/revisions/2/restore",
      { method: "POST", headers: H(ed) },
    );
    expect(edRestore.status).toBe(200);
  });
});
