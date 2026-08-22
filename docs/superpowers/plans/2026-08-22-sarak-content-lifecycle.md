# Sarak Content Lifecycle Implementation Plan (Plan 2 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give editors draft/preview/publish/unpublish/trash/restore control over activities, programs, and news with revision history, plus owner-managed editor accounts, a versioned program form builder, public submissions with abuse guards, and separate inboxes — the editor-facing core of the Sarak platform.

**Architecture:** Same Worker (`apps/api`). Content rows keep base columns as the LIVE published state; editor edits write a `draft_json` overlay so the public site never mutates until an atomic publish (snapshot old row into `revisions`, apply draft, clear overlay). Forms freeze immutable `form_versions` at publish; submissions pin their answered version. Enquiries and registrations share one `submissions` table discriminated by `kind`. Public reads stay untouched (`/api/collections/*` already filters `status='published'`; `s-maxage=30` satisfies the p95<60s publish-latency target without extra invalidation machinery this plan).

**Tech Stack:** Unchanged — Hono, D1 raw SQL, R2, vitest-pool-workers, WebCrypto.

**Linear:** `VIM4-159` (manage activities/programs/news — reopened scope: also delivers owner-managed editor accounts originally promised by `VIM4-158`), `VIM4-162` (forms + inbox).

**Branch:** `feat/content-lifecycle` (cut from post-merge main `1d36895`).

## Global Constraints (bind every task)

- State machine exactly: draft → published → unpublished → published … ; any live state → trashed; trashed → previous state via restore. No other transitions.
- Edits never mutate the live record; publish is atomic; failed publish leaves prior version fully live.
- Slugs set once at creation, immutable afterward, duplicates rejected 409 `{error:"slug_taken"}`.
- Prior published versions retained; restore creates a DRAFT, publishing it is separate.
- Program open/closed toggle independent of lifecycle; closing keeps existing submissions.
- Owner-only: account create/disable/reset, bulk inbox purge. Editors: everything else here.
- Form field types allowed: text, email, phone, number, date, single-choice, multi-choice, consent, long-text. Choice options ≤20. No file uploads.
- Submission abuse limits: 20/IP/hour and 10/form(or enquiry-endpoint)/hour → `429 {error:"rate_limited"}`; hidden honeypot field `website` must be empty; `startedAt` ≥3s before submit; payload cap 32 KB; server-side validation rejects unknown fields, bad types, unchecked consent.
- Submissions retained until deleted; delete = soft trash (`trashed_at`); bulk purge = owner-only hard delete.
- Sessions/auth patterns from Plan 1 bind everywhere (`requireSession`, role checks server-side).
- Dates stored unixepoch; display timezone is later plans' concern.

---

### Task 1: Migration 0005 — lifecycle, forms, inbox tables

**Files:**
- Create: `apps/api/migrations/0005_lifecycle.sql`

**Interfaces:**
- Produces: `draft_json TEXT` + `published_at INTEGER` on activities/programs/news; tables `revisions`, `forms`, `form_versions`, `submissions` consumed by Tasks 2–7.

- [ ] **Step 1: Write migration**

```sql
ALTER TABLE activities ADD COLUMN draft_json TEXT;
ALTER TABLE activities ADD COLUMN published_at INTEGER;
ALTER TABLE programs ADD COLUMN draft_json TEXT;
ALTER TABLE programs ADD COLUMN published_at INTEGER;
ALTER TABLE news ADD COLUMN draft_json TEXT;
ALTER TABLE news ADD COLUMN published_at INTEGER;

CREATE TABLE revisions (
  id TEXT PRIMARY KEY,
  collection TEXT NOT NULL CHECK (collection IN ('activities','programs','news')),
  record_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  data TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (collection, record_id, version)
);
CREATE INDEX idx_revisions_record ON revisions(collection, record_id, version DESC);

CREATE TABLE forms (
  id TEXT PRIMARY KEY,
  program_id TEXT REFERENCES programs(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','trashed')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE form_versions (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES forms(id),
  version INTEGER NOT NULL,
  schema_json TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (form_id, version)
);

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('registration','enquiry')),
  form_version_id TEXT REFERENCES form_versions(id),
  program_slug TEXT,
  payload_json TEXT NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  read_at INTEGER,
  trashed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_submissions_inbox ON submissions(kind, trashed_at, created_at DESC);
CREATE TABLE submission_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  bucket TEXT NOT NULL,
  at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_sub_attempts ON submission_attempts(ip, bucket, at);
```

