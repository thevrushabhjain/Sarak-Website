# Sarak Foundation Implementation Plan (Plan 1 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the isolated branch, the Hono/Cloudflare Workers API with D1 auth (owner/editor, recovery codes, rate limits) and R2 media storage, plus a seeded legacy-content import — the foundation every later Sarak Website plan builds on.

**Architecture:** New isolated branch cut from GitHub `main` (visual source of truth). Legacy Next.js app stays untouched at repo root during dual-run. All new backend code lives in a `apps/api` pnpm workspace: Hono router on Workers, raw D1 prepared statements (no ORM — portability requirement), R2 private bucket behind an authenticated upload endpoint and a Worker-served read route.

**Tech Stack:** TypeScript, Hono v4, Cloudflare Workers + D1 + R2, Wrangler v4, Vitest with `@cloudflare/vitest-pool-workers`, WebCrypto (PBKDF2-SHA256), tsx for the import script, pnpm workspaces.

**Linear:** `VIM4-157` (Set up website data and image storage), `VIM4-158` (Build owner and editor access).

**Later plans (out of scope here):** Plan 2 content lifecycle + revisions + forms/inboxes; Plan 3 public web parity rebuild (RNW); Plan 4 admin portal UI; Plan 5 iOS/Android app; Plan 6 dual-run parity + cutover.

## Global Constraints (from approved spec — bind every task)

- Existing page hero sections are code-owned and never editable; nothing in this plan writes hero content.
- No public visitor accounts; no registration-confirmation email; no outbound email anywhere.
- Owner-only operations: account creation/resets/deletion, bulk inbox purge. Editors: approved content lifecycle only.
- Sessions expire after **7 days** of inactivity; revocable on logout/password change/account removal.
- Login rate limits: **10 attempts per account per 15 minutes**, **50 per IP per hour**; passwords stored as salted adaptive hashes.
- Owner recovery codes: **10 single-use codes generated at owner creation**, stored offline by owner; dead-end recovery = documented operator runbook on D1.
- Media: authenticated uploads only; raster allowlist **JPEG, PNG, WebP only** verified by magic bytes; SVG/HTML rejected outright; **10 MB per image** cap; system-generated keys; failed processing leaves nothing publicly visible.
- Publish latency target p95 < 60 s (web); unpublish URL dead < 60 s (enforced later via cache invalidation; Plan 2).
- Trash retained until owner permanent-delete; storage warning at 80% of plan allowance (Plan 2 dashboards).
- Dates render in Asia/Kolkata (display concern of later plans).
- Dual-run: new system publish affects only preview URLs, never production traffic, until cutover gates pass.
- Cost floor: Workers Paid US$5/mo; do not add services beyond Workers/D1/R2 in this plan.

---

### Task 1: Isolated branch from GitHub main + commit design docs

**Files:**
- Create: `docs/superpowers/specs/2026-08-21-sarak-dynamic-admin-design.md` (copied from local folder)
- Create: `docs/plans/2026-08-21-sarak-foundation.md` (this file, copied)

**Interfaces:**
- Produces: git branch `feat/admin-foundation` containing legacy `main` + both docs; all later tasks commit here.

- [ ] **Step 1: Clone remote into a sibling worktree**

```bash
cd "D:/01. Vimaksh"
git clone https://github.com/thevrushabhjain/Sarak-Website.git sarak-admin
cd sarak-admin
git switch -c feat/admin-foundation
```

Expected: `Switched to a new branch 'feat/admin-foundation'`. Confirm `components/SarakSite.tsx` contains `/about` and `/blogs` routes (`grep "blogs" components/SarakSite.tsx` matches) — proving we are on current `main`, not the stale local snapshot.

- [ ] **Step 2: Copy the two documents in**

```bash
cp "D:/01. Vimaksh/Sarak/docs/superpowers/specs/2026-08-21-sarak-dynamic-admin-design.md" docs/superpowers/specs/
mkdir -p docs/superpowers/plans
cp "D:/01. Vimaksh/Sarak/docs/superpowers/plans/2026-08-21-sarak-foundation.md" docs/superpowers/plans/
```

- [ ] **Step 3: Commit**

```bash
git add docs && git commit -m "docs: add approved dynamic-admin design spec and foundation plan"
```

Expected: one commit, working tree clean (`git status --porcelain` empty).

---

### Task 2: API workspace scaffold with tested health route

**Files:**
- Modify: `package.json` (add workspaces field only — leave legacy scripts untouched)
- Modify: `pnpm-workspace.yaml`
- Create: `apps/api/package.json`, `apps/api/wrangler.jsonc`, `apps/api/tsconfig.json`
- Create: `apps/api/src/index.ts`, `apps/api/src/app.ts`
- Test: `apps/api/test/health.spec.ts`, `apps/api/vitest.config.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type Bindings = { DB: D1Database; MEDIA: R2Bucket; SARAK_BOOTSTRAP_TOKEN?: string }`; `createApp(env: Bindings): Hono` exported from `src/app.ts`; every later route module mounts onto it.

