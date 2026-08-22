import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";
import type { Bindings } from "../app";
import { sha256Hex } from "./crypto";

export type UserRow = {
  id: string;
  email: string;
  role: "owner" | "editor";
};

export async function requireSession<E extends { Bindings: Bindings }>(
  c: Context<E>,
): Promise<UserRow> {
  const cookie = c.req.header("cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)sarak_session=([A-Za-z0-9_-]+)/);
  const tokenHash = m ? await sha256Hex(m[1]) : null;
  // Hono only converts thrown values that are Errors; carrying the Response in
  // an HTTPException preserves the exact 401 JSON body through onError.
  const row = tokenHash
    ? await c.env.DB.prepare(
        `SELECT u.id, u.email, u.role FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > unixepoch() AND u.disabled_at IS NULL`,
      ).bind(tokenHash).first<UserRow>()
    : null;
  if (!row) {
    throw new HTTPException(401, { res: c.json({ error: "unauthorized" }, 401) });
  }
  return row;
}
