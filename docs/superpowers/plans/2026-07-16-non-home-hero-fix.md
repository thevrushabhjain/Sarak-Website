# Non-Home Hero Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix only the shared hero section used by non-home pages, leaving the Home hero untouched.

**Architecture:** Update `PremiumPageHero` in `components/SarakSite.tsx` and source checks in `scripts/verify-about-page.mjs`. Because Home uses `RefinedHome` instead of `PremiumPageHero`, this isolates the work to non-home page heroes.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion.

## Global Constraints

- Do not edit the Home hero in `RefinedHome`.
- Only change non-home hero behavior through `PremiumPageHero` and its page usage.
- Desktop non-home heroes must have image coverage across the full hero background with no empty white gap.
- Mobile non-home heroes must keep the image subject visible with improved object positioning and soft overlays.
- Verify with `node scripts/verify-about-page.mjs` and `npm run build` before pushing.

---

### Task 1: Verification

**Files:**
- Modify: `scripts/verify-about-page.mjs`

**Steps:**
- [ ] Add checks that `PremiumPageHero` uses a full absolute image background, mobile object positioning classes, and that `RefinedHome` hero classes remain unchanged.
- [ ] Run `node scripts/verify-about-page.mjs` and confirm new checks fail before implementation.

### Task 2: Shared Hero Update

**Files:**
- Modify: `components/SarakSite.tsx`

**Steps:**
- [ ] Add optional `imageClassName` prop to `PremiumPageHero` for page-specific mobile/desktop object positioning.
- [ ] Convert hero image layer to a full absolute background that covers the whole hero section.
- [ ] Strengthen overlays so text remains readable while the image fills full width.
- [ ] Add page-specific image positioning where needed without touching `RefinedHome`.

### Task 3: Verify And Push

**Steps:**
- [ ] Run `node scripts/verify-about-page.mjs`; expect all PASS.
- [ ] Run `npm run build`; expect build success.
- [ ] Commit and push to `origin/main`.

## Self-Review

- Scope is limited to non-home heroes.
- Home hero is explicitly protected by verification.
- No dependency or structure changes are needed.