- [ ] **Step 1: Workspace wiring**

`pnpm-workspace.yaml` — append (keep existing `allowBuilds` block):

```yaml
packages:
  - apps/*
```

Root `package.json` — add inside top-level object (do not touch existing keys):

```json
"workspaces": ["apps/*"]
```

- [ ] **Step 2: Package manifests and config**

`apps/api/package.json`:

```json
{
  "name": "@sarak/api",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "dev": "wrangler dev",
    "deploy:dry": "wrangler deploy --dry-run --outdir=dist"
  },
  "dependencies": {
    "hono": "^4.6.14"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.8.19",
    "@cloudflare/workers-types": "^4.20250810.0",
    "typescript": "^5.9.3",
    "vitest": "~3.2.4",
    "wrangler": "^4.27.0"
  }
}
```

`apps/api/wrangler.jsonc`:

```jsonc
{
  "name": "sarak-api",
  "main": "src/index.ts",
  "compatibility_date": "2025-08-01",
  "d1_databases": [
    { "binding": "DB", "database_name": "sarak", "database_id": "placeholder-local" }
  ],
  "r2_buckets": [{ "binding": "MEDIA", "bucket_name": "sarak-media" }]
}
```

(`database_id` placeholder is never used by tests/local dev; replaced with the real id at first real deploy.)

`apps/api/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Write the failing health test**

`apps/api/vitest.config.ts`:

```ts
import defineWorkersConfig from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.jsonc" },
      },
    },
  },
});
```

`apps/api/test/health.spec.ts`:

```ts
import { SELF } from "cloudflare:test";

