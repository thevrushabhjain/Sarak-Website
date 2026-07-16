# SARAK Frontend Follow-Up Design

## Scope

Apply the second round of frontend refinements across the homepage, page heroes, activities, donation, and contact pages.

## Homepage

Increase Hindi hero heading line-height so descenders and next-line characters do not collide. Keep the existing visual composition.

Normalize the `What does SARAK do?` image containers with a consistent fixed desktop width and height plus responsive mobile sizing. All three service images must remain visually equal.

Update activity cards so their read CTA changes to the same saffron/orange treatment used by program card buttons on hover.

## Page Heroes

Refine `PremiumPageHero` image composition so the image integrates like the homepage hero: right-weighted on desktop, full-background on mobile, no hard visual separation, and softer gradients.

## Activities

Use all available activity records as ongoing activities. Keep activity titles/descriptions in Hindi but use English transliterated category labels such as `Shiksha Gatividhi`.

Show three past activities on the main Activities page and add `/activities/past` for the full past-activities page.

Improve the contact CTA with the WhatsApp green background `#075E54` and shorter desktop cards.

On activity detail pages, add a back link to `/activities`, keep category labels in English, remove the old `Watch the story` CTA block, and add a YouTube preview section immediately below the gallery.

## Donation

Rebuild donation schemes using the live `sarakabhiyan.org/donation` content while preserving this site's premium theme. Include the scheme names and amounts from the source page and replace bank details with the source details.

## Contact

Use the official contact details from `sarakabhiyan.org/ContactUs`. Remove the `Find the right team` section. Present main office and grouped contact cards for donation, jinalay/jirnodhar, upashray, paryushan, pathshala, navpad oli, and jinalay salgira.

## Assets

Prompt attachments cannot be saved directly from this environment. Continue using current public/data assets unless the exact images are later added under `public/`.

## Verification

Update source verification to check for the new activity route, English category labels, source donation/contact content, back link, YouTube preview, and homepage visual class changes. Run source verification and production build.