- [ ] **Step 2: Verify green**

Run: `cd apps/api && pnpm test`
Expected: 23/23 PASS (migrations auto-apply; no behavior change yet).

- [ ] **Step 3: Commit**

```bash
git add apps/api/migrations/0005_lifecycle.sql
git commit -m "feat(api): d1 migration for lifecycle, forms, inbox tables"
```

---

### Task 2: Content lifecycle routes (draft overlay, publish, trash)

**Files:**
- Create: `apps/api/src/routes/content-admin.ts`, `apps/api/src/lib/content-config.ts`
- Modify: `apps/api/src/app.ts` (mount `/admin/content`)
- Test: `apps/api/test/content-admin.spec.ts`

**Interfaces:**
- Produces `CONTENT_CONFIG` in `lib/content-config.ts`:
```ts
export const CONTENT_CONFIG = {
  activities: { fields: ["title","tag","image_url","description","body"] },
  programs:   { fields: ["title","image_url","description","deadline_text"] },
  news:       { fields: ["title","image_url","excerpt"] },
} as const;
export type CollectionName = keyof typeof CONTENT_CONFIG;
```
- Routes (all require session; owner AND editor both allowed):
  - `GET /admin/content/:collection?status=` → rows; default excludes trashed; merges `draft_json` over base columns; each row includes `_status`.
  - `GET /admin/content/:collection/:id` → merged view (404 unknown collection/id).
  - `POST /admin/content/:collection` body `{slug, ...fields}` → 201 merged row, `status='draft'`; duplicate slug → 409 `{"error":"slug_taken"}`; unknown collection → 404 `{"error":"unknown_collection"}`.
  - `PATCH /admin/content/:collection/:id` — rejects `slug` key with 400 `{"error":"slug_immutable"}`; unknown keys rejected 400 `{"error":"unknown_field"}`; trashed target → 409 `{"error":"trashed"}`; writes ONLY `draft_json` (full merged doc) + `updated_at`; never base content columns.
  - `DELETE /admin/content/:collection/:id` → sets `prev_status=status, status='trashed'`, 204.
  - `POST /admin/content/:collection/:id/restore` → trashed only (else 409 `{"error":"not_trashed"}`); restores previous status, clears `prev_status`, 200 row.
  - `POST /admin/content/:collection/:id/publish` — allowed from draft|unpublished (else 409 `{"error":"invalid_state"}`); ATOMIC batch: insert revision (next version = max+1, data = CURRENT base columns JSON), apply draft_json onto base columns, `draft_json=NULL`, `status='published'`, `published_at=unixepoch()`; 200 row.
  - `POST /admin/content/:collection/:id/unpublish` — from published only (else 409); sets status='unpublished'; 200 row.
  - `GET /api/collections/:name` UNCHANGED (base columns are live truth).

- [ ] **Step 1: Failing tests** — cover: create draft 201; dup slug 409; patch blocks slug/unknown fields; patch does NOT change public read until publish (fetch `/api/collections/activities` before+after); publish moves title live + writes revision v1; second publish → v2; unpublish removes from public; trash hides from admin default; restore returns prior state; transitions enforced (publish-on-published 409 etc.). Write these as concrete `it()` blocks hitting `SELF.fetch`.

- [ ] **Step 2: Run red** — `pnpm test` fails (routes missing).

- [ ] **Step 3: Implement** — `lib/content-config.ts` per interface above; `routes/content-admin.ts` implements every route with prepared statements; mount in app: `app.route("/admin/content", contentAdminRoutes());`