describe("GET /healthz", () => {
  it("returns ok", async () => {
    const res = await SELF.fetch("https://example.com/healthz");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
```

Run: `cd apps/api && pnpm install && pnpm test`
Expected: FAIL — `src/app.ts` does not exist / route 404.

- [ ] **Step 4: Minimal implementation**

`apps/api/src/app.ts`:

```ts
import { Hono } from "hono";

export type Bindings = {
  DB: D1Database;
  MEDIA: R2Bucket;
  SARAK_BOOTSTRAP_TOKEN?: string;
};

export function createApp(_env: Bindings) {
  const app = new Hono<{ Bindings: Bindings }>();
  app.get("/healthz", (c) => c.json({ ok: true }));
  return app;
}
```

`apps/api/src/index.ts`:

```ts
import { createApp } from "./app";

export default {
  fetch: (req, env, ctx) => createApp(env).fetch(req, env, ctx),
} satisfies ExportedHandler<Bindings>;
```

(Add `import type { Bindings } from "./app";` if your TS setup requires the explicit type reference.)

- [ ] **Step 5: Test passes**

Run: `pnpm test`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml apps/api
git commit -m "feat(api): scaffold Hono worker with tested health route"
```

---

### Task 3: D1 migration 0001 — auth tables

**Files:**
- Create: `apps/api/migrations/0001_auth.sql`
- Test: extend `apps/api/test/health.spec.ts`

**Interfaces:**
- Produces: tables `users`, `sessions`, `recovery_codes`, `login_attempts` with the exact columns below; Task 5's queries depend on these names.

- [ ] **Step 1: Write migration**

`apps/api/migrations/0001_auth.sql`:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','editor')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  disabled_at INTEGER
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE TABLE recovery_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  code_hash TEXT NOT NULL UNIQUE,
  used_at INTEGER
);
CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_norm TEXT NOT NULL,
  ip TEXT NOT NULL,
  at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_attempts_email_time ON login_attempts(email_norm, at);
CREATE INDEX idx_attempts_ip_time ON login_attempts(ip, at);
```

- [ ] **Step 2: Failing schema test**

Append to `apps/api/test/health.spec.ts`:

```ts
describe("schema 0001", () => {
  it("has auth tables", async () => {
    const db = (await import("cloudflare:test")).env.DB;
    await db.exec("SELECT 1 FROM users LIMIT 1").catch(() => {});
    const rows = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    ).all<{ name: string }>();
    const names = rows.results.map((r) => r.name);
    expect(names).toContain("users");
    expect(names).toContain("sessions");
    expect(names).toContain("recovery_codes");
    expect(names).toContain("login_attempts");
  });
});
```

Add to `vitest.config.ts` inside `poolOptions.workers` so migrations apply per test run:

```ts
miniflare: {
  d1Databases: { DB: { results: {} } },
},
migrations: { path: "./migrations", apply: true },
```

Run: `pnpm test`
Expected: FAIL before migrations wiring is correct; PASS once config picks up `migrations/`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/migrations/0001_auth.sql apps/api/vitest.config.ts apps/api/test/health.spec.ts
git commit -m "feat(api): d1 migration for auth tables"
```

---

### Task 4: Crypto module — PBKDF2 passwords, tokens, timing-safe compare

**Files:**
- Create: `apps/api/src/lib/crypto.ts`
- Test: `apps/api/test/crypto.spec.ts`

**Interfaces:**
- Produces (used by Tasks 5–7, imported as `import * as c from "../src/lib/crypto"`):
  - `sha256Hex(input: string): Promise<string>`
  - `generateToken(): string` // 32 random bytes → base64url
  - `hashPassword(pw: string): Promise<string>` // `pbkdf2$100000$<saltB64url>$<keyB64url>`
  - `verifyPassword(pw: string, stored: string): Promise<boolean>`
  - `timingSafeEq(a: string, b: string): boolean`
  - `hashCode(code: string): Promise<string>` // alias of sha256Hex, kept for readability

- [ ] **Step 1: Failing tests**

`apps/api/test/crypto.spec.ts`:

```ts
import * as c from "../src/lib/crypto";

describe("crypto", () => {
  it("hashes then verifies a password", async () => {
    const stored = await c.hashPassword("correct horse battery staple");
    expect(stored.startsWith("pbkdf2$100000$")).toBe(true);
    expect(await c.verifyPassword("correct horse battery staple", stored)).toBe(true);
    expect(await c.verifyPassword("wrong", stored)).toBe(false);
  });

  it("produces unique salts", async () => {
    const a = await c.hashPassword("same");
    const b = await c.hashPassword("same");
    expect(a).not.toBe(b);
  });

  it("compares strings in constant time semantics", () => {
    expect(c.timingSafeEq("abc", "abc")).toBe(true);
    expect(c.timingSafeEq("abc", "abd")).toBe(false);
    expect(c.timingSafeEq("abc", "abcd")).toBe(false);
  });

  it("tokens are unique and urlsafe", async () => {
    const t1 = await c.generateToken();
    const t2 = await c.generateToken();
    expect(t1).not.toBe(t2);
    expect(t1).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("sha256Hex is deterministic", async () => {
    expect(await c.sha256Hex("x")).toBe(await c.sha256Hex("x"));
  });
});
```

Run: `pnpm test`
Expected: FAIL — module not found.

- [ ] **Step 2: Implementation**

`apps/api/src/lib/crypto.ts`:

```ts
const ITERATIONS = 100_000;

function toB64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
}

async function pbkdf2(pw: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: ITERATIONS },
    key, 256,
  );
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(input),
  );
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const hashCode = sha256Hex;

export function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function generateToken(): Promise<string> {
  return toB64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await pbkdf2(pw, salt);
  return `pbkdf2$${ITERATIONS}$${toB64url(salt)}$${toB64url(bits)}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [scheme, iterStr, saltB64, keyB64] = stored.split("$");
  if (scheme !== "pbkdf2") return false;
  if (Number(iterStr) !== ITERATIONS) return false;
  const derived = toB64url(await pbkdf2(pw, fromB64url(saltB64)));
  return timingSafeEq(derived, keyB64);
}
```

- [ ] **Step 3: Tests pass, commit**

Run: `pnpm test`
Expected: all PASS.

```bash
git add apps/api/src/lib/crypto.ts apps/api/test/crypto.spec.ts
git commit -m "feat(api): pbkdf2 password hashing and token utilities"
```

---

### Task 5: Auth routes — bootstrap, login (+rate limits), logout, me, recover

**Files:**
- Create: `apps/api/src/routes/auth.ts`, `apps/api/src/lib/http.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/test/auth.spec.ts`

**Interfaces:**
- Consumes: Task 3 schema, Task 4 crypto exports.
- Produces routes mounted at `/admin/auth`:
  - `POST /admin/auth/bootstrap` `{email,password}` + header `Authorization: Bearer $SARAK_BOOTSTRAP_TOKEN` → `201 {user:{id,email,role},recovery_codes:string[10]}`; second call `409 {error:"already_bootstrapped"}`; wrong token `403`.
  - `POST /admin/auth/login` `{email,password}` → `200 {user}` + `Set-Cookie: sarak_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`; failures below.
  - `POST /admin/auth/logout` → clears cookie, deletes session row, `204`.
  - `GET /admin/auth/me` (cookie session) → `200 {id,email,role}` or `401`.
  - `POST /admin/auth/recover` `{code,new_password}` → `204` on valid unused code; `400 {error:"invalid_code"}` otherwise.
  - Error contract: `401 {error:"invalid_credentials"}`, `429 {error:"rate_limited"}`.
- Helper `requireSession(c)` in `http.ts` returning `user` row or throwing 401 response (reused by Tasks 6–7).

- [ ] **Step 1: Failing tests**

`apps/api/test/auth.spec.ts`:

```ts
import { SELF, env } from "cloudflare:test";

const BOOT = { Authorization: "Bearer test-bootstrap-token" };

async function bootstrapOwner() {
  return SELF.fetch("https://example.com/admin/auth/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...BOOT },
    body: JSON.stringify({ email: "owner@sarak.org", password: "OwnerPass!234" }),
  });
}

