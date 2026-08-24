import { Hono } from "hono";
import type { Bindings } from "../app";
import { requireSession, type UserRow } from "../lib/http";
import { validateSchema } from "../lib/form-schema";

type Env = { Bindings: Bindings; Variables: { user: UserRow } };

type FormRow = {
  id: string;
  program_id: string | null;
  name: string;
  status: "draft" | "published" | "trashed";
  created_at: number;
  updated_at: number;
};

type VersionRow = {
  version: number;
  schema_json: string;
  created_at: number;
};

const FORM_STATES = ["draft", "published", "trashed"] as const;

// Minimal structural typing so helpers stay callable without the full Hono
// context (same pattern as users-admin.fetchUser).
type DbOnly = { env: { DB: D1Database } };

async function fetchForm(c: DbOnly, id: string): Promise<FormRow | null> {
  return c.env.DB.prepare(
    "SELECT id, program_id, name, status, created_at, updated_at FROM forms WHERE id = ?",
  ).bind(id).first<FormRow>();
}

async function programExists(c: DbOnly, id: string): Promise<boolean> {
  return (await c.env.DB.prepare("SELECT 1 FROM programs WHERE id = ?").bind(id).first()) !== null;
}

// The forms table has no fields column: the current (unpublished) payload
// lives as a working-copy form_versions row at version 0. A missing or
// corrupt working copy degrades to [] so reads never break on stored data.
async function workingFields(c: DbOnly, formId: string): Promise<unknown[]> {
  const row = await c.env.DB.prepare(
    "SELECT schema_json FROM form_versions WHERE form_id = ? AND version = 0",
  ).bind(formId).first<{ schema_json: string }>();
  if (!row) return [];
  return parseFields(row.schema_json);
}