- [ ] **Step 4: Green + gates** — `pnpm test` all pass; `pnpm exec tsc --noEmit` clean in touched files.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src apps/api/test
git commit -m "feat(api): content lifecycle with draft overlay and atomic publish"
```

---

### Task 3: Revision list + restore-as-draft

**Files:**
- Modify: `apps/api/src/routes/content-admin.ts`
- Test: extend `apps/api/test/content-admin.spec.ts`

**Interfaces:**
- `GET /admin/content/:collection/:id/revisions` → `[{version, created_at}]` newest-first (data omitted).
- `GET /admin/content/:collection/:id/revisions/:version` → full `{version, data, created_at}` (404 if absent).
- `POST /admin/content/:collection/:id/revisions/:version/restore` → sets `draft_json` = that revision's data (record may be any live state; trashed → 409 `not_trashed`); response = merged row; publishing remains explicit.

- [ ] Steps: failing tests (after two publishes, list shows v1,v2; restore v1 overlays draft; public still serves v2 until publish) → red → implement → green+tsc → commit:

```bash
git add apps/api/src apps/api/test
git commit -m "feat(api): revision list and restore-as-draft"
```

---

### Task 4: Owner-managed editor accounts

**Files:**
- Create: `apps/api/src/routes/users-admin.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/test/users-admin.spec.ts`

**Interfaces:**
- All owner-only (editor token → 403 `{"error":"forbidden"}`):
  - `GET /admin/users` → `[{id,email,role,disabled_at}]`
  - `POST /admin/users` `{email,password,role:'editor'|'owner'}` → 201 `{id,email,role}`; duplicate email 409 `{"error":"email_taken"}`; role validation 400.
  - `POST /admin/users/:id/disable` → sets disabled_at; cannot disable self (400 `{"error":"cannot_disable_self"}`); 204.
  - `POST /admin/users/:id/enable` → clears disabled_at; 204.
  - `POST /admin/users/:id/reset-password` `{new_password}` → updates hash + deletes that user's sessions; 204.
- Disabled user's live session rejected by existing `requireSession` join (already checks `disabled_at`) — assert in test.

- [ ] Steps: failing tests (editor forbidden on all five; happy paths; disabled-session revocation mid-use) → red → implement → green+tsc → commit:

```bash
git add apps/api/src apps/api/test
git commit -m "feat(api): owner-managed editor accounts"
```

---

### Task 5: Form builder admin endpoints

**Files:**
- Create: `apps/api/src/lib/form-schema.ts`, `apps/api/src/routes/forms-admin.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/test/forms-admin.spec.ts`

**Interfaces:**
- `lib/form-schema.ts` exports `validateSchema(fields: unknown): {ok:true}|{ok:false,error:string}` enforcing: array 1..50 items; each `{type,label,key}` + type ∈ {text,email,phone,number,date,single-choice,multi-choice,consent,long-text}; labels non-empty strings; keys unique snake_case; choice types require `options: string[]` 1..20; consent requires nothing extra; max_length optional positive int for text-ish types.
- Routes (session required; editor+owner):
  - `POST /admin/forms` `{name, program_id?, fields}` → validateSchema else 400 `{"error": <msg>}`; creates form status='draft'; 201 row.
  - `GET /admin/forms` · `GET /admin/forms/:id` · `PATCH /admin/forms/:id` (name/fields/program_id on draft|published; if published, changes land only at next publish — store nothing extra: PATCH on published form updates name only, fields changes rejected 409 `{"error":"republish_required"}`)
  - `DELETE /admin/forms/:id` → trash semantics like content (status='trashed'); block if program registrations exist referencing its versions → 409 `{"error:""has_submissions"}` offering archive-by-trash-of-program instead (same rule as content: block-with-explanation).
  - `POST /admin/forms/:id/publish` → validates current fields; inserts NEXT form_versions row (max+1) with schema_json; sets form.status='published'; returns `{form, version}`.
  - `GET /admin/forms/:id/versions` → list.

- [ ] Steps: failing tests (validation matrix incl. >20 options, dup keys, bad type; publish freezes version; edit-after-publish rejected; trash-block with submissions inserted directly via env.DB) → red → implement → green+tsc → commit:

```bash
git add apps/api/src apps/api/test
git commit -m "feat(api): versioned form builder admin endpoints"
```

---

### Task 6: Public submissions with abuse guards

**Files:**
- Create: `apps/api/src/routes/submissions-public.ts`, `apps/api/src/lib/validate-submission.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/test/submissions-public.spec.ts`

**Interfaces:**
- `validate-submission.ts`: `validateAgainstSchema(schema: Field[], payload: Record<string,unknown>): {ok:true, clean:Record<string,unknown>} | {ok:false,error:string}` — rejects unknown payload keys; per-type checks (email regex, phone regex `[+\d][\d\s-]{5,}`, number numeric, date ISO yyyy-mm-dd, choices ∈ options, multi-choice array ⊆ options, consent must be `true`, long-text ≤5000 chars, text respects max_length); required enforcement.
- Routes (NO auth):
  - `POST /api/register/:programSlug` — program must exist AND be published AND open=1 (else 404 `{"error":"not_accepting"}`); finds program's LATEST published form_version (404 `{"error":"no_form"}` if none); body `{startedAt:number, website?:string(honeypot), answers:{...}}`; guards in order: honeypot non-empty → 204 SILENT (spam sink); `Date.now()-startedAt < 3000` → 400 `{"error:"too_fast"}`; raw body bytes >32KB → 413 `{"error:"too_large"}`; rate limits 20/IP/h and 10/bucket/h via submission_attempts (bucket = program slug or 'enquiry') → 429; validate → 400 `{"error": msg}`; success inserts submission kind='registration' with pinned form_version_id → 201 `{id}`.
  - `POST /api/enquiry` — fixed implicit schema `{name*, email*, phone, subject*, message*}`; same guards (bucket='enquiry'); kind='enquiry'.
  - Turnstile: when `env.TURNSTILE_SECRET` set, require `turnstileToken` and verify via `https://challenges.cloudflare.com/turnstile/v0/siteverify` before guards; unset in dev → skipped (documented).

