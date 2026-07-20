# Layout Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the requested visual polish issues for service alignment, mobile drawer spacing, Activities CTA removal, and non-home hero/header alignment.

**Architecture:** Keep all changes localized to `components/SarakSite.tsx` and source-level checks in `scripts/verify-about-page.mjs`. Preserve the Home hero image implementation and avoid broad restructuring.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion.

## Global Constraints

- Do not edit the Home hero image sources or layout.
- Keep changes minimal and within existing component patterns.
- Verify with `node scripts/verify-about-page.mjs` and `npm run build`.

---

### Task 1: Add Layout Verification

**Files:**
- Modify: `scripts/verify-about-page.mjs`

**Interfaces:**
- Consumes: `components/SarakSite.tsx` source text.
- Produces: checks that fail until requested layout changes are implemented.

- [ ] Replace the old Seva offset check with checks for balanced alternating rows.
- [ ] Add checks for compact mobile drawer spacing.
- [ ] Add checks that Activities no longer renders `ContactStrip`.
- [ ] Add checks that non-home hero uses an explicit `top-[84px]` image layer and no section margin offset.

### Task 2: Implement Minimal Component Changes

**Files:**
- Modify: `components/SarakSite.tsx`

**Interfaces:**
- Consumes: existing `PremiumHeader`, `PremiumPageHero`, `HomeMissionSections`, `Activities`.
- Produces: updated layout classes only.

- [ ] Remove the custom Seva content offset and make alternating rows use mirrored grid templates.
- [ ] Reduce mobile drawer top spacing, row padding, font size, and CTA top margin.
- [ ] Remove `<ContactStrip />` from the Activities page only.
- [ ] Change `PremiumPageHero` to place the image layer at `top-[84px]` and remove the section `mt-[84px]`, while keeping the Home hero untouched.

### Task 3: Verify, Commit, Push

**Files:**
- Modified files from Tasks 1-2.

**Interfaces:**
- Consumes: local workspace.
- Produces: pushed GitHub commit on `main`.

- [ ] Run `node scripts/verify-about-page.mjs` and confirm all checks pass.
- [ ] Run `npm run build` and confirm the build succeeds.
- [ ] Commit only intended files.
- [ ] Push to `origin/main`.

## Self-Review

- Covers all requested changes.
- No placeholders or undefined functions.
- Does not touch Home hero image sources.
