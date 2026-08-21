# Sarak Dynamic Website and Admin Portal — Design Spec

Date: 2026-08-21
Status: Design approved in conversation; written spec awaiting owner review
Linear project: Sarak Website (Vimaksh Work)
Public reference: https://sarak-website.vercel.app/
Repository: https://github.com/thevrushabhjain/Sarak-Website

## Goal

Preserve the approved public Sarak website appearance exactly, replace hard-coded content with an admin-controlled dynamic system, add a React Native Web admin portal, and ship a public iOS/Android app that consumes the same content and registration flows.

## Non-Goals

- No online payment portal, payment capture, transaction tracking, or donation receipts.
- No public visitor accounts, registration confirmation emails, or marketing email workflows.
- No editor assignment, notes, CSV export, automated replies, approvals, ticketing, attendance, or check-in tools.
- No scheduled publishing.
- No per-field translation workflow; editors enter mixed Hindi/English content naturally.
- No hero editing anywhere in the portal, including site settings.

## Architecture

### Stack

- Public web, iOS, and Android: one Expo/React Native codebase using React Native Web.
- Admin portal: React Native Web app sharing design tokens, API contracts, validation, and non-visual logic with the public product.
- API: Hono on Cloudflare Workers.
- Data: Cloudflare D1 for content records, revisions, users, form definitions, enquiries, and registrations.
- Media: Cloudflare R2 for uploaded images with private write-through-API-only access.
- Form protection: Cloudflare Turnstile plus server-side schema validation.

### Migration

- Implementation starts from a new isolated branch/worktree created from GitHub main; GitHub main/live remain the visual source of truth.
- Current Next.js/Vercel site stays live. New web/admin/API deploy on parallel Cloudflare URLs during dual-run.
- All existing GitHub-main content and assets import into D1/R2 before parity testing.
- Dual-run source of truth: the legacy Vercel site remains authoritative until final parity snapshot. After snapshot, legacy content freezes so stores cannot diverge; any post-freeze correction is made once, in the new system, by the owner before cutover. During dual-run the new system's publish action is available but affects only Cloudflare preview URLs, never production traffic.
- Post-cutover observation window: 14 days. Exit criteria are zero rollback triggers (broken page, failed form delivery, data loss) for 14 consecutive days; legacy teardown only after this window.
- Cutover gate details:
- Content parity means every published record present with matching slug and identical published field values.
- Visual parity is checked on home, about, activities list/detail, programs list/detail, blogs/news list, gallery, donation, contact at mobile 375px, tablet 768px, desktop 1280px. Code-owned heroes must match the legacy rendered DOM exactly; dynamic record areas must match layout/typography with only content differences allowed from admin edits.

### Publishing

- Publish writes approved content to D1 and invalidates cached reads immediately. No redeploy required.
- Web and mobile read identical published records.
- Unpublish latency target: public URL returns not-found within 60 seconds on web; open native app sessions show the removed item as unavailable on next fetch (launch or pull-to-refresh), with no push-invalidation guarantee in this release.
- Publish latency target: p95 under 60 seconds from editor publish action to live web visibility.
- Caching: edge-cached reads with short TTLs plus active invalidation/version-bump on every publish/unpublish. "Visible immediately" is a cache-invalidation requirement, not a TTL hope.
- Native apps refetch on launch with pull-to-refresh; no content is bundled into app binaries.

### Cost Baseline

- Cloudflare Workers Paid: US$5/month base (10M requests/month included).
- Sizing inputs for US$0-overage expectations: one–two admins, fewer than 500 published records, fewer than 2,000 submissions/month, fewer than 10,000 public page loads/day, gallery under 8 GB media. D1/R2 stay within included allowances at this volume.
- Apple Developer: US$99/year (eligible nonprofits may request waiver). Google Play: US$25 one-time.
- Free Cloudflare tier risk: daily request/CPU caps can stop production traffic mid-month with no spend-cap protection; US$5/month Workers Paid is the production floor.

## Content Model

### Locked In Code

