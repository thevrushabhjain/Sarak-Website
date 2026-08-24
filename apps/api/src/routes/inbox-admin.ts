import { Hono } from "hono";
import type { Bindings } from "../app";
import { requireSession, type UserRow } from "../lib/http";

type Env = { Bindings: Bindings; Variables: { user: UserRow } };

// Static literal keys → Record per project rule; membership stays O(1).
const KINDS: Record<string, true> = { registration: true, enquiry: true };

export function inboxAdminRoutes() {
  const app = new Hono<Env>();

  // Session required for every inbox route; both roles may read and work
  // individual submissions. Bulk purge is owner-only (checked per-route).
  app.use("*", async (c, next) => {
    let user: UserRow;
    try {
      user = await requireSession(c);
    } catch {
      return c.json({ error: "unauthorized" }, 401);
    }
    c.set("user", user);
    await next();
  });

  app.get("/:kind", async (c) => {
    const kind = c.req.param("kind");
    if (!KINDS[kind]) return c.json({ error: "unknown_kind" }, 404);

    const unreadOnly = c.req.query("unread") === "1";
    const limit = Math.min(Number(c.req.query("limit") ?? 50) || 50, 200);
    const offset = Math.max(Number(c.req.query("offset") ?? 0) || 0, 0);

    const { results } = await c.env.DB.prepare(
      `SELECT id, payload_json, read_at, created_at FROM submissions
       WHERE kind = ? AND trashed_at IS NULL
       ${unreadOnly ? "AND read_at IS NULL" : ""}
       ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    ).bind(kind, limit, offset).all<{ id: string; payload_json: string; read_at: number | null; created_at: number }>();

    const unread = await c.env.DB.prepare(
      `SELECT COUNT(*) AS n FROM submissions
       WHERE kind = ? AND trashed_at IS NULL AND read_at IS NULL`,
    ).bind(kind).first<{ n: number }>();

    c.header("x-unread-count", String(unread?.n ?? 0));
    return c.json(results.map((r) => ({
      id: r.id,
      payload: JSON.parse(r.payload_json) as unknown,
      read_at: r.read_at,
      created_at: r.created_at,
    })));
  });

  app.post("/submissions/:id/read", async (c) => {
    const res = await c.env.DB.prepare(
      "UPDATE submissions SET read_at=unixepoch() WHERE id=? AND read_at IS NULL",
    ).bind(c.req.param("id")).run();
    if ((res.meta.changes ?? 0) === 0) return c.json({ error: "not_found" }, 404);
    return c.body(null, 204);
  });

  app.delete("/submissions/:id", async (c) => {
    const res = await c.env.DB.prepare(
      "UPDATE submissions SET trashed_at=unixepoch() WHERE id=? AND trashed_at IS NULL",
    ).bind(c.req.param("id")).run();
    if ((res.meta.changes ?? 0) === 0) return c.json({ error: "not_found" }, 404);
    return c.body(null, 204);
  });

  // Owner-only hard purge of ALREADY-TRASHED rows for one kind. Editors are
  // explicitly forbidden; live submissions are never touched here.
  app.delete("/:kind", async (c) => {
    if (c.get("user").role !== "owner") {
      return c.json({ error: "forbidden" }, 403);
    }
    const kind = c.req.param("kind");
    if (!KINDS[kind]) return c.json({ error: "unknown_kind" }, 404);
    const res = await c.env.DB.prepare(
      "DELETE FROM submissions WHERE kind=? AND trashed_at IS NOT NULL",
    ).bind(kind).run();
    return c.json({ deleted: res.meta.changes ?? 0 });
  });

  return app;
}