- [ ] Steps: failing tests covering every guard + happy path both kinds + closed-program 404 + wrong-type answer 400 + consent-false rejection → red → implement → green+tsc → commit:

```bash
git add apps/api/src apps/api/test
git commit -m "feat(api): public submissions with validation and abuse guards"
```

---

### Task 7: Inbox endpoints

**Files:**
- Create: `apps/api/src/routes/inbox-admin.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/test/inbox-admin.spec.ts`

**Interfaces:**
- Session required (editor+owner):
  - `GET /admin/inbox/:kind?unread=1&limit=&offset=` (kind ∈ registration|enquiry else 404) → rows newest-first excluding trashed, each `{id,payload,read_at,created_at}` + header `X-Unread-Count`.
  - `POST /admin/inbox/submissions/:id/read` → sets read_at; 204.
  - `DELETE /admin/inbox/submissions/:id` → soft trash (trashed_at); 204.
- Owner-only:
  - `DELETE /admin/inbox/:kind` → HARD-deletes all trashed rows of that kind (purge); editor → 403; 200 `{deleted:n}`.

- [ ] Steps: failing tests (separation of kinds; unread filter/count; soft-delete hides; editor purge 403; owner purge deletes only trashed) → red → implement → green+tsc → commit:

```bash
git add apps/api/src apps/api/test
git commit -m "feat(api): enquiry and registration inboxes with owner purge"
```

---

### Task 8: Build gate, dev-server smoke, PR

**Files:** none new.

- [ ] `pnpm exec tsc --noEmit` exit 0; `pnpm run deploy:dry` OK; `pnpm test` all green.
- [ ] Restart hub process `sarak-api-dev`; curl smoke: create draft → patch → publish → public shows change; enquiry submit lands in inbox.
- [ ] `.superpowers/` + scratch files gitignored; commit `chore(api): content lifecycle gate passes` (--allow-empty ok); push; `gh pr create --title "feat: content lifecycle, forms, inboxes"` body referencing `VIM4-159`, `VIM4-162`.

## Self-Review hooks

- Spec coverage: lifecycle/state machine/slugs (Data Integrity) → T2/T3; revisions+restore-as-draft → T3; owner accounts gap → T4; form builder caps/types → T5; abuse guards verbatim numbers → T6; separate inboxes + owner purge + retention → T7; publish latency via s-maxage=30 documented in Architecture.
- Type consistency: `CollectionName`, `validateSchema`, `validateAgainstSchema`, route prefixes identical across tasks; submissions.kind enum matches inbox param.