- Existing page hero sections: layout, text, imagery, decorative composition.
- Dynamic detail pages use fixed hero followed by dynamic record header/content below it.
- Public navigation structure and approved visual system.

### Editable Modules

- Activities: service stories, not registration events. Slug is set at creation and immutable afterward; duplicate slugs are rejected at creation time with a clear error.
- Programs: joinable opportunities with attached registration form. Open/closed is an independent editor-controlled toggle separate from the draft/published lifecycle; closing a program stops new submissions but keeps existing submissions and their inbox entries intact.
- News: short image/text/date updates; not long articles. Slug rules match activities: set once, immutable, duplicates rejected.
- Gallery: event albums plus separately ordered featured image stream. Deleting an album removes its photos from the featured stream automatically; featured ordering is preserved for remaining items.
- Contacts: teams and individual people.
- Site settings: footer details, social/WhatsApp links, homepage metrics, repeated contact details, verified external donation instructions.
- Homepage composition is code-owned: it renders published content from activities (featured three), programs (all open first, then recently closed), news (latest three), gallery featured stream (first eight), and site settings metrics. Empty modules render their approved empty state rather than collapsing layout.
- Listing pages paginate at 20 items per page with simple category/tag filters where the legacy design already shows them; no search in this release.
- SEO metadata: page titles and descriptions are code-owned defaults per route; dynamic records contribute their title/excerpt to detail-page metadata. OG images use each record's cover image when present.
- Dates and times render in Asia/Kolkata regardless of admin locale; date-only fields carry no timezone conversion.
- Analytics: out of scope this release; no telemetry added beyond Cloudflare's standard dashboard metrics.

### Editor Experience

- Owner creates editor email/password accounts directly; no public sign-up or confirmation email.
- Owner alone manages admin accounts.
- Editors can create, edit, preview, publish, unpublish, delete, inspect revisions, restore prior versions. Restore creates a new draft from the selected version; publishing that draft is a separate explicit action.
- Concurrent editing: last-write-wins per field group at save time with a visible "edited by {name} moments ago" warning before overwrite; no record locking in this release. Editors see all drafts including other editors' drafts; there is no draft privacy between editors.
- Drafts never appear publicly. Publishing becomes live immediately on web/mobile.
- Shared media library plus direct uploads inside records; images reusable, orderable, previewable, alt-text-capable.

### Forms and Inboxes

- Custom form builder supports text, email, phone, number, date, single-choice, multi-choice, consent, long-text fields; no file uploads. Choice options capped at 20 per field.
- Contact enquiries and program registrations appear in separate simple inboxes.
- Inbox scope: view/read/delete individual submissions only. Bulk purge of an entire inbox is owner-only.
- Submissions retained until deleted; trash has no auto-expiry in this release.
- No public accounts and no registration-confirmation email.
- Unread counts surface on inbox list rows so new submissions are discoverable without notifications.
- Cloudflare Turnstile plus server-side schema validation protect public forms.

### Donations

- Website shows owner/editor-maintained bank/UPI/QR/instructions and donation contacts.
- No online payment portal or transaction capture.

## Reliability, Security, and Verification

### Security Boundaries

- Public surface unauthenticated read-only over published content.
- Every mutation requires authenticated session enforced server-side; client UI hiding never enforcement point.
- Two server-side role checks:
  - Owner-only endpoints reject editors (account creation, resets, deletion, inbox purge decisions).
  - Editor tokens carry capability scope limited to approved content lifecycle.
- Sessions: server-issued, expiring after 7 days of inactivity, revocable on logout/password change/account removal; login rate-limited to 10 attempts per account per 15 minutes and 50 per IP per hour; passwords stored as salted adaptive hashes.
- Admin API origins restricted via CORS; public read API deliberately narrow. Secrets live only in Workers bindings/secrets, never client bundles.
- R2 buckets write-through-API-only; no public write/listable path. Inbox submissions readable only by authenticated owner/editors; nothing echoed back publicly.

### Data Integrity and Revisions