function parseFields(schemaJson: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(schemaJson);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

async function formView(c: DbOnly, row: FormRow): Promise<Record<string, unknown>> {
  return { ...row, fields: await workingFields(c, row.id) };
}

export function formsAdminRoutes() {
  const app = new Hono<Env>();

  // Every /admin/forms route requires a session; owner AND editor allowed.
  app.use("*", async (c, next) => {
    try {
      c.set("user", await requireSession(c));
    } catch {
      return c.json({ error: "unauthorized" }, 401);
    }
    await next();
  });

  app.get("/", async (c) => {
    const status = c.req.query("status");
    let stmt: D1PreparedStatement;
    if (status === undefined) {
      stmt = c.env.DB.prepare(
        `SELECT id, program_id, name, status, created_at, updated_at
         FROM forms WHERE status != 'trashed' ORDER BY created_at DESC`,
      );
    } else if ((FORM_STATES as readonly string[]).includes(status)) {
      stmt = c.env.DB.prepare(
        `SELECT id, program_id, name, status, created_at, updated_at
         FROM forms WHERE status = ? ORDER BY created_at DESC`,
      ).bind(status);
    } else {
      return c.json({ error: "invalid_status" }, 400);
    }
    const { results } = await stmt.all<FormRow>();
    return c.json(await Promise.all(results.map((row) => formView(c, row))));
  });

  app.get("/:id", async (c) => {
    const row = await fetchForm(c, c.req.param("id"));
    if (!row) return c.json({ error: "not_found" }, 404);
    return c.json(await formView(c, row));
  });

  app.post("/", async (c) => {
    const body = await c.req.json<Record<string, unknown>>().catch(() => null);
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return c.json({ error: "invalid_body" }, 400);
    }
    if (typeof body.name !== "string" || body.name.trim() === "") {
      return c.json({ error: "invalid_body" }, 400);
    }
    let programId: string | null = null;
    if (body.program_id !== undefined && body.program_id !== null) {
      if (typeof body.program_id !== "string") return c.json({ error: "invalid_body" }, 400);
      if (!(await programExists(c, body.program_id))) {
        return c.json({ error: "unknown_program" }, 400);
      }
      programId = body.program_id;
    }
    const check = validateSchema(body.fields);
    if (!check.ok) return c.json({ error: check.error }, 400);

    const id = crypto.randomUUID();
    // Form + working copy commit together: a draft must never exist without
    // its version-0 fields.
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO forms (id, program_id, name, status) VALUES (?, ?, ?, 'draft')",
      ).bind(id, programId, body.name),
      c.env.DB.prepare(
        "INSERT INTO form_versions (id, form_id, version, schema_json) VALUES (?, ?, 0, ?)",
      ).bind(crypto.randomUUID(), id, JSON.stringify(body.fields)),
    ]);
    return c.json(await formView(c, (await fetchForm(c, id))!), 201);
  });

  app.patch("/:id", async (c) => {
    const row = await fetchForm(c, c.req.param("id"));
    if (!row) return c.json({ error: "not_found" }, 404);
    if (row.status === "trashed") return c.json({ error: "trashed" }, 409);

    const body = await c.req.json<Record<string, unknown>>().catch(() => null);
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return c.json({ error: "invalid_body" }, 400);
    }
    for (const key of Object.keys(body)) {
      if (key !== "name" && key !== "fields" && key !== "program_id") {
        return c.json({ error: "unknown_field" }, 400);
      }
    }

    // Published forms are frozen: field changes are refused outright (nothing
    // is stored pending a republish); name/program_id still update in place.
    if (row.status === "published" && "fields" in body) {
      return c.json({ error: "republish_required" }, 409);
    }

    let newName: string | undefined;
    let newProgramId: string | null | undefined;
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim() === "") {
        return c.json({ error: "invalid_body" }, 400);
      }
      newName = body.name;
    }
    if (body.program_id !== undefined) {
      if (body.program_id === null) {
        newProgramId = null;
      } else if (typeof body.program_id === "string") {
        if (!(await programExists(c, body.program_id))) {
          return c.json({ error: "unknown_program" }, 400);
        }
        newProgramId = body.program_id;
      } else {
        return c.json({ error: "invalid_body" }, 400);
      }
    }

    // Working-copy upsert: REPLACE-style conflict resolution is safe because
    // nothing references version 0 (submissions only point at published
    // versions >= 1).
    const statements: D1PreparedStatement[] = [];
    const sets: string[] = ["updated_at = unixepoch()"];
    const values: (string | null)[] = [];
    if (newName !== undefined) {
      sets.unshift("name = ?");
      values.push(newName);
    }
    if (newProgramId !== undefined) {
      sets.splice(newName !== undefined ? 1 : 0, 0, "program_id = ?");
      values.push(newProgramId);
    }
    statements.push(
      c.env.DB.prepare(`UPDATE forms SET ${sets.join(", ")} WHERE id = ?`)
        .bind(...values, row.id),
    );
    if ("fields" in body) {
      const check = validateSchema(body.fields);
      if (!check.ok) return c.json({ error: check.error }, 400);
      statements.push(
        c.env.DB.prepare(
          `INSERT INTO form_versions (id, form_id, version, schema_json) VALUES (?, ?, 0, ?)
           ON CONFLICT(form_id, version) DO UPDATE SET schema_json = excluded.schema_json`,
        ).bind(crypto.randomUUID(), row.id, JSON.stringify(body.fields)),
      );
    }
    await c.env.DB.batch(statements);
    return c.json(await formView(c, (await fetchForm(c, row.id))!));
  });

  app.delete("/:id", async (c) => {
    const row = await fetchForm(c, c.req.param("id"));
    if (!row) return c.json({ error: "not_found" }, 404);
    if (row.status === "trashed") return c.json({ error: "trashed" }, 409);

    // Registrations referencing any frozen version pin the form: trashing it
    // would orphan real signups. Archiving happens by trashing the owning
    // program instead (same rule as content).
    const pinned = await c.env.DB.prepare(
      `SELECT 1 FROM submissions s
       JOIN form_versions fv ON fv.id = s.form_version_id
       WHERE fv.form_id = ? AND s.kind = 'registration'
       LIMIT 1`,
    ).bind(row.id).first();
    if (pinned) return c.json({ error: "has_submissions" }, 409);

    await c.env.DB.prepare(
      "UPDATE forms SET status = 'trashed', updated_at = unixepoch() WHERE id = ?",
    ).bind(row.id).run();
    return c.body(null, 204);
  });

  app.post("/:id/publish", async (c) => {
    const row = await fetchForm(c, c.req.param("id"));
    if (!row) return c.json({ error: "not_found" }, 404);
    if (row.status === "trashed") return c.json({ error: "invalid_state" }, 409);

    const fields = await workingFields(c, row.id);
    const check = validateSchema(fields);
    if (!check.ok) return c.json({ error: check.error }, 400);

    // Version derived in-statement from existing rows (the working copy
    // counts, so the first publish lands on version 1) and applied together
    // with the status flip — a failure leaves the prior published state
    // fully intact.
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO form_versions (id, form_id, version, schema_json)
         SELECT ?, ?, COALESCE(MAX(version), 0) + 1, ?
         FROM form_versions WHERE form_id = ?`,
      ).bind(crypto.randomUUID(), row.id, JSON.stringify(fields), row.id),
      c.env.DB.prepare(
        "UPDATE forms SET status = 'published', updated_at = unixepoch() WHERE id = ?",
      ).bind(row.id),
    ]);
    const version = (
      await c.env.DB.prepare("SELECT MAX(version) AS v FROM form_versions WHERE form_id = ?")
        .bind(row.id)
        .first<{ v: number }>()
    )!.v;
    return c.json({ form: await formView(c, (await fetchForm(c, row.id))!), version });
  });

  // Published snapshots only — the version-0 working copy is not history.
  app.get("/:id/versions", async (c) => {
    const row = await fetchForm(c, c.req.param("id"));
    if (!row) return c.json({ error: "not_found" }, 404);
    const { results } = await c.env.DB.prepare(
      `SELECT version, schema_json, created_at FROM form_versions
       WHERE form_id = ? AND version > 0 ORDER BY version DESC`,
    ).bind(row.id).all<VersionRow>();
    return c.json(
      results.map((v) => ({
        version: v.version,
        created_at: v.created_at,
        fields: parseFields(v.schema_json),
      })),
    );
  });

  return app;
}
