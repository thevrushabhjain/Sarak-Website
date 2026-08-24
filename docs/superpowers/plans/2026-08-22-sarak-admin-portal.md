# Sarak Admin Portal Implementation Plan (Plan 4 of 6 — pulled ahead of Plan 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** A working, deployed, point-and-click admin portal at a public URL where owner/editors log in and manage everything the API supports — content lifecycle, media, forms, inboxes, users.

**Architecture:** `apps/admin` — Expo (React Native Web) static web export, deployed to Cloudflare Pages (same account as the API, free). Talks to the live Worker API at `https://sarak-api.team-8db.workers.dev` using cookie sessions (`credentials: "include"`; API CORS must allow the Pages origin — added in Task 1). React Navigation for screens; plain controlled forms (no heavy UI kit).

**Tech Stack:** Expo SDK 52+ (web), React Navigation, TypeScript, pnpm workspace.

**Linear:** new issue under Sarak Website.

**API (live, immutable for this plan):** auth `POST /admin/auth/login|logout`, `GET /admin/auth/me`; content `GET/POST /admin/content/:c`, `GET/PATCH/DELETE /admin/content/:c/:id`, `POST .../publish|unpublish|restore`, `GET .../revisions[/:version]`, `POST .../revisions/:version/restore`; media `POST /admin/media` (multipart file,alt) → `{url}`; forms `GET/POST /admin/forms`, `PATCH/DELETE /admin/forms/:id`, `POST /admin/forms/:id/publish`; inbox `GET /admin/inbox/:kind?unread=1`, `POST /admin/inbox/submissions/:id/read`, `DELETE /admin/inbox/submissions/:id`, `DELETE /admin/inbox/:kind` (owner); users `GET/POST /admin/users`, `POST /admin/users/:id/disable|enable|reset-password` (owner). Errors: `{error}` + 401/403/404/409/413/415/429.

## Global Constraints

- Locked heroes / public design: not touched by the portal at all.
- Owner-only screens: Users, bulk purge. Everything else owner+editor.
- Drafts never auto-publish; every publish is an explicit button.
- Slugs immutable after create (no slug field on edit forms).
- Form builder: field types text, email, phone, number, date, single-choice, multi-choice, consent, long-text; ≤20 options; no file uploads.
- No outbound email anywhere; no payment features.
- Session: cookie-based; 401 anywhere → redirect to login.
- Mixed Hindi/English text is free-typed; no translation UI.

---

### Task 1: CORS + scaffold + login + shell

- [ ] API: add CORS to `createApp` — allow origins `http://localhost:8081`, `https://sarak-admin.pages.dev`, `*.pages.dev` preview; `allow-credentials: true`, `allow-headers: content-type, cookie`; answer `OPTIONS` 204. Guarded by existing tests + new CORS test.
- [ ] Scaffold `apps/admin` (Expo web, TS, pnpm). App shell: login screen (email/password → `credentials:"include"` → `GET /admin/auth/me` shows email/role in header; logout button). After login: tab layout Dashboard / Content / Media / Forms / Inbox / Users.
- [ ] Gates: `tsc --noEmit` clean; `expo export --platform web` succeeds; API CORS test green.
- [ ] Commit + deploy preview to Cloudflare Pages (`wrangler pages deploy dist`), verify login works against production API from the Pages URL.

### Task 2: Content manager (the money screen)

- [ ] Collection picker (Activities / Programs / News) → list (status filter chips: all/draft/published/unpublished/trashed; slug, title, status badge, updated).
- [ ] Editor screen: all fields per collection config; slug shown read-only on edit; Save Draft (PATCH); Publish (confirm dialog → publish → toast + list refresh); Unpublish; Trash; Restore; Revisions drawer (list versions, preview JSON, Restore-as-draft button).
- [ ] Create screen: slug + fields; 409 slug_taken surfaced inline.
- [ ] Gates: tsc clean; web export; manual pass on production API: create→edit→publish→unpublish→trash→restore→revision restore.

### Task 3: Media library + Forms + Inbox + Users

- [ ] Media: grid of uploaded images (upload button with alt field; copy-URL; reject 413/415 with messages).
- [ ] Forms: list/create/edit (dynamic field editor: add field, pick type, required toggle, options editor for choices, max_length), Publish (freeze version), version list; trash blocked when submissions exist (show API message).
- [ ] Inbox: tabs Enquiries / Registrations; unread badge; list with payload pretty-view; mark-read; delete (soft); owner sees "Purge trashed" button with confirm.
- [ ] Users (owner-only; hidden for editors): list, create (email/password/role), disable/enable, reset-password.
- [ ] Gates: tsc; export; manual pass each screen against production.

### Task 4: Polish + deploy production

- [ ] Empty states, error toasts on every mutation, loading skeletons; mobile-responsive layout (portal usable on phone).
- [ ] Production deploy: `wrangler pages deploy` → production alias; add Pages URL to API CORS allowlist permanently.
- [ ] PR + CI green; Linear Done after owner clicks through every screen once.

## Self-review hooks

- Every API endpoint from Plan 1/2 has a UI surface; no portal feature without an endpoint.
- Owner/editor split enforced by API (screens hide, API enforces).
- No hero/public-design coupling.
