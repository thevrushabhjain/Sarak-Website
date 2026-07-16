# SARAK Frontend Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the SARAK frontend pages with a unified premium Jain page hero system, fix homepage responsive issues, split Activities content, and add a Blogs page.

**Architecture:** Keep the existing compact Next.js structure. Implement changes primarily in `components/SarakSite.tsx`, with only targeted CSS adjustments in `app/globals.css`; keep image fallback paths centralized in component constants so future assets can replace them easily.

**Tech Stack:** Next.js 15 app router, React 19 client component, TypeScript, Tailwind CSS 3, Framer Motion, Lucide React.

## Global Constraints

- Use fallback assets now because `public/murti.png`, `public/programs.png`, and `public/activities.png` are not present.
- Future exact image paths must be `public/murti.png`, `public/programs.png`, and `public/activities.png`.
- Inner page heroes should be around 420-480px tall, not full screen.
- WhatsApp CTA background must be `#075E54`.
- शिक्षा, सेवा, and संस्करण copy must remain Hindi.
- Activity titles and descriptions must be Hindi.
- Avoid unrelated restructuring of the large `components/SarakSite.tsx` file.

---

### Task 1: Shared Premium Page Hero And Navigation

**Files:**
- Modify: `components/SarakSite.tsx`

**Interfaces:**
- Produces: `pageHeroImages`, `PremiumPageHero(props)`, `PremiumHeader` links including Blogs, and `ReferenceFooter` links including Blogs.
- Consumes: existing `motion`, `Link`, `PremiumHeader`, `ReferenceFooter`, and decorative assets under `public/decorations`.

- [ ] **Step 1: Add centralized hero image paths**

Add near the existing refined content constants before `AboutPage`:

```tsx
const pageHeroImages = {
  about: "/sarak-heritage-idol.jpg",
  activities: "/sarak-seva.jpg",
  programs: "/sarak-heritage-hero.png",
  blogs: "/history-of-sarak.jpg",
} as const;
```

- [ ] **Step 2: Add the reusable premium hero component**

Add after `sarakServices`:

```tsx
function PremiumPageHero({
  eyebrow,
  title,
  highlight,
  copy,
  image,
  imageAlt,
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  copy: string;
  image: string;
  imageAlt: string;
}) {
  return (
    <section className="relative mt-[84px] overflow-hidden border-b border-[#dfa35f] bg-[#fff8ec]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(255,255,255,.95),rgba(255,247,234,.72)_35%,rgba(241,171,91,.18)_100%)]" />
      <img src="/decorations/mandala.svg" alt="" aria-hidden="true" className="pointer-events-none absolute -left-24 -top-20 w-[340px] opacity-[.055] md:w-[460px]" />
      <img src="/decorations/lotus.svg" alt="" aria-hidden="true" className="pointer-events-none absolute bottom-4 left-1/2 hidden w-20 -translate-x-1/2 opacity-30 md:block" />
      <div className="relative mx-auto grid min-h-[430px] max-w-[1500px] items-center px-4 py-12 sm:px-6 md:min-h-[460px] lg:grid-cols-[44%_56%] lg:px-10 lg:py-0 xl:px-16">
        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="relative z-10 text-center lg:text-left">
          <div className="mb-5 flex items-center justify-center gap-4 text-xs font-bold uppercase tracking-[.28em] text-[#bf6b28] lg:justify-start">
            <span className="h-px w-12 bg-[#d8904f]" />
            <span>{eyebrow}</span>
            <span className="h-px w-12 bg-[#d8904f]" />
          </div>
          <h1 className="hindi text-4xl font-bold leading-[1.12] text-[#4b3427] sm:text-5xl lg:text-[58px]">
            {title}
            {highlight && <><br /><span className="text-[#d87a30]">{highlight}</span></>}
          </h1>
          <div className="mx-auto my-5 flex max-w-xs items-center justify-center gap-3 lg:mx-0">
            <span className="h-px flex-1 bg-orange-200" />
            <span className="text-xl text-[#d89f4f]">❀</span>
            <span className="h-px flex-1 bg-orange-200" />
          </div>
          <p className="hindi mx-auto max-w-xl text-[15px] font-medium leading-8 text-[#59483b] lg:mx-0 lg:text-base">
            {copy}
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} className="absolute inset-0 lg:relative lg:h-full">
          <img src={image} alt={imageAlt} className="h-full w-full object-cover object-center opacity-28 mix-blend-multiply lg:absolute lg:inset-0 lg:opacity-95" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#fff8ec] via-[#fff8ec]/82 to-transparent lg:from-[#fff8ec] lg:via-[#fff8ec]/44 lg:to-transparent" />
        </motion.div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#d89f4f] to-transparent" />
    </section>
  );
}
```