describe("bootstrap", () => {
  it("creates owner exactly once and returns 10 recovery codes", async () => {
    const res = await bootstrapOwner();
    expect(res.status).toBe(201);
    const body = await res.json<any>();
    expect(body.user.role).toBe("owner");
    expect(body.recovery_codes).toHaveLength(10);

    const again = await bootstrapOwner();
    expect(again.status).toBe(409);
  });

  it("rejects wrong bearer", async () => {
    const res = await SELF.fetch("https://example.com/admin/auth/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer nope" },
      body: JSON.stringify({ email: "x@y.z", password: "whatever123" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("login + sessions", () => {
  it("logs in with valid credentials and exposes me", async () => {
    const login = await SELF.fetch("https://example.com/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@sarak.org", password: "OwnerPass!234" }),
    });
    expect(login.status).toBe(200);
    const cookie = login.headers.get("set-cookie")!;
    expect(cookie).toContain("sarak_session=");
    expect(cookie).toContain("HttpOnly");

    const me = await SELF.fetch("https://example.com/admin/auth/me", {
      headers: { cookie: cookie.split(";")[0] },
    });
    expect((await me.json<any>()).role).toBe("owner");

    const out = await SELF.fetch("https://example.com/admin/auth/logout", {
      method: "POST", headers: { cookie: cookie.split(";")[0] },
    });
    expect(out.status).toBe(204);

    const meAfter = await SELF.fetch("https://example.com/admin/auth/me", {
      headers: { cookie: cookie.split(";")[0] },
    });
    expect(meAfter.status).toBe(401);
  });

  it("rate limits after 10 bad attempts per account", async () => {
    for (let i = 0; i < 10; i++) {
      await SELF.fetch("https://example.com/admin/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "owner@sarak.org", password: "bad" + i }),
      });
    }
    const res = await SELF.fetch("https://example.com/admin/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@sarak.org", password: "OwnerPass!234" }),
    });
    expect(res.status).toBe(429);
  });
});

describe("recovery", () => {
  it("consumes one recovery code and resets password", async () => {
    const boot = await env.DB.prepare(
      "SELECT id FROM users WHERE email='owner@sarak.org'",
    ).first<{ id: string }>();
    const codeRow = await env.DB.prepare(
      "SELECT code_hash FROM recovery_codes WHERE user_id=? AND used_at IS NULL LIMIT 1",
    ).bind(boot!.id).first<{ code_hash: string }>();

    // We cannot invert the hash; recover endpoint must accept the PLAINTEXT code.
    // So instead assert failure shape for garbage, and success path via a known
    // code inserted by calling bootstrap in a fresh isolate is not possible here.
    // Therefore: verify invalid-code contract only; plaintext roundtrip is proven
    // in Task 6's integration check against the printed codes.
    const bad = await SELF.fetch("https://example.com/admin/auth/recover", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "AAAA-BBBB-CCCC-DDDD", new_password: "NewPass!234" }),
    });
    expect(bad.status).toBe(400);
    void codeRow;
  });
});
```

Note captured honestly above: unit-level plaintext roundtrip needs the bootstrap response; the subagent executing Task 5 must thread the codes from the bootstrap response into a recover assertion inside the same test file (replace the placeholder paragraph comment with a real second `it` that calls `/recover` with `body.recovery_codes[0]`). This is required — do not ship without it.

Also add `"SARAK_BOOTSTRAP_TOKEN": "test-bootstrap-token"` to the vitest miniflare bindings block added in Task 3.

Run: `pnpm test`
Expected: FAIL — routes don't exist yet.

- [ ] **Step 2: Implement helpers and routes**

`apps/api/src/lib/http.ts`:

```ts
import type { Context } from "hono";
import type { Bindings } from "../app";

export type UserRow = {
  id: string; email: string; role: "owner" | "editor";
};

