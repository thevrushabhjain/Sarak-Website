import { Hono } from "hono";
import type { Context } from "hono";
import type { Bindings } from "../app";
import {
  validateAgainstSchema,
  type Field,
} from "../lib/validate-submission";

// Public, UNAUTHENTICATED submission endpoints. Every request is a potential
// bot, so both routes run the same abuse-guard chain (in this order) before
// any validation or storage:
//   1. Turnstile   — only when env.TURNSTILE_SECRET is configured (unset in
//                    dev/tests, so verification is skipped there entirely);
//                    verified against Cloudflare siteverify BEFORE all guards.
//   2. Honeypot    — hidden `website` input non-empty ⇒ silent 204 spam sink
//                    (no attempt row, nothing to learn from).
//   3. Timing      — fewer than 3s between page load and submit ⇒ too_fast.
//   4. Size        — raw body over 32KB ⇒ too_large.
//   5. Rate limits — 20/hour per IP across buckets and 10/hour per
//                    (ip,bucket), counted in submission_attempts. The attempt
//                    row lands once a request survives the cheap guards, so
//                    schema-probing costs quota too.
// Only then: payload validation (400) and the insert (201 {id}).

const TOO_FAST_MS = 3000;
const MAX_BODY_BYTES = 32 * 1024;
const WINDOW_SECONDS = 60 * 60;
const MAX_PER_IP = 20;
const MAX_PER_BUCKET = 10;

// The enquiry form has no admin-managed schema: these five fields ARE the
// contract (* = required).
const ENQUIRY_FIELDS: Field[] = [
  { key: "name", type: "text", label: "Name", required: true },
  { key: "email", type: "email", label: "Email", required: true },
  { key: "phone", type: "phone", label: "Phone" },
  { key: "subject", type: "text", label: "Subject", required: true },
  { key: "message", type: "long-text", label: "Message", required: true },
];

type Env = { Bindings: Bindings };
type Ctx = Context<Env>;

function clientIp(c: Ctx): string {
  return c.req.header("cf-connecting-ip") ?? "test";
}

// Parses the request envelope once; returns null for non-JSON or non-object
// bodies (arrays included).
async function readJsonObject(c: Ctx): Promise<{ raw: ArrayBuffer; body: Record<string, unknown> } | null> {
  const raw = await c.req.arrayBuffer();
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(raw));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return { raw, body: parsed as Record<string, unknown> };
  } catch {
    return null;
  }
}

type Guarded = { answers: Record<string, unknown> };

// Returns a final Response when a guard trips, else the answers bag.
// `raw` carries the exact bytes received (the size guard needs the pre-parse
// length); `bucket` is the rate-limit namespace: program slug or 'enquiry'.
async function runGuards(
  c: Ctx,
  raw: ArrayBuffer,
  body: Record<string, unknown>,
  bucket: string,
): Promise<Response | Guarded> {
  // 1. Turnstile: a configured secret turns verification on; without one the
  //    check is fully skipped (documented dev/test behavior).
  if (c.env.TURNSTILE_SECRET) {
    const token = body.turnstileToken;
    if (typeof token !== "string" || token === "") {
      return c.json({ error: "turnstile_required" }, 400);
    }
    const verdict = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: c.env.TURNSTILE_SECRET,
          response: token,
        }),
      },
    )
      .then((res) => res.json<{ success: boolean }>())
      .catch(() => null);
    if (!verdict?.success) return c.json({ error: "turnstile_failed" }, 403);
  }

  // 2. Honeypot: humans never see (let alone fill) the hidden field.
  if (body.website) return c.body(null, 204);

  // 3. Timing: startedAt is part of the pinned body contract.
  const startedAt = body.startedAt;
  if (typeof startedAt !== "number" || !Number.isFinite(startedAt)) {
    return c.json({ error: "invalid_body" }, 400);
  }
  if (Date.now() - startedAt < TOO_FAST_MS) {
    return c.json({ error: "too_fast" }, 400);
  }

  // 4. Size: measured on the raw bytes, not re-serialized JSON.
  if (raw.byteLength > MAX_BODY_BYTES) {
    return c.json({ error: "too_large" }, 413);
  }

  // 5. Rate limits: IP-wide ceiling first, then per-bucket.
  const ip = clientIp(c);
  const byIp = await c.env.DB.prepare(
    "SELECT COUNT(*) AS n FROM submission_attempts WHERE ip = ? AND at > unixepoch() - ?",
  ).bind(ip, WINDOW_SECONDS).first<number>("n");
  const byBucket = await c.env.DB.prepare(
    "SELECT COUNT(*) AS n FROM submission_attempts WHERE ip = ? AND bucket = ? AND at > unixepoch() - ?",
  ).bind(ip, bucket, WINDOW_SECONDS).first<number>("n");
  if ((byIp ?? 0) >= MAX_PER_IP || (byBucket ?? 0) >= MAX_PER_BUCKET) {
    return c.json({ error: "rate_limited" }, 429);
  }
  await c.env.DB.prepare("INSERT INTO submission_attempts (ip, bucket) VALUES (?, ?)")
    .bind(ip, bucket)
    .run();

  const answers = body.answers;
  return {
    answers:
      answers !== null && typeof answers === "object" && !Array.isArray(answers)
        ? (answers as Record<string, unknown>)
        : {},
  };
}

