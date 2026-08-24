import { Hono } from "hono";
import type { Bindings } from "../app";
import * as authCrypto from "../lib/crypto";
import { requireSession, type UserRow } from "../lib/http";

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days
const WINDOW_EMAIL = 15 * 60, MAX_PER_EMAIL = 10;
const WINDOW_IP = 60 * 60, MAX_PER_IP = 50;

function genRecoveryCode(): string {
  const hex = crypto.getRandomValues(new Uint8Array(8));
  const h = [...hex].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}`;
}

export function authRoutes() {
  const app = new Hono<{ Bindings: Bindings }>();

  app.post("/bootstrap", async (c) => {
    const auth = c.req.header("authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!c.env.SARAK_BOOTSTRAP_TOKEN || token !== c.env.SARAK_BOOTSTRAP_TOKEN) {
      return c.json({ error: "forbidden" }, 403);
    }
    const existing = await c.env.DB.prepare(
      "SELECT id FROM users WHERE role='owner' LIMIT 1",
    ).first();
    if (existing) return c.json({ error: "already_bootstrapped" }, 409);

    const { email, password } = await c.req.json<{ email: string; password: string }>();
    const norm = email.trim().toLowerCase();
    const id = crypto.randomUUID();

    // Owner row and all recovery codes must commit together: a mid-request
    // failure would otherwise leave an owner who can never recover access.
    const statements: D1PreparedStatement[] = [
      c.env.DB.prepare(
        "INSERT INTO users (id,email,password_hash,role) VALUES (?,?,?,'owner')",
      ).bind(id, norm, await authCrypto.hashPassword(password)),
    ];

    const codes: string[] = [];
    for (let i = 0; i < 10; i++) codes.push(genRecoveryCode());
    for (const code of codes) {
      statements.push(
        c.env.DB.prepare(
          "INSERT INTO recovery_codes (id,user_id,code_hash) VALUES (?,?,?)",
        ).bind(crypto.randomUUID(), id, await authCrypto.hashCode(code)),
      );
    }

    try {
      await c.env.DB.batch(statements);
    } catch (err) {
      // The partial unique index on users(role) makes a concurrent bootstrap
      // lose the race here instead of creating a second owner.
      if (/UNIQUE/i.test(err instanceof Error ? err.message : String(err))) {
        const winner = await c.env.DB.prepare(
          "SELECT id FROM users WHERE role='owner' LIMIT 1",
        ).first();
        if (winner) return c.json({ error: "already_bootstrapped" }, 409);
      }
      throw err;
    }
    return c.json({ user: { id, email: norm, role: "owner" }, recovery_codes: codes }, 201);
  });

  app.post("/login", async (c) => {
    const ip = c.req.header("cf-connecting-ip") ?? "test";
    const { email, password } = await c.req.json<{ email: string; password: string }>();
    const norm = email.trim().toLowerCase();

    const byEmail = await c.env.DB.prepare(
      "SELECT COUNT(*) AS n FROM login_attempts WHERE email_norm=? AND at > unixepoch()-?",
    ).bind(norm, WINDOW_EMAIL).first<number>("n");
    if ((byEmail ?? 0) >= MAX_PER_EMAIL) return c.json({ error: "rate_limited" }, 429);
    const byIp = await c.env.DB.prepare(
      "SELECT COUNT(*) AS n FROM login_attempts WHERE ip=? AND at > unixepoch()-?",
    ).bind(ip, WINDOW_IP).first<number>("n");
    if ((byIp ?? 0) >= MAX_PER_IP) return c.json({ error: "rate_limited" }, 429);

    const user = await c.env.DB.prepare(
      "SELECT id,password_hash,role FROM users WHERE email=? AND disabled_at IS NULL",
    ).bind(norm).first<{ id: string; password_hash: string; role: "owner" | "editor" }>();

    const fail = async () => {
      await c.env.DB.prepare(
        "INSERT INTO login_attempts (email_norm,ip) VALUES (?,?)",
      ).bind(norm, ip).run();
      return c.json({ error: "invalid_credentials" }, 401);
    };
    if (!user || !(await authCrypto.verifyPassword(password, user.password_hash))) return fail();

    const token = await authCrypto.generateToken();
    await c.env.DB.prepare(
      "INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,unixepoch()+?)",
    ).bind(await authCrypto.sha256Hex(token), user.id, SESSION_TTL).run();
    // SameSite=None is required for the admin portal on *.pages.dev: Lax
    // cookies are never attached to cross-site fetches (pages.dev ->
    // workers.dev), which would silently break every credentialed call.
    // CSRF stays bounded: state-changing routes take JSON/multipart bodies
    // that preflight against the strict CORS origin allowlist.
    c.header(
      "set-cookie",
      `sarak_session=${token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${SESSION_TTL}`,
    );
    return c.json({ user: { id: user.id, email: norm, role: user.role } });
  });

  app.post("/logout", async (c) => {
    const cookie = c.req.header("cookie") ?? "";
    const m = cookie.match(/(?:^|;\s*)sarak_session=([A-Za-z0-9_-]+)/);
    if (m) {
      await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
        .bind(await authCrypto.sha256Hex(m[1])).run();
    }
    c.header("set-cookie", "sarak_session=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0");
    return c.body(null, 204);
  });

  app.get("/me", async (c) => {
    const user = await requireSession(c);
    return c.json(user satisfies UserRow);
  });

  app.post("/recover", async (c) => {
    const { code, new_password } = await c.req.json<{ code: string; new_password: string }>();
    const hash = await authCrypto.hashCode(code.trim().toUpperCase());
    const row = await c.env.DB.prepare(
      "SELECT id,user_id FROM recovery_codes WHERE code_hash=? AND used_at IS NULL",
    ).bind(hash).first<{ id: string; user_id: string }>();
    if (!row) return c.json({ error: "invalid_code" }, 400);

    // TOCTOU guard: atomically claim the code so two concurrent requests
    // presenting the same code cannot both succeed; the loser changes 0 rows.
    const claimed = await c.env.DB.prepare(
      "UPDATE recovery_codes SET used_at=unixepoch() WHERE id=? AND used_at IS NULL",
    ).bind(row.id).run();
    if (claimed.meta.changes !== 1) return c.json({ error: "invalid_code" }, 400);

    await c.env.DB.batch([
      c.env.DB.prepare("UPDATE users SET password_hash=? WHERE id=?")
        .bind(await authCrypto.hashPassword(new_password), row.user_id),
      c.env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(row.user_id),
    ]);
    return c.body(null, 204);
  });

  return app;
}
