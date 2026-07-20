# Layout Polish Design

## Scope

- Correct the `सेवा` row alignment in the Home purpose/services section without changing the Home hero.
- Tighten spacing in the mobile sidebar navigation.
- Remove the `We are listening` contact strip from the Activities page.
- Align non-home hero image top edges with the fixed navbar bottom.

## Design

- Use mirrored desktop grid templates for alternating service rows instead of a special-case offset for `सेवा`.
- Keep mobile service rows stacked using the existing source order and spacing.
- Reduce mobile drawer top margin, link vertical padding, link font size, and CTA top margin.
- Remove only the Activities page `<ContactStrip />` call; leave other call sites intact.
- Keep `PremiumPageHero` as the shared non-home hero and move its image layer to `top-[84px]`, matching the fixed header height.

## Verification

- Extend `scripts/verify-about-page.mjs` with source-level checks for each requested behavior.
- Run `node scripts/verify-about-page.mjs`.
- Run `npm run build`.