export async function requireSession(c: Context<{ Bindings: Bindings }>): Promise<UserRow> {
  const cookie = c.req.header("cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)sarak_session=([A-Za-z0-9_-]+)/);
  if (!m) throw c.json({ error: "unauthorized" }, 401);
  const tokenHash = await import("./crypto").then((x) => x.sha256Hex(m[1]));
  const row = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.role FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > unixepoch() AND u.disabled_at IS NULL`,
  ).bind(tokenHash).first<UserRow>();
  if (!row) throw c.json({ error: "unauthorized" }, 401);
  return row;
}
```

`apps/api/src/routes/auth.ts`:

```ts
import { Hono } from "hono";
import type { Bindings } from "../app";
import * as crypto from "../lib/crypto";
import { requireSession, type UserRow } from "../lib/http";

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days
const WINDOW_EMAIL = 15 * 60, MAX_PER_EMAIL = 10;
const WINDOW_IP = 60 * 60, MAX_PER_IP = 50;

function genRecoveryCode(): string {
  const hex = crypto.getRandomValues(new Uint8Array(8));
  const h = [...hex].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}`;
}

async function newId(): Promise<string> {
  return crypto.randomUUID();
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
    const id = await newId();
    await c.env.DB.prepare(
      "INSERT INTO users (id,email,password_hash,role) VALUES (?,?,?,'owner')",
    ).bind(id, norm, await crypto.hashPassword(password)).run();

    const codes: string[] = [];
    for (let i = 0; i < 10; i++) codes.push(genRecoveryCode());
    for (const code of codes) {
      await c.env.DB.prepare(
        "INSERT INTO recovery_codes (id,user_id,code_hash) VALUES (?,?,?)",
      ).bind(await newId(), id, await crypto.hashCode(code)).run();
    }
    return c.json({ user: { id, email: norm, role: "owner" }, recovery_codes: codes }, 201);
  });

  app.post("/login", async (c) => {
    const ip = c.req.header("cf-connecting-ip") ?? "test";
    const { email, password } = await c.req.json<{ email: string; password: string }>();
    const norm = email.trim().toLowerCase();

    const byEmail = await c.env.DB.prepare(
      "SELECT COUNT(*) AS n FROM login_attempts WHERE email_norm=? AND at > unixepoch()-?",
    ).bind(norm, WINDOW_EMAIL).first<number>()!;
    if ((byEmail?.n ?? 0) >= MAX_PER_EMAIL) return c.json({ error: "rate_limited" }, 429);
    const byIp = await c.env.DB.prepare(
      "SELECT COUNT(*) AS n FROM login_attempts WHERE ip=? AND at > unixepoch()-?",
    ).bind(ip, WINDOW_IP).first<number>();
    if ((byIp?.n ?? 0) >= MAX_PER_IP) return c.json({ error: "rate_limited" }, 429);

    const user = await c.env.DB.prepare(
      "SELECT id,password_hash,role FROM users WHERE email=? AND disabled_at IS NULL",
    ).bind(norm).first<{ id: string; password_hash: string; role: "owner" | "editor" }>();

    const fail = async () => {
      await c.env.DB.prepare(
        "INSERT INTO login_attempts (email_norm,ip) VALUES (?,?)",
      ).bind(norm, ip).run();
      return c.json({ error: "invalid_credentials" }, 401);
    };
    if (!user || !(await crypto.verifyPassword(password, user.password_hash))) return fail();

    const token = await crypto.generateToken();
    await c.env.DB.prepare(
      "INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,unixepoch()+?)",
    ).bind(await crypto.sha256Hex(token), user.id, SESSION_TTL).run();
    c.header(
      "set-cookie",
      `sarak_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL}`,
    );
    return c.json({ user: { id: user.id, email: norm, role: user.role } });
  });

  app.post("/logout", async (c) => {
    const cookie = c.req.header("cookie") ?? "";
    const m = cookie.match(/(?:^|;\s*)sarak_session=([A-Za-z0-9_-]+)/);
    if (m) {
      await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
        .bind(await crypto.sha256Hex(m[1])).run();
    }
    c.header("set-cookie", "sarak_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0");
    return c.body(null, 204);
  });

  app.get("/me", async (c) => {
    const user = await requireSession(c);
    return c.json(user satisfies UserRow);
  });

  app.post("/recover", async (c) => {
    const { code, new_password } = await c.req.json<{ code: string; new_password: string }>();
    const hash = await crypto.hashCode(code.trim().toUpperCase());
    const row = await c.env.DB.prepare(
      "SELECT id,user_id FROM recovery_codes WHERE code_hash=? AND used_at IS NULL",
    ).bind(hash).first<{ id: string; user_id: string }>();
    if (!row) return c.json({ error: "invalid_code" }, 400);

    const batch: D1PreparedStatement[] = [
      c.env.DB.prepare("UPDATE recovery_codes SET used_at=unixepoch() WHERE id=?").bind(row.id),
      c.env.DB.prepare("UPDATE users SET password_hash=? WHERE id=?")
        .bind(await crypto.hashPassword(new_password), row.user_id),
      c.env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(row.user_id),
    ];
    await c.env.DB.batch(batch);
    return c.body(null, 204);
  });

  return app;
}
```

Modify `apps/api/src/app.ts` — mount routes:

```ts
import { Hono } from "hono";
import { authRoutes } from "./routes/auth";

export type Bindings = {
  DB: D1Database;
  MEDIA: R2Bucket;
  SARAK_BOOTSTRAP_TOKEN?: string;
};

export function createApp(_env: Bindings) {
  const app = new Hono<{ Bindings: Bindings }>();
  app.get("/healthz", (c) => c.json({ ok: true }));
  app.route("/admin/auth", authRoutes());
  return app;
}
```

- [ ] **Step 3: Tests pass**

Run: `pnpm test`
Expected: all auth tests PASS including the plaintext-code recover roundtrip you threaded through the bootstrap response.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src apps/api/test
git commit -m "feat(api): admin auth with bootstrap, sessions, rate limits, recovery codes"
```

---

