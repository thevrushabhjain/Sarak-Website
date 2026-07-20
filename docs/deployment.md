# Deployment Notes

## Project

- Framework: Next.js 15 app router
- Package manager: pnpm 11.7.0
- Build command: `npm run build`
- Existing verification command: `node scripts/verify-about-page.mjs`

## Changes Made For Deployment Readiness

- Pinned the package manager in `package.json` with `packageManager: pnpm@11.7.0`.
- Replaced the placeholder pnpm build approval with `allowBuilds.sharp: true` and `onlyBuiltDependencies: [sharp]` in `pnpm-workspace.yaml`.
- Set `outputFileTracingRoot` in `next.config.mjs` so Next.js traces from this project directory instead of the parent user directory.
- Use the default Next.js output directory `.next` for Vercel compatibility.

## Verification Run

- `npx pnpm@11.7.0 install --frozen-lockfile`
- `node scripts/verify-about-page.mjs`
- `npm run build`
- Confirm the build creates the default `.next` directory.

## Deployment Requirement

This app is server-rendered by Next.js and is ready for Vercel deployment. Deployment requires either:

- an interactive `vercel login`, or
- a `VERCEL_TOKEN` passed to the Vercel CLI.

GitHub Pages is not currently a safe deployment target without additional static-export/base-path work because the repository would be served under `/Sarak-Website/` while the app contains root-relative public asset paths.

If Vercel reports that `.next` is missing, confirm the deployment is building the latest `main` commit and that the project Output Directory is empty or `.next`.
