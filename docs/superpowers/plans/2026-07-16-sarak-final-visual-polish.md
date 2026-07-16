# SARAK Final Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the final approved visual polish and push the verified project to GitHub.

**Architecture:** Continue targeted edits in `components/SarakSite.tsx` and `scripts/verify-about-page.mjs`. Keep the current single-component project structure to avoid unnecessary refactoring.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide React.

## Global Constraints

- Use available public assets including `/murti.png`, `/programs.png`, `DSC_*.JPG`, and `DJI_0828.JPG`.
- Do not add new dependencies.
- Verify with `node scripts/verify-about-page.mjs` and `npm run build` before pushing.
- Push to `https://github.com/thevrushabhjain/Sarak-Website.git` only after verification passes.

---

### Task 1: Verification Checks

**Files:**
- Modify: `scripts/verify-about-page.mjs`

**Steps:**
- [ ] Add checks for new asset paths, hero image fill classes, Gallery hero line spacing, Contact single-line hero title, Support System on Contact, donation-only CTA on Home, donation scheme images/no select buttons, balanced contact CTA/panel classes, and Featured Activity hover `#f97216`.
- [ ] Run source verification and confirm the new checks fail before implementation.

### Task 2: Home And Shared Hero Polish

**Files:**
- Modify: `components/SarakSite.tsx`

**Steps:**
- [ ] Update hero image paths to use `/murti.png` and `/programs.png`.
- [ ] Adjust `PremiumPageHero` image container/classes to fill the right desktop area.
- [ ] Add per-hero title class support for Gallery and Contact.
- [ ] Move the `सेवा` content block right on desktop.
- [ ] Change Featured Activity arrow hover background to `#f97216`.
- [ ] Replace the Home three-card CTA with a single donation banner.

### Task 3: Contact And Donation Polish

**Files:**
- Modify: `components/SarakSite.tsx`

**Steps:**
- [ ] Move support-system carousel to Contact above footer.
- [ ] Tighten Activities contact CTA desktop spacing.
- [ ] Rebalance Contact direct-connect panel height/content.
- [ ] Add images to donation scheme cards and remove select buttons.

### Task 4: Verification And Push

**Files:**
- No code edits expected except fixes from verification.

**Steps:**
- [ ] Run `node scripts/verify-about-page.mjs`; expect all PASS.
- [ ] Run `npm run build`; expect build success.
- [ ] Initialize or reuse a project-local git repository safely, commit project files, set remote to `https://github.com/thevrushabhjain/Sarak-Website.git`, and push.

## Self-Review

- Requirements are mapped to tasks.
- No placeholders remain.
- Git upload is intentionally last and gated on verification.