export function submissionsPublicRoutes() {
  const app = new Hono<Env>();

  app.post("/register/:programSlug", async (c) => {
    const slug = c.req.param("programSlug");
    const program = await c.env.DB.prepare(
      "SELECT id, open, status FROM programs WHERE slug = ?",
    ).bind(slug).first<{ id: string; open: number; status: string }>();
    // One token for unknown / draft / unpublished / trashed / closed programs:
    // existence itself is not disclosed.
    if (!program || program.status !== "published" || program.open !== 1) {
      return c.json({ error: "not_accepting" }, 404);
    }

    // Latest published snapshot of the program's form (version > 0; version 0
    // is the admin working copy and never serves the public).
    const version = await c.env.DB.prepare(
      `SELECT fv.id, fv.schema_json FROM form_versions fv
       JOIN forms f ON f.id = fv.form_id
       WHERE f.program_id = ? AND f.status = 'published' AND fv.version > 0
       ORDER BY fv.version DESC LIMIT 1`,
    ).bind(program.id).first<{ id: string; schema_json: string }>();
    if (!version) return c.json({ error: "no_form" }, 404);

    let fields: unknown;
    try {
      fields = JSON.parse(version.schema_json);
    } catch {
      // A corrupt stored schema means there is no usable published form.
      return c.json({ error: "no_form" }, 404);
    }

    const parsed = await readJsonObject(c);
    if (!parsed) return c.json({ error: "invalid_body" }, 400);

    const guarded = await runGuards(c, parsed.raw, parsed.body, slug);
    if (guarded instanceof Response) return guarded;

    const check = validateAgainstSchema(fields as Field[], guarded.answers);
    if (!check.ok) return c.json({ error: check.error }, 400);

    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO submissions (id, kind, form_version_id, program_slug, payload_json, ip, user_agent)
       VALUES (?, 'registration', ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      version.id,
      slug,
      JSON.stringify(check.clean),
      clientIp(c),
      c.req.header("user-agent") ?? "",
    ).run();
    return c.json({ id }, 201);
  });

  app.post("/enquiry", async (c) => {
    const parsed = await readJsonObject(c);
    if (!parsed) return c.json({ error: "invalid_body" }, 400);

    const guarded = await runGuards(c, parsed.raw, parsed.body, "enquiry");
    if (guarded instanceof Response) return guarded;

    const check = validateAgainstSchema(ENQUIRY_FIELDS, guarded.answers);
    if (!check.ok) return c.json({ error: check.error }, 400);

    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO submissions (id, kind, payload_json, ip, user_agent)
       VALUES (?, 'enquiry', ?, ?, ?)`,
    ).bind(id, JSON.stringify(check.clean), clientIp(c), c.req.header("user-agent") ?? "").run();
    return c.json({ id }, 201);
  });

  return app;
}