- [ ] **Step 3: Add Blogs to header navigation**

In `PremiumHeader`, change the `links` array to include `['Blogs', '/blogs']` between Gallery and Contact Us.

- [ ] **Step 4: Add Blogs to footer site links**

In `ReferenceFooter`, add `['Blogs', '/blogs']` between Gallery and Contact Us.

### Task 2: Homepage Hero, Metrics, Services, And WhatsApp CTA

**Files:**
- Modify: `components/SarakSite.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: existing `RefinedHome`, `HomeMissionSections`, `AnimatedCounter`, `.metrics-grid`, `.metric-card`.
- Produces: full-width non-stretched homepage hero, safer metric spacing, equal service image sizing, and updated WhatsApp CTA.

- [ ] **Step 1: Update homepage hero images to cover width**

In `RefinedHome`, update the hero section image classes:

```tsx
<img
  src="/sarak-hero-desktop.png"
  alt="Jain temple and revered Jain saints"
  className="absolute inset-0 hidden h-full w-full object-cover object-center md:block"
/>
<img
  src="/sarak-hero-mobile.png"
  alt="Guru Maharaj with Jain temple and saints"
  className="absolute inset-0 h-full w-full object-cover object-center md:hidden"
/>
```

- [ ] **Step 2: Tighten mobile metric spacing**

In `RefinedHome`, change the metric card inner text classes:

```tsx
<Icon className="mx-auto mb-1 text-[#f97316] transition duration-300 group-hover:scale-110 sm:mb-3" size={27} strokeWidth={1.7} />
<p className="display whitespace-nowrap text-2xl font-bold leading-none text-[#1f2937] sm:text-3xl sm:leading-normal xl:text-4xl">
  <AnimatedCounter value={v} />
</p>
<p className="mt-1 text-xs font-medium leading-none text-[#59616d] sm:mt-2 sm:text-sm sm:leading-normal">{l}</p>
```

- [ ] **Step 3: Ensure CSS supports mobile metric layout**

In `app/globals.css`, add inside the existing `@media (max-width: 767px)` block:

```css
.metrics-grid .metric-card {
  padding-top: 16%;
  padding-bottom: 12%;
}
```

- [ ] **Step 4: Normalize service image sizes**

In `HomeMissionSections`, replace the service image wrapper class with:

```tsx
className={`${i % 2 ? "lg:order-2" : ""} h-[220px] w-full overflow-hidden rounded-[26px] bg-orange-50 sm:h-[280px] lg:h-[320px]`}
```

- [ ] **Step 5: Update WhatsApp CTA styling**

In `HomeMissionSections`, update the CTA wrapper and logo block:

```tsx
className="relative mx-auto grid max-w-7xl items-center gap-7 overflow-hidden rounded-[26px] border border-[#0a6f63] bg-[#075E54] px-6 py-8 text-white shadow-[0_18px_45px_rgba(7,94,84,.22)] sm:px-9 md:grid-cols-[96px_1fr_auto] md:px-10 lg:gap-9 lg:px-12"
```

And replace the logo container with:

```tsx
<div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white p-2 shadow-lg shadow-green-950/20 md:mx-0">
  <img src="/sarak-logo-authentic.png" alt="SARAK Mission Jain Hravak" className="h-full w-full object-contain" />