### Task 6: D1 migration 0002 — media + public content tables

**Files:**
- Create: `apps/api/migrations/0002_content_media.sql`
- Test: extend `apps/api/test/health.spec.ts`

**Interfaces:**
- Produces: `media`, `activities`, `programs`, `news` tables consumed by Tasks 7–8. Forms/submissions/inboxes/revisions/gallery tables are deliberately deferred to Plan 2/Plan 3 — do not add them here.

- [ ] **Step 1: Migration**

`apps/api/migrations/0002_content_media.sql`:

```sql
CREATE TABLE media (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  mime TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  alt TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft','published','unpublished','trashed')),
  prev_status TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE programs (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  open INTEGER NOT NULL DEFAULT 1,
  deadline_text TEXT NOT NULL DEFAULT '',
  form_id TEXT,
  status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft','published','unpublished','trashed')),
  prev_status TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE news (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  published_at INTEGER,
  status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft','published','unpublished','trashed')),
  prev_status TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

- [ ] **Step 2: Schema assertion**

Append to `apps/api/test/health.spec.ts` inside the schema describe:

```ts
it("has content and media tables", async () => {
  const db = (await import("cloudflare:test")).env.DB;
  const rows = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table'",
  ).all<{ name: string }>();
  const names = rows.results.map((r) => r.name);
  expect(names).toEqual(expect.arrayContaining(["media","activities","programs","news"]));
});
```

Run: `pnpm test` — Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/api/migrations/0002_content_media.sql apps/api/test/health.spec.ts
git commit -m "feat(api): d1 migration for media and public content tables"
```

---

### Task 7: Media upload (auth-gated, sniffed, capped) + served reads

**Files:**
- Create: `apps/api/src/routes/media.ts`, `apps/api/src/lib/sniff.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/test/media.spec.ts`

**Interfaces:**
- Consumes: `requireSession`, `media` table, `MEDIA` R2 binding.
- Produces: `sniffImageType(bytes: Uint8Array): "jpeg"|"png"|"webp"|null`; `POST /admin/media` multipart field `file` → `201 {id,key,mime,bytes,url}` (url = `/media/<key>`); `GET /media/<key..>` streams object with `Cache-Control: public, max-age=31536000, immutable`; rejects: non-image `415 {error:"unsupported_type"}`, oversize `413 {error:"too_large"}`, unauthenticated `401`. Cap constant `MAX_IMAGE_BYTES = 10 * 1024 * 1024`.

- [ ] **Step 1: Failing tests**

`apps/api/test/media.spec.ts`:

```ts
import { SELF } from "cloudflare:test";

async function sessionCookie(email = "owner@sarak.org", password = "OwnerPass!234") {
  const res = await SELF.fetch("https://example.com/admin/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.headers.get("set-cookie")!.split(";")[0];
}

function pngBytes(n = 100): Uint8Array {
  const b = new Uint8Array(n);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  return b;
}

describe("media upload", () => {
  it("rejects anonymous uploads", async () => {
    const fd = new FormData();
    fd.append("file", new Blob([pngBytes()]), "x.png");
    const res = await SELF.fetch("https://example.com/admin/media", { method: "POST", body: fd });
    expect(res.status).toBe(401);
  });

  it("stores png and serves it back", async () => {
    const cookie = await sessionCookie();
    const fd = new FormData();
    fd.append("file", new Blob([pngBytes()], { type: "image/png" }), "photo.png");
    const up = await SELF.fetch("https://example.com/admin/media", {
      method: "POST", body: fd, headers: { cookie },
    });
    expect(up.status).toBe(201);
    const body = await up.json<any>();
    expect(body.mime).toBe("image/png");

    const get = await SELF.fetch(`https://example.com${body.url}`);
    expect(get.status).toBe(200);
    expect(get.headers.get("content-type")).toBe("image/png");
    expect(get.headers.get("cache-control")).toContain("immutable");
  });

  it("rejects svg masquerading as png", async () => {
    const cookie = await sessionCookie();
    const svg = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>");
    const fd = new FormData();
    fd.append("file", new Blob([svg], { type: "image/svg+xml" }), "evil.png");
    const res = await SELF.fetch("https://example.com/admin/media", {
      method: "POST", body: fd, headers: { cookie },
    });
    expect(res.status).toBe(415);
  });

  it("rejects files over 10MB", async () => {
    const cookie = await sessionCookie();
    const big = pngBytes(10 * 1024 * 1024 + 1);
    const fd = new FormData();
    fd.append("file", new Blob([big], { type: "image/png" }), "big.png");
    const res = await SELF.fetch("https://example.com/admin/media", {
      method: "POST", body: fd, headers: { cookie },
    });
    expect(res.status).toBe(413);
  });
});
```

Run: `pnpm test` — Expected: FAIL (no routes).

- [ ] **Step 2: Implement sniff + routes**

`apps/api/src/lib/sniff.ts`:

```ts
export type ImageType = "jpeg" | "png" | "webp";

