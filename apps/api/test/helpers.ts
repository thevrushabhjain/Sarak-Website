import { SELF, env } from "cloudflare:test";
import { hashPassword } from "../src/lib/crypto";

// Cross-file deterministic owner session.
//
// Upserts the owner to a known password (stable row id — revisions.created_by
// keeps its FK target) and boots a fresh session. Order-independent: works on
// fresh storage, after auth.spec's password rotation, and after any number of
// prior ensureOwnerCookie calls in the same run.
export async function ensureOwnerCookie(email = "owner@sarak.org"): Promise<string> {
  await env.DB.prepare(
    `INSERT INTO users (id,email,password_hash,role) VALUES ('owner-fixed',?,?,'owner')
     ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash, disabled_at=NULL`,
  ).bind(email, await hashPassword("OwnerPass!234")).run();

  await env.DB.prepare(
    "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = ?)",
  ).bind(email).run();

  const login = await SELF.fetch("https://example.com/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "OwnerPass!234" }),
  });
  if (login.status !== 200 || !login.headers.get("set-cookie")) {
    throw new Error(`ensureOwnerCookie: login failed ${login.status}`);
  }
  return login.headers.get("set-cookie")!.split(";")[0];
}