</div>
```

### Task 3: About, Activities, Programs, And Contact Content

**Files:**
- Modify: `components/SarakSite.tsx`

**Interfaces:**
- Consumes: `PremiumPageHero`, `pageHeroImages`, existing `activities`, `ActivityCard`, `ContactStrip`, `Programs`, `AboutPage`.
- Produces: reusable heroes on About/Activities/Programs, Hindi activity lists split by status, improved contact strip.

- [ ] **Step 1: Replace About hero with `PremiumPageHero`**

At the start of `AboutPage`, replace the first `<section>` hero block with:

```tsx
<PremiumPageHero
  eyebrow="About SARAK"
  title="हमारी पहचान"
  highlight="हमारी विरासत"
  copy="सराक उत्कर्ष अभियान धर्म, शिक्षा और सेवा के माध्यम से सराक समाज को पुनः जैन संस्कारों और तीर्थ परंपरा से जोड़ने का संकल्प है।"
  image={pageHeroImages.about}
  imageAlt="भगवान की सुवर्ण मूर्ति"
/>
```

- [ ] **Step 2: Replace Activities hero**

In `Activities`, replace `PageHero` with:

```tsx
<PremiumPageHero
  eyebrow="Activities"
  title="सेवा से"
  highlight="समाज उत्थान"
  copy="गाँव-गाँव तक शिक्षा, स्वास्थ्य, संस्कार और साधर्मिक सेवा पहुँचाने वाली गतिविधियाँ।"
  image={pageHeroImages.activities}
  imageAlt="सराक सेवा गतिविधि"
/>
```

- [ ] **Step 3: Add Hindi activity groups**

Inside `Activities`, before `return`, add:

```tsx
const ongoingActivities = [
  { ...activities[1], title: "ग्राम शिक्षा अभियान", tag: "चल रही गतिविधि", description: "विद्यार्थियों को अध्ययन सामग्री, मार्गदर्शन और संस्कार शिक्षा से जोड़ने की सतत पहल।" },
  { ...activities[2], title: "स्वास्थ्य जांच शिविर", tag: "चल रही गतिविधि", description: "ग्रामीण परिवारों तक प्राथमिक स्वास्थ्य जांच और चिकित्सकीय परामर्श पहुँचाने का प्रयास।" },
  { ...activities[5], title: "युवा नेतृत्व शिविर", tag: "चल रही गतिविधि", description: "युवाओं में सेवा, अनुशासन और जैन मूल्यों पर आधारित नेतृत्व विकसित करने का कार्यक्रम।" },
];
const pastActivities = [
  { ...activities[0], title: "रक्तदान शिविर", tag: "पूर्व गतिविधि", description: "समाज के सहयोग से आयोजित रक्तदान अभियान, जिससे अनेक जरूरतमंदों को सहायता मिली।" },
  { ...activities[3], title: "अन्न वितरण सेवा", tag: "पूर्व गतिविधि", description: "जरूरतमंद परिवारों तक सम्मानपूर्वक अन्न सहायता पहुँचाने की सेवा।" },
  { ...activities[4], title: "महिला सशक्तिकरण कार्यशाला", tag: "पूर्व गतिविधि", description: "महिलाओं को आत्मविश्वास, कौशल और सामुदायिक सहयोग से जोड़ने वाली कार्यशाला।" },
];
```

- [ ] **Step 4: Render two activity sections**

Replace the current activities card grid with two `SectionHeading` blocks and two grids, one for `ongoingActivities`, one for `pastActivities`, each mapping to `ActivityCard`.

- [ ] **Step 5: Improve `ContactStrip`**

Replace the contact details in `ContactStrip` with cards using footer details:

```tsx
{[
  [Phone, "Call", "+91 97270 70787"],
  [Mail, "Email", "sarakutkarsh99@gmail.com"],
  [MapPin, "Location", "102 Blue Ribbon Building, near Harmony Residency, Vesu"],
].map(([Icon, label, value]: any) => (
  <div key={label} className="rounded-2xl border border-white/10 bg-white/8 p-5">
    <Icon className="text-saffron" />
    <p className="mt-4 text-[10px] font-bold uppercase tracking-[.2em] text-white/35">{label}</p>
    <p className="mt-2 text-sm font-semibold leading-6 text-white/80">{value}</p>
  </div>
))}
```

- [ ] **Step 6: Replace Programs hero**

In `Programs`, replace `PageHero` with:

```tsx
<PremiumPageHero
  eyebrow="Programs"
  title="सेवा के माध्यम से"
  highlight="समाज निर्माण"
  copy="हमारे विविध कार्यक्रम समाज के सर्वांगीण विकास के लिए समर्पित हैं। आइए, हम सब मिलकर जागरूक, संवेदनशील और सशक्त समाज के निर्माण में योगदान दें।"
  image={pageHeroImages.programs}
  imageAlt="जैन मंदिर परिसर"