- Single state machine everywhere. States: draft, published, unpublished, trashed. Transitions: draft→published, published→unpublished, unpublished→published, any live state→trashed, trashed→its previous state via restore. "Restored" returns the record to its pre-trash state, not a terminal state.
- Edits never mutate live record: each publish snapshots version; public URL serves last-published snapshot until new publish succeeds atomically.
- Failed publish leaves previous version fully live — no half-published states.
- Prior published versions retained for exact unpublish→re-publish and restore reproduction.
- Slug/ID stability guarantees deep links survive republishing.
- Program form definitions versioned at publish time (not on every draft save); every submission records which form version it answered.
- Cross-module deletion semantics:
  - Deleting a program blocks while published registrations exist, offering archive instead.
  - Deleting an album cascades removal of its photos from the featured stream.
  - Deleting a person detaches them from their team without touching the team record.
  - Site settings references never block module deletion; missing references render empty.

### Backup and Recovery

- Automated recurring logical exports of entire D1 database to R2 daily with 30-day retention; media originals protected via R2 bucket versioning.
- Trash retention: trashed records retained indefinitely until owner deletes permanently; storage threshold warning at 80% of plan allowance.
- Stated targets sized to reality (one–two admins, low volume): RPO ≤ 24 h, RTO ≤ one business day.
- Documented restore runbook; full restore drill executed before cutover and re-run periodically after.
- Final legacy-site database exported and archived at cutover as permanent pre-migration baseline.

### Form Abuse Protection

- Layered defenses: per-IP rate limit 20 submissions/hour, per-form limit 10/hour, hidden honeypot field, minimum 3-second time-to-submit, 32 KB payload cap. Cloudflare-native human challenge (Turnstile escalation) activates when either rate limit trips twice in 24 hours.
- Every submission validated server-side against current schema: types, required flags, length limits, allowed values; unknown fields rejected; unchecked consent = rejected.
- Accepted limitation: no spam quarantine/confirmation mail in scope — surviving mail lands in inbox for human review.
- Duplicate submissions tolerated; handled by review aided by timestamp/IP shown alongside each submission.
- Storage threshold triggers admin-visible warning at 80% of plan allowance rather than silent drop.

### Media Validation

- Uploads only through authenticated admin endpoints; type verified by content inspection against raster-image allowlist (JPEG, PNG, WebP only); SVG and HTML rejected outright — never rendered from user origin.
- Size cap: 10 MB per image; system-generated keys (user filenames never used as paths); metadata never trusted for rendering.
- Failed processing leaves nothing publicly visible: album item stays invisible until success.

### Failure Behavior

- Public screens degrade to explicit error/retry states; donation instructions are served as a static code-owned fallback that renders even when the site-settings module fails.
- Editor operations fail loudly with actionable errors; publish atomic; form submit failures preserve user input client-side for retry.
- Infrastructure loss follows runbook: restore from export/PITR; maintenance banner is a static code-owned page activated by an operator flag, not dependent on the failing settings module; rollback to legacy while still inside rollback window.

### Observable Verification

- Auth matrix executed: logged-out mutation denied; editor hitting owner-only endpoint denied; removed account session revoked mid-use.
- Publish latency measured on web: p95 under 60 seconds to live visibility; unpublish returns not-found within 60 seconds on web; stale-cache test after every publish-path change. Native apps verified by fetch-on-launch showing new/removed content.
- Trash/restore roundtrip reproduces identical record content (all published field values equal); form-definition edit does not alter rendering of prior submissions.
- Abuse drill: scripted burst rate-limited, malformed payloads rejected, exactly one valid submission reaches correct inbox.
- Media drill: oversized/wrong-type uploads rejected clearly; valid image renders on all three surfaces.
- Migration: every gate checked off with evidence before DNS cutover; restore drill artifacts retained.
- Owner recovery codes exist and used successfully once in a drill.

### Owner Recovery

- One-time recovery codes generated at owner-account creation: set of 10 single-use codes, stored offline by owner.
- Each code allows single-use owner password reset without email dependency. If all codes are consumed or lost with the password forgotten, recovery requires direct D1 access via documented operator runbook; no self-service path exists in that dead-end case.