export function sniffImageType(b: Uint8Array): ImageType | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length >= 8 &&
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "png";
  if (b.length >= 12 &&
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp";
  return null;
}
```

`apps/api/src/routes/media.ts`:

```ts
import { Hono } from "hono";
import type { Bindings } from "../app";
import { requireSession } from "../lib/http";
import { sniffImageType } from "../lib/sniff";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MIME: Record<string, string> = {
  jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
};
const EXT: Record<string, string> = { jpeg: "jpg", png: "png", webp: "webp" };

export function mediaRoutes() {
  const app = new Hono<{ Bindings: Bindings }>();

  app.post("/", async (c) => {
    try { await requireSession(c); } catch { return c.json({ error: "unauthorized" }, 401); }

    const form = await c.req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return c.json({ error: "missing_file" }, 400);
    if (file.size > MAX_IMAGE_BYTES) return c.json({ error: "too_large" }, 413);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniffImageType(bytes);
    if (!kind) return c.json({ error: "unsupported_type" }, 415);

    const key = `m/${crypto.randomUUID()}.${EXT[kind]}`;
    await c.env.MEDIA.put(key, bytes);
    const id = crypto.randomUUID();
    const alt = (form.get("alt") as string) ?? "";
    await c.env.DB.prepare(
      "INSERT INTO media (id,key,mime,bytes,alt,created_by) VALUES (?,?,?,?,?,?)",
    ).bind(id, key, MIME[kind], bytes.byteLength, alt, null).run();

    return c.json({
      id, key, mime: MIME[kind], bytes: bytes.byteLength, url: `/media/${key}`,
    }, 201);
  });

  app.get("/:key{.+}", async (c) => {
    const obj = await c.env.MEDIA.get(c.req.param("key"));
    if (!obj) return c.text("not found", 404);
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    return new Response(obj.body, { headers });
  });

  return app;
}
```

Mount in `app.ts`: `app.route("/admin/media", mediaRoutes()); app.route("/media", mediaRoutes());` — note the GET subroute works for both mounts since GET has no auth guard; POST `/admin/media` is guarded, and the `/media` mount's POST would also be guarded (fine).

- [ ] **Step 3: Tests pass, commit**

Run: `pnpm test` — Expected: PASS.

```bash
git add apps/api/src apps/api/test
git commit -m "feat(api): r2 media upload with magic-byte allowlist and served reads"
```

---

### Task 8: Public content reads — published-only collections

**Files:**
- Create: `apps/api/src/routes/content.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/test/content.spec.ts`

**Interfaces:**
- Produces: `GET /api/collections/:name` where `name ∈ {activities,programs,news}` → `200 [...]` published rows ordered by `sort ASC, created_at DESC`, header `Cache-Control: public, s-maxage=30`; unknown collection `404 {error:"unknown_collection"}`. This is the stable contract Plans 3–5 consume.

- [ ] **Step 1: Failing test**

`apps/api/test/content.spec.ts`:

```ts
import { SELF, env } from "cloudflare:test";

describe("public collections", () => {
  it("returns only published activities", async () => {
    await env.DB.prepare(
      `INSERT INTO activities (id,slug,title,status) VALUES
       ('a1','pub-one','Published One','published'),
       ('a2','draft-one','Draft One','draft')`,
    ).run();
    const res = await SELF.fetch("https://example.com/api/collections/activities");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage=30");
    const rows = await res.json<any[]>();
    expect(rows.map((r) => r.slug)).toEqual(["pub-one"]);
  });

  it("404s unknown collections", async () => {
    const res = await SELF.fetch("https://example.com/api/collections/users");
    expect(res.status).toBe(404);
  });
});
```

Run: `pnpm test` — Expected: FAIL.

- [ ] **Step 2: Implementation**

`apps/api/src/routes/content.ts`:

```ts
import { Hono } from "hono";
import type { Bindings } from "../app";

const COLLECTIONS: Record<string, string> = {
  activities: "SELECT id,slug,title,tag,image_url,description FROM activities",
  programs: "SELECT id,slug,title,image_url,description,open,deadline_text FROM programs",
  news: "SELECT id,slug,title,image_url,excerpt,published_at FROM news",
};

export function contentRoutes() {
  const app = new Hono<{ Bindings: Bindings }>();

  app.get("/collections/:name", async (c) => {
    const base = COLLECTIONS[c.req.param("name")];
    if (!base) return c.json({ error: "unknown_collection" }, 404);
    const { results } = await c.env.DB.prepare(
      `${base} WHERE status='published' ORDER BY sort ASC, created_at DESC`,
    ).all();
    c.header("cache-control", "public, s-maxage=30");
    return c.json(results);
  });

  return app;
}
```

Mount: `app.route("/api", contentRoutes());`

- [ ] **Step 3: Pass + commit**

Run: `pnpm test` — Expected: PASS.

```bash
git add apps/api/src apps/api/test
git commit -m "feat(api): published-only public collection reads"
```

---

### Task 9: Legacy content import script

**Files:**
- Create: `apps/api/scripts/import-legacy.ts`, `apps/api/scripts/run-import.sh`

**Interfaces:**
- Consumes: root legacy `lib/data.ts` exports (`activities`, `programs`) from GitHub `main`.
- Produces: `migrations/seeds/0003_legacy.sql` inserting those records as `status='published'` with identical slugs; console prints source vs inserted counts.

- [ ] **Step 1: Script**

`apps/api/scripts/import-legacy.ts`:

```ts
import { writeFileSync } from "node:fs";
// Root-of-repo legacy module (single-package Next.js app still lives at root).
import { activities, programs } from "../../lib/data";

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

