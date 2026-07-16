# SARAK Frontend Refresh Design

## Scope

Refresh the SARAK frontend pages to match the provided premium Jain hero reference and fix specific responsive issues on the homepage. The work covers the homepage, About, Activities, Programs, and a new Blogs page.

## Assets

Use existing public assets now because the requested attachments are not available in the workspace. The implementation should make later replacement simple by centralizing hero image paths.

Expected future asset paths:

- `public/murti.png` for the About page hero.
- `public/programs.png` for the Programs page hero.
- `public/activities.png` for the Activities page hero.

Temporary fallback assets:

- About: `/sarak-heritage-idol.jpg` or `/about-hero.png`.
- Programs: `/sarak-heritage-hero.png` or `/sarak-hero-desktop.png`.
- Activities: `/sarak-seva.jpg`.
- Blogs: an existing heritage/service image.

## Hero System

Create a reusable premium page hero component for inner pages. It should follow the supplied Programs reference: warm ivory background, orange/gold accent palette, Hindi-friendly typography, decorative lotus/mandala elements, soft gradients, premium rounded bottom treatment, and a height around 420-480px rather than full screen.

Each page hero should support an eyebrow, title with highlighted words, short Hindi copy, and a background image positioned to the right on desktop while remaining legible and balanced on mobile.

## Homepage Fixes

The homepage hero image should begin directly below the fixed navbar and visually cover the available width without stretching. Use responsive `object-cover` image behavior and tuned object positioning instead of `object-contain` where needed.

The mobile metrics cards should reduce vertical spacing between the number and label so labels do not collide with the ornamental frame.

The `What does SARAK do?` section should show शिक्षा, सेवा, and संस्करण images in equal fixed-size containers. Text can be adjusted, but must remain Hindi.

The WhatsApp CTA should use background color `#075E54`. The SARAK logo should sit inside a white circular container to resemble a WhatsApp profile picture.

## Activities Page

Use the reusable page hero with the activities fallback asset until `public/activities.png` is provided.

Split activities into two sections: ongoing activities and past activities. Activity titles and descriptions should be Hindi. Cards should retain the premium visual language and use the existing data where practical.

Improve the contact strip so it presents phone, email, and address/map information from the footer in a polished layout rather than the current generic demo contact details.

## Programs Page

Use the reusable page hero with `/sarak-heritage-hero.png` fallback until `public/programs.png` is provided. Match the supplied reference design language closely.

## About Page

Replace the current full-screen-style hero with the reusable page hero. Use the fallback image now and later switch to `public/murti.png`.

## Blogs Page

Add a `/blogs` page with dummy blog cards that match the SARAK theme. Add Blogs to the primary navigation and footer links. Blog content should be visually coherent with the rest of the site and can use placeholder Hindi/English copy.

## Verification

Run the existing about-page verification script if still applicable after updates, then run a production build. Visually relevant risks are responsive crop, mobile nav, hero legibility, and equal image sizing.