/>
```

### Task 4: Blogs Page And Routing

**Files:**
- Modify: `components/SarakSite.tsx`

**Interfaces:**
- Consumes: `PremiumPageHero`, `pageHeroImages`, `SectionHeading`, `Button`.
- Produces: `BlogsPage()` and `/blogs` routing branch.

- [ ] **Step 1: Add dummy blog data and page component**

Add before `Contact`:

```tsx
const blogPosts = [
  { title: "सराक समाज की विरासत", category: "Heritage", image: "/history-of-sarak.jpg", excerpt: "सराक समाज की जैन परंपरा, इतिहास और वर्तमान अभियान को समझने का एक संक्षिप्त परिचय।" },
  { title: "सेवा क्यों आवश्यक है", category: "Seva", image: "/sarak-seva.jpg", excerpt: "साधर्मिक भक्ति और करुणा से समाज में स्थायी परिवर्तन कैसे लाया जा सकता है।" },
  { title: "नई पीढ़ी और संस्कार", category: "Education", image: "/sarak-education.jpg", excerpt: "युवा पीढ़ी को शिक्षा, नेतृत्व और जैन मूल्यों से जोड़ने की दिशा में अभियान की भूमिका।" },
] as const;

function BlogsPage() {
  return (
    <>
      <PremiumPageHero eyebrow="Blogs" title="विचार और" highlight="प्रेरणा" copy="सराक समाज, सेवा, शिक्षा और जैन संस्कृति से जुड़े लेख और विचार।" image={pageHeroImages.blogs} imageAlt="सराक इतिहास और विरासत" />
      <section className="bg-[#fffaf5] px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Latest articles" title="समाज से जुड़े विचार" />
          <div className="grid gap-6 md:grid-cols-3">
            {blogPosts.map((post) => (
              <motion.article {...reveal} whileHover={{ y: -6 }} key={post.title} className="group overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_14px_40px_rgba(92,57,32,.07)]">
                <div className="h-56 overflow-hidden bg-orange-50">
                  <img src={post.image} alt={post.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                </div>
                <div className="p-7">
                  <p className="text-xs font-bold uppercase tracking-[.2em] text-[#dc7d43]">{post.category}</p>
                  <h3 className="hindi mt-3 text-2xl font-bold text-[#4b2c20]">{post.title}</h3>
                  <p className="hindi mt-4 text-sm leading-7 text-[#6f6158]">{post.excerpt}</p>
                  <Link href="#" className="mt-6 inline-flex text-sm font-bold text-[#e66f2d]">पूरा लेख पढ़ें →</Link>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Add `/blogs` route branch**

In the `SarakSite` router, add:

```tsx
else if (parts[0] === "blogs") page = <BlogsPage />;
```

### Task 5: Verification

**Files:**
- Modify if needed: `scripts/verify-about-page.mjs`

**Interfaces:**
- Consumes: changed markup in `components/SarakSite.tsx`.
- Produces: verified build and notes about fallback assets.

- [ ] **Step 1: Run existing verification**

Run: `node scripts/verify-about-page.mjs`

Expected: Existing checks may fail if they still assert removed About hero details. If they fail only because the intended hero changed, update checks to assert `PremiumPageHero` and `pageHeroImages.about` usage instead.

- [ ] **Step 2: Run production build**

Run: `pnpm build`

Expected: Next.js build completes successfully.

- [ ] **Step 3: Report asset replacement paths**

Final response must state that exact attachments should be placed at:

```text
public/murti.png
public/programs.png
public/activities.png
```

## Self-Review

- Spec coverage: All requested homepage, About, Activities, Programs, Blogs, CTA, metrics, contact, and asset path requirements map to Tasks 1-5.
- Placeholder scan: No TBD/TODO placeholders are present. Dummy blog data is intentional per request.
- Type consistency: `pageHeroImages`, `PremiumPageHero`, and `BlogsPage` are consistently named across tasks.
