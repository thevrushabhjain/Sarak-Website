import { Hono } from "hono";
import type { Bindings } from "../app";
import { requireSession, type UserRow } from "../lib/http";
import { hashPassword } from "../lib/crypto";

type Env = { Bindings: Bindings; Variables: { user: UserRow } };

type UserListRow = {
  id: string;
  email: string;
  role: "owner" | "editor";
  disabled_at: number | null;
};

async function fetchUser(
  c: { env: { DB: D1Database } },
  id: string,
): Promise<{ id: string } | null> {
  return c.env.DB.prepare("SELECT id FROM users WHERE id = ?")
    .bind(id)
    .first<{ id: string }>();
}

export function usersAdminRoutes() {
  const app = new Hono<Env>();

  // Every /admin/users route is owner-only: anonymous gets 401 (same shape
  // as the other admin mounts), an authenticated editor gets 403 forbidden.
  app.use("*", async (c, next) => {
    let user: UserRow;
    try {
      user = await requireSession(c);
    } catch {
      return c.json({ error: "unauthorized" }, 401);
    }
    if (user.role !== "owner") return c.json({ error: "forbidden" }, 403);
    c.set("user", user);
    await next();
  });

  // Full account roster; disabled_at distinguishes active vs suspended.
  app.get("/", async (c) => {
    const { results } = await c.env.DB.prepare(
      "SELECT id, email, role, disabled_at FROM users ORDER BY created_at ASC, email ASC",
    ).all<UserListRow>();
    return c.json(results);
  });

  app.post("/", async (c) => {
    const body = await c.req.json<Record<string, unknown>>().catch(() => null);
    if (body === null || typeof body !== "object") {
      return c.json({ error: "invalid_body" }, 400);
    }
    const { email, password, role } = body;
    if (
      typeof email !== "string" ||
      email.trim() === "" ||
      typeof password !== "string" ||
      password === ""
    ) {
      return c.json({ error: "invalid_body" }, 400);
    }
    if (role !== "owner" && role !== "editor") {
      return c.json({ error: "invalid_role" }, 400);
    }

    const norm = email.trim().toLowerCase();
    const id = crypto.randomUUID();
    try {
      await c.env.DB.prepare(
        "INSERT INTO users (id,email,password_hash,role) VALUES (?,?,?,?)",
      ).bind(id, norm, await hashPassword(password), role).run();
    } catch (err) {
      // users.email is UNIQUE; normalize-first keeps near-duplicates honest.
      if (err instanceof Error && err.message.includes("UNIQUE")) {
        return c.json({ error: "email_taken" }, 409);
      }
      throw err;
    }
    return c.json({ id, email: norm, role }, 201);
  });

  // Suspension is metadata-only by design: no session rows are deleted, so
  // re-enabling revives an existing session while disabled_at blocks it via
  // the requireSession JOIN.
  app.post("/:id/disable", async (c) => {
    const me = c.get("user");
    const id = c.req.param("id");
    if (id === me.id) return c.json({ error: "cannot_disable_self" }, 400);
    if (!(await fetchUser(c, id))) return c.json({ error: "not_found" }, 404);
    await c.env.DB.prepare(
      "UPDATE users SET disabled_at=unixepoch() WHERE id=? AND disabled_at IS NULL",
    ).bind(id).run();
    return c.body(null, 204);
  });

  app.post("/:id/enable", async (c) => {
    const id = c.req.param("id");
    if (!(await fetchUser(c, id))) return c.json({ error: "not_found" }, 404);
    await c.env.DB.prepare("UPDATE users SET disabled_at=NULL WHERE id=?")
      .bind(id).run();
    return c.body(null, 204);
  });

  // Password rotation commits together with the session wipe: leaving old
  // sessions alive after a forced reset would defeat its purpose.
  app.post("/:id/reset-password", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json<Record<string, unknown>>().catch(() => null);
    const newPassword = body?.["new_password"];
    if (typeof newPassword !== "string" || newPassword === "") {
      return c.json({ error: "invalid_body" }, 400);
    }
    if (!(await fetchUser(c, id))) return c.json({ error: "not_found" }, 404);
    await c.env.DB.batch([
      c.env.DB.prepare("UPDATE users SET password_hash=? WHERE id=?")
        .bind(await hashPassword(newPassword), id),
      c.env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(id),
    ]);
    return c.body(null, 204);
  });

  return app;
}
