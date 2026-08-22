import { Hono } from "hono";
import type { Bindings } from "../app";
import { requireSession, type UserRow } from "../lib/http";
import { CONTENT_CONFIG, type CollectionName } from "../lib/content-config";

type Env = { Bindings: Bindings; Variables: { user: UserRow } };

const LIVE_STATES = ["draft", "published", "unpublished"] as const;
const ALL_STATES = [...LIVE_STATES, "trashed"] as const;
const ORDER = "ORDER BY sort ASC, created_at DESC";

type ContentRow = {
  id: string;
  slug: string;
  status: string;
  prev_status: string | null;
  draft_json: string | null;
} & Record<string, unknown>;

function isCollection(name: string): name is CollectionName {
  return Object.hasOwn(CONTENT_CONFIG, name);
}

// Parsed draft overlay, or {} when absent/corrupt (a bad overlay must never
// take down reads or block edits of the live record).
function draftDoc(row: ContentRow): Record<string, unknown> {
  if (typeof row.draft_json !== "string" || row.draft_json === "") return {};
  try {
    const doc: unknown = JSON.parse(row.draft_json);
    return doc !== null && typeof doc === "object" && !Array.isArray(doc)
      ? (doc as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

// Admin view: draft overlay merged over base columns. The raw overlay column
// never leaks, and any slug inside an overlay is ignored — slugs are set once
// at creation. `_status` carries the lifecycle state alongside merged fields.
function merged(row: ContentRow): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const [k, v] of Object.entries(draftDoc(row))) {
    if (k !== "slug") out[k] = v;
  }
  delete out.draft_json;
  out._status = row.status;
  return out;
}

// Snapshot of CURRENT base columns — exactly what a revision must restore.
function contentSnapshot(name: CollectionName, row: ContentRow): string {
  const data: Record<string, unknown> = { slug: row.slug };
  for (const f of CONTENT_CONFIG[name].fields) data[f] = row[f];
  return JSON.stringify(data);
}

// Statement applying the overlay's known fields onto base columns; null when
// there is nothing to apply. Table/column names come from CONTENT_CONFIG, so
// interpolation is safe.
function applyDraft(
  c: { env: { DB: D1Database } },
  name: CollectionName,
  recordId: string,
  doc: Record<string, unknown>,
): D1PreparedStatement | null {
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const f of CONTENT_CONFIG[name].fields) {
    const v = doc[f];
    if (v === undefined || v === null || typeof v === "object") continue;
    sets.push(`${f} = ?`);
    vals.push(String(v));
  }
  if (sets.length === 0) return null;
  return c.env.DB.prepare(`UPDATE ${name} SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...vals, recordId);
}

async function fetchRow(
  c: { env: { DB: D1Database } },
  name: CollectionName,
  id: string,
): Promise<ContentRow | null> {
  return c.env.DB.prepare(`SELECT * FROM ${name} WHERE id = ?`).bind(id).first<ContentRow>();
}

// Revision version segment: digits only, within safe integer range.
// Anything else identifies no revision — callers respond 404.
function parseVersion(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
}

export function contentAdminRoutes() {
  const app = new Hono<Env>();

  // Every /admin/content route requires a session; owner AND editor allowed.
  app.use("*", async (c, next) => {
    try {
      c.set("user", await requireSession(c));
    } catch {
      return c.json({ error: "unauthorized" }, 401);
    }
    await next();
  });

  app.get("/:collection", async (c) => {
    const name = c.req.param("collection");
    if (!isCollection(name)) return c.json({ error: "unknown_collection" }, 404);
    const status = c.req.query("status");
    let stmt: D1PreparedStatement;
    if (status === undefined) {
      stmt = c.env.DB.prepare(`SELECT * FROM ${name} WHERE status != 'trashed' ${ORDER}`);
    } else if ((ALL_STATES as readonly string[]).includes(status)) {
      stmt = c.env.DB.prepare(`SELECT * FROM ${name} WHERE status = ? ${ORDER}`).bind(status);
    } else {
      return c.json({ error: "invalid_status" }, 400);
    }
    const { results } = await stmt.all<ContentRow>();
    return c.json(results.map(merged));
  });

  app.get("/:collection/:id", async (c) => {
    const name = c.req.param("collection");
    if (!isCollection(name)) return c.json({ error: "unknown_collection" }, 404);
    const row = await fetchRow(c, name, c.req.param("id"));
    if (!row) return c.json({ error: "not_found" }, 404);
    return c.json(merged(row));
  });

  app.post("/:collection", async (c) => {
    const name = c.req.param("collection");
    if (!isCollection(name)) return c.json({ error: "unknown_collection" }, 404);

    const body = await c.req.json<Record<string, unknown>>().catch(() => null);
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return c.json({ error: "invalid_body" }, 400);
    }
    const slug = body.slug;
    if (typeof slug !== "string" || slug.trim() === "") {
      return c.json({ error: "missing_slug" }, 400);
    }
    const fields: string[] = [];
    const values: string[] = [];
    for (const [k, v] of Object.entries(body)) {
      if (k === "slug") continue;
      if (!(CONTENT_CONFIG[name].fields as readonly string[]).includes(k)) {
        return c.json({ error: "unknown_field" }, 400);
      }
      if (typeof v !== "string") return c.json({ error: "invalid_field_value" }, 400);
      fields.push(k);
      values.push(v);
    }

    const cols = ["id", "slug", "status", ...fields];
    try {
      await c.env.DB.prepare(
        `INSERT INTO ${name} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
      ).bind(crypto.randomUUID(), slug, "draft", ...values).run();
    } catch (err) {
      if (err instanceof Error && err.message.includes("UNIQUE")) {
        return c.json({ error: "slug_taken" }, 409);
      }
      throw err;
    }
    const row = await fetchRow(c, name, (
      await c.env.DB.prepare(`SELECT id FROM ${name} WHERE slug = ?`).bind(slug).first<{ id: string }>()
    )!.id);
    return c.json(merged(row!), 201);
  });

  app.patch("/:collection/:id", async (c) => {
    const name = c.req.param("collection");
    if (!isCollection(name)) return c.json({ error: "unknown_collection" }, 404);

    const body = await c.req.json<Record<string, unknown>>().catch(() => null);
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return c.json({ error: "invalid_body" }, 400);
    }
    const patch: Record<string, string> = {};
    for (const [k, v] of Object.entries(body)) {
      if (k === "slug") return c.json({ error: "slug_immutable" }, 400);
      if (!(CONTENT_CONFIG[name].fields as readonly string[]).includes(k)) {
        return c.json({ error: "unknown_field" }, 400);
      }
      if (typeof v !== "string") return c.json({ error: "invalid_field_value" }, 400);
      patch[k] = v;
    }

    const row = await fetchRow(c, name, c.req.param("id"));
    if (!row) return c.json({ error: "not_found" }, 404);
    if (row.status === "trashed") return c.json({ error: "trashed" }, 409);

    // Overlay holds the FULL merged document (existing overlay > patch >
    // base); base content columns are never touched here.
    const current = draftDoc(row);
    const doc: Record<string, string> = {};
    for (const f of CONTENT_CONFIG[name].fields) {
      const v = patch[f] ?? current[f];
      if (typeof v === "string") doc[f] = v;
    }
    await c.env.DB.prepare(
      `UPDATE ${name} SET draft_json = ?, updated_at = unixepoch() WHERE id = ?`,
    ).bind(JSON.stringify(doc), row.id).run();

    return c.json(merged({ ...row, draft_json: JSON.stringify(doc) }));
  });

  app.delete("/:collection/:id", async (c) => {
    const name = c.req.param("collection");
    if (!isCollection(name)) return c.json({ error: "unknown_collection" }, 404);
    const row = await fetchRow(c, name, c.req.param("id"));
    if (!row) return c.json({ error: "not_found" }, 404);
    if (row.status === "trashed") return c.json({ error: "trashed" }, 409);
    await c.env.DB.prepare(
      `UPDATE ${name} SET prev_status = status, status = 'trashed' WHERE id = ?`,
    ).bind(row.id).run();
    return c.body(null, 204);
  });

  app.post("/:collection/:id/restore", async (c) => {
    const name = c.req.param("collection");
    if (!isCollection(name)) return c.json({ error: "unknown_collection" }, 404);
    const row = await fetchRow(c, name, c.req.param("id"));
    if (!row) return c.json({ error: "not_found" }, 404);
    if (row.status !== "trashed") return c.json({ error: "not_trashed" }, 409);
    const back = (LIVE_STATES as readonly string[]).includes(row.prev_status ?? "")
      ? (row.prev_status as string)
      : "unpublished"; // defensive: trashed without a usable prev_status
    await c.env.DB.prepare(
      `UPDATE ${name} SET status = ?, prev_status = NULL WHERE id = ?`,
    ).bind(back, row.id).run();
    return c.json(merged((await fetchRow(c, name, row.id))!));
  });

  // Revision index for one record — newest first, payload data omitted.
  app.get("/:collection/:id/revisions", async (c) => {
    const name = c.req.param("collection");
    if (!isCollection(name)) return c.json({ error: "unknown_collection" }, 404);
    const row = await fetchRow(c, name, c.req.param("id"));
    if (!row) return c.json({ error: "not_found" }, 404);
    const { results } = await c.env.DB.prepare(
      `SELECT version, created_at FROM revisions
       WHERE collection = ? AND record_id = ? ORDER BY version DESC`,
    ).bind(name, row.id).all<{ version: number; created_at: number }>();
    return c.json(results);
  });

  // One full revision with its snapshot parsed back to JSON.
  app.get("/:collection/:id/revisions/:version", async (c) => {
    const name = c.req.param("collection");
    if (!isCollection(name)) return c.json({ error: "unknown_collection" }, 404);
    const version = parseVersion(c.req.param("version"));
    if (version === null) return c.json({ error: "not_found" }, 404);
    const rev = await c.env.DB.prepare(
      `SELECT version, data, created_at FROM revisions
       WHERE collection = ? AND record_id = ? AND version = ?`,
    ).bind(name, c.req.param("id"), version)
      .first<{ version: number; data: string; created_at: number }>();
    if (!rev) return c.json({ error: "not_found" }, 404);
    return c.json({ version: rev.version, data: JSON.parse(rev.data), created_at: rev.created_at });
  });

  // Restore-as-draft: overlay draft_json with a prior revision's payload.
  // Allowed from any live state; status and base columns stay put, so
  // publishing the restored content remains an explicit follow-up.
  app.post("/:collection/:id/revisions/:version/restore", async (c) => {
    const name = c.req.param("collection");
    if (!isCollection(name)) return c.json({ error: "unknown_collection" }, 404);
    const row = await fetchRow(c, name, c.req.param("id"));
    if (!row) return c.json({ error: "not_found" }, 404);
    if (row.status === "trashed") return c.json({ error: "not_trashed" }, 409);
    const version = parseVersion(c.req.param("version"));
    if (version === null) return c.json({ error: "not_found" }, 404);
    const rev = await c.env.DB.prepare(
      `SELECT data FROM revisions WHERE collection = ? AND record_id = ? AND version = ?`,
    ).bind(name, row.id, version).first<{ data: string }>();
    if (!rev) return c.json({ error: "not_found" }, 404);
    await c.env.DB.prepare(
      `UPDATE ${name} SET draft_json = ?, updated_at = unixepoch() WHERE id = ?`,
    ).bind(rev.data, row.id).run();
    return c.json(merged((await fetchRow(c, name, row.id))!));
  });

  app.post("/:collection/:id/publish", async (c) => {
    const name = c.req.param("collection");
    if (!isCollection(name)) return c.json({ error: "unknown_collection" }, 404);
    const row = await fetchRow(c, name, c.req.param("id"));
    if (!row) return c.json({ error: "not_found" }, 404);
    if (row.status !== "draft" && row.status !== "unpublished") {
      return c.json({ error: "invalid_state" }, 409);
    }

    // Atomic publish: snapshot the pre-publish base columns as the next
    // revision (version derived in-statement from existing rows), apply the
    // overlay onto base columns, clear the overlay, flip state. A failure at
    // any point leaves the prior version fully live.
    const statements: D1PreparedStatement[] = [
      c.env.DB.prepare(
        `INSERT INTO revisions (id, collection, record_id, version, data, created_by)
         SELECT ?, ?, ?, COALESCE(MAX(version), 0) + 1, ?, ?
         FROM revisions WHERE collection = ? AND record_id = ?`,
      ).bind(
        crypto.randomUUID(),
        name,
        row.id,
        contentSnapshot(name, row),
        c.get("user").id,
        name,
        row.id,
      ),
    ];
    const apply = applyDraft(c, name, row.id, draftDoc(row));
    if (apply) statements.push(apply);
    statements.push(
      c.env.DB.prepare(
        `UPDATE ${name} SET draft_json = NULL, status = 'published', published_at = unixepoch()
         WHERE id = ?`,
      ).bind(row.id),
    );
    await c.env.DB.batch(statements);

    return c.json(merged((await fetchRow(c, name, row.id))!));
  });

  app.post("/:collection/:id/unpublish", async (c) => {
    const name = c.req.param("collection");
    if (!isCollection(name)) return c.json({ error: "unknown_collection" }, 404);
    const row = await fetchRow(c, name, c.req.param("id"));
    if (!row) return c.json({ error: "not_found" }, 404);
    if (row.status !== "published") return c.json({ error: "invalid_state" }, 409);
    await c.env.DB.prepare(`UPDATE ${name} SET status = 'unpublished' WHERE id = ?`)
      .bind(row.id).run();
    return c.json(merged((await fetchRow(c, name, row.id))!));
  });

  return app;
}