const lines: string[] = [];
for (const [i, a] of activities.entries()) {
  lines.push(
    `INSERT OR REPLACE INTO activities (id,slug,title,tag,image_url,description,status,sort)
     VALUES (${q("act-" + a.slug)},${q(a.slug)},${q(a.title)},${q(a.tag)},${q(a.image)},${q(a.description)},'published',${i});`,
  );
}
for (const [i, p] of programs.entries()) {
  lines.push(
    `INSERT OR REPLACE INTO programs (id,slug,title,image_url,description,open,deadline_text,status,sort)
     VALUES (${q("prg-" + p.slug)},${q(p.slug)},${q(p.title)},${q(p.image)},${q(p.description)},${p.state === "open" ? 1 : 0},${q(p.deadline)},'published',${i});`,
  );
}
writeFileSync(new URL("../migrations/seeds/0003_legacy.sql", import.meta.url), lines.join("\n") + "\n");
console.log(`activities=${activities.length} programs=${programs.length}`);
```

`apps/api/scripts/run-import.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
pnpm exec tsx import-legacy.ts
npx wrangler d1 execute sarak --local --file ../migrations/seeds/0003_legacy.sql
npx wrangler d1 execute sarak --local --command \
  "SELECT (SELECT COUNT(*) FROM activities) AS a,(SELECT COUNT(*) FROM programs) AS p"
```

Add devDependency `tsx` (`pnpm add -D tsx`) and chmod +x the shell script.

- [ ] **Step 2: Run and verify counts**

```bash
mkdir -p migrations/seeds && bash scripts/run-import.sh
```

Expected output: printed source counts match final SELECT counts exactly (a == activities.length, p == programs.length). If remote `main` renamed exports, fix the import statement to match actual names — never edit legacy data.

- [ ] **Step 3: Commit**

```bash
git add apps/api/scripts apps/api/migrations/seeds apps/api/package.json pnpm-lock.yaml
git commit -m "feat(api): import legacy activities/programs as published seeds"
```

---

### Task 10: Build gate + deploy readiness

**Files:**
- Modify: `apps/api/package.json` (script already present)

**Interfaces:**
- Produces: reproducible proof the worker bundles; the exact real-deploy command for the owner.

- [ ] **Step 1: Typecheck + dry-run bundle**

```bash
cd apps/api
pnpm exec tsc --noEmit
pnpm run deploy:dry
```

Expected: `tsc` exit 0; wrangler prints `Total Upload: ... KiB / gzip: ...` and exits 0.

- [ ] **Step 2: Full suite one last time**

```bash
pnpm test
```

Expected: every test file PASS.

- [ ] **Step 3: Commit + push branch**

```bash
git add -A
git commit -m "chore(api): build gate passes" --allow-empty
git push -u origin feat/admin-foundation
```

Expected: push succeeds; open PR titled `feat: admin foundation (API, auth, media, seeds)` linking Linear `VIM4-157`, `VIM4-158`.

Real deploy (owner-run, needs Cloudflare account): create D1 `sarak` + R2 `sarak-media`, replace `database_id` in `wrangler.jsonc`, then `npx wrangler deploy` and set secret `SARAK_BOOTSTRAP_TOKEN`; run bootstrap once and store the printed recovery codes offline.

---

## Self-Review (done against spec)

- **Spec coverage (Plan-1 slice):** auth/accounts/recovery/rate-limits (Security Boundaries, Owner Recovery) → Tasks 3–5; media rules incl. magic-byte allowlist, 10 MB cap, generated keys, private bucket (Media Validation) → Tasks 6–7; published-only reads + cache headers baseline (Publishing) → Task 8; legacy import with slug stability (Migration gate 1 prerequisite) → Task 9; portable no-Vercel-specific deps (Architecture) → whole plan. Remaining spec sections map to Plans 2–6 as listed in the header.
- **Placeholder scan:** one intentional flagged spot in Task 5 Step 1 — the recover-roundtrip test must be completed by threading bootstrap's printed codes; called out in bold with a hard instruction, not a silent TBD.
- **Type consistency:** `Bindings` shape identical in Tasks 2/5/7; `requireSession` signature reused verbatim; `sniffImageType`/constants named identically across test and implementation; collection route paths match Plans 3–5 contract line.
