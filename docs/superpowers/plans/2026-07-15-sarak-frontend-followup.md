# SARAK Frontend Follow-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the second-round SARAK frontend refinements across home, heroes, activities, donation, and contact pages.

**Architecture:** Continue the current compact Next.js design with targeted edits in `components/SarakSite.tsx` and source checks in `scripts/verify-about-page.mjs`. Keep data close to the page sections to avoid a broad refactor.

**Tech Stack:** Next.js 15 app router, React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide React.

## Global Constraints

- Activity titles and descriptions remain Hindi.
- Activity category labels become English transliterations.
- Contact and donation content follows `sarakabhiyan.org` source data.
- WhatsApp-style CTA background remains `#075E54`.
- Prompt attachments cannot be saved directly; use existing public/data assets.
- Do not commit because the workspace git root is broad and user did not request commits.

---

### Task 1: Source Verification

**Files:**
- Modify: `scripts/verify-about-page.mjs`

**Interfaces:**
- Produces checks for the follow-up requirements.

- [ ] Add checks for home hero line-height, service fixed image dimensions, activity hover orange CTA, English category labels, past route, back link, YouTube preview, donation scheme source content, official contact groups, and `#075E54` contact CTA.
- [ ] Run `node scripts/verify-about-page.mjs` and verify the new checks fail before implementation.

### Task 2: Home And Shared Heroes

**Files:**
- Modify: `components/SarakSite.tsx`

**Interfaces:**
- Consumes `PremiumPageHero`, `RefinedHome`, `HomeMissionSections`, `ActivityCard`.
- Produces improved typography, image consistency, hero image composition, and card hover CTA.

- [ ] Increase `RefinedHome` Hindi hero heading line-height and spacing.
- [ ] Update `PremiumPageHero` image and overlay classes to integrate more like the home hero.
- [ ] Change service section grid/image wrapper to fixed equal responsive dimensions.
- [ ] Update `ActivityCard` CTA hover styles to orange/saffron.

### Task 3: Activities And Past Activities

**Files:**
- Modify: `components/SarakSite.tsx`

**Interfaces:**
- Produces `activityDisplayContent`, `pastActivityContent`, `PastActivitiesPage`, updated `Activities`, updated `ActivityDetail`, and router branch for `/activities/past`.

- [ ] Centralize activity display content with Hindi title/description and English category labels.
- [ ] Render all current activities in ongoing section.
- [ ] Render three past activities on `/activities` and all past activities on `/activities/past`.
- [ ] Add back navigation to activity detail pages.
- [ ] Remove old `Watch the story` CTA block and add YouTube preview immediately below gallery.
- [ ] Keep activity detail category labels in English.

### Task 4: Donation And Contact

**Files:**
- Modify: `components/SarakSite.tsx`

**Interfaces:**
- Produces source-backed donation scheme cards, source-backed bank details, source-backed contact cards, and no `Find the right team` section.

- [ ] Add donation scheme data from `sarakabhiyan.org/donation`.
- [ ] Rebuild donation cards with scheme names and amounts.
- [ ] Replace bank details with IDFC/trust details from the source page.
- [ ] Add official contact group data from `sarakabhiyan.org/ContactUs`.
- [ ] Rebuild contact page around main office and contact group cards; remove `Find the right team`.

### Task 5: Verification

**Files:**
- Modify if needed: `scripts/verify-about-page.mjs`

**Interfaces:**
- Consumes all modified source.
- Produces verified source and build.

- [ ] Run `node scripts/verify-about-page.mjs`; expect all checks to pass.
- [ ] Run `npm run build`; expect successful production build. Note any workspace-root warning separately.

## Self-Review

- Spec coverage: tasks cover all requested homepage, hero, activities, donation, and contact changes.
- Placeholder scan: no placeholders; source content is explicitly referenced from fetched pages.
- Type consistency: new named data structures are used by the pages and router.
