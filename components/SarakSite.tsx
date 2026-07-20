"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  Heart,
  Users,
  BookOpen,
  Stethoscope,
  Landmark,
  Copy,
  Check,
  ChevronDown,
  Play,
  HandHeart,
  MessageCircle,
} from "lucide-react";
import { activities, programs, gallery, images } from "@/lib/data";

const nav = [
  ["Home", "/"],
  ["Mission SARAK", "/#mission"],
  ["Activities", "/activities"],
  ["Programs", "/programs"],
  ["Donation", "/donation"],
  ["Gallery", "/gallery"],
  ["Contact", "/contact"],
];
const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
} as const;
function Logo() {
  return (
    <Link href="/" aria-label="SARAK Mission Jain Hravak" className="block">
      <span className="flex h-14 w-[174px] items-center justify-center overflow-hidden rounded-xl bg-white sm:w-[202px]">
        <img
          src="/sarak-logo.png"
          alt="SARAK Mission Jain Hravak"
          className="w-full scale-[1.34] object-contain"
        />
      </span>
    </Link>
  );
}
function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-orange-100/80 bg-white/90 backdrop-blur-2xl">
      <div className="mx-auto flex h-[82px] max-w-[1380px] items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center rounded-full border border-orange-100 bg-[#fff9f3] p-1.5 xl:flex">
          {nav.map(([n, h]) => {
            const route = h.split("#")[0];
            const active =
              route === "/"
                ? pathname === "/" && !h.includes("#")
                : pathname.startsWith(route);
            return (
              <Link
                key={h}
                href={h}
                className={`rounded-full px-4 py-2.5 text-[13px] font-semibold transition ${active ? "bg-white text-saffron shadow-sm ring-1 ring-orange-100" : "text-ink/60 hover:bg-white hover:text-saffron"}`}
              >
                {n}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/programs/join-paryushan"
            className="hidden items-center gap-2 rounded-full bg-saffron px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600 sm:inline-flex"
          >
            Join Paryushan <ArrowRight size={16} />
          </Link>
          <button
            aria-label="Menu"
            onClick={() => setOpen(!open)}
            className="grid h-11 w-11 place-items-center rounded-full bg-forest text-white xl:hidden"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-3 mb-3 grid rounded-3xl border border-orange-100 bg-white p-3 shadow-soft xl:hidden"
          >
            {nav.map(([n, h]) => (
              <Link
                onClick={() => setOpen(false)}
                key={h}
                href={h}
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-ink/70 hover:bg-orange-50 hover:text-saffron"
              >
                {n}
              </Link>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
function Footer() {
  return (
    <footer className="bg-[#143d31] px-5 pb-8 pt-20 text-white">
      <div className="mx-auto grid max-w-7xl gap-12 border-b border-white/10 pb-16 md:grid-cols-[1.4fr_.8fr_1fr]">
        <div>
          <Logo />
          <p className="mt-6 max-w-sm text-sm leading-7 text-white/65">
            Since 2009, SARAK Utkarsh Abhiyan has worked to reconnect the SARAK
            community with Jain dharma through faith, education and collective
            uplift.
          </p>
          <div className="mt-6 flex gap-2">
            {[Users, Heart, Play].map((I, i) => (
              <button
                aria-label={`Social link ${i + 1}`}
                key={i}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/70 transition hover:border-orange-300 hover:text-orange-300"
              >
                <I size={17} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4 className="mb-5 text-xs font-bold uppercase tracking-[.2em] text-orange-300">
            Explore
          </h4>
          <div className="grid gap-3 text-sm text-white/65">
            {nav.map(([n, h]) => (
              <Link key={h} href={h} className="hover:text-white">
                {n}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h4 className="mb-5 text-xs font-bold uppercase tracking-[.2em] text-orange-300">
            Connect
          </h4>
          <div className="space-y-4 text-sm leading-6 text-white/65">
            <p className="flex gap-3">
              <Phone size={17} />
              +91 97270 70787
            </p>
            <p className="flex gap-3">
              <Mail size={17} />
              sarakutkarsh99@gmail.com
            </p>
            <p className="flex gap-3">
              <MapPin size={17} />
              102 Blue Ribbon Building, near Harmony Residency, Vesu
            </p>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-3 pt-8 text-xs text-white/40 sm:flex-row sm:justify-between">
        <p>© 2026 SARAK Utkarsh Abhiyan</p>
        <p>Mission Jain Hravak • Ahimsa • Seva</p>
      </div>
    </footer>
  );
}
function SectionHeading({
  eyebrow,
  title,
  copy,
  center = false,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  center?: boolean;
}) {
  return (
    <motion.div
      {...reveal}
      className={
        center ? "mx-auto mb-12 max-w-3xl text-center" : "mb-12 max-w-2xl"
      }
    >
      <p className="mb-4 text-xs font-bold uppercase tracking-[.22em] text-saffron">
        {eyebrow}
      </p>
      <h2 className="display text-4xl font-bold leading-[1.05] sm:text-5xl">
        {title}
      </h2>
      {copy && <p className="mt-5 text-base leading-7 text-ink/55">{copy}</p>}
    </motion.div>
  );
}
function Button({
  children,
  href = "#",
  dark = false,
}: {
  children: React.ReactNode;
  href?: string;
  dark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold transition hover:-translate-y-0.5 ${dark ? "bg-forest text-white shadow-lg shadow-green-950/10" : "bg-saffron text-white shadow-lg shadow-orange-500/20"}`}
    >
      {children}
      <ArrowRight size={17} />
    </Link>
  );
}
function PageHero({
  title,
  copy,
  image = images.hero,
  kicker = "Mission Jain Hravak",
}: {
  title: string;
  copy: string;
  image?: string;
  kicker?: string;
}) {
  return (
    <section className="relative mt-[84px] min-h-[510px] overflow-hidden bg-forest text-white">
      <motion.img
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.5 }}
        src={image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-70"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#174b3b]/95 via-[#245c49]/70 to-orange-900/15" />
      <div className="relative mx-auto flex min-h-[510px] max-w-7xl items-end px-5 pb-20 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl"
        >
          <p className="mb-5 text-xs font-bold uppercase tracking-[.25em] text-orange-200">
            {kicker}
          </p>
          <h1 className="display text-5xl font-bold leading-[.96] sm:text-7xl">
            {title}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/80">
            {copy}
          </p>
        </motion.div>
      </div>
      <div className="absolute -bottom-1 left-0 h-12 w-full rounded-t-[60%] bg-cream" />
    </section>
  );
}
function AnimatedCounter({ value }: { value: number }) {
  const [n, setN] = useState(0);
  const counterRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = counterRef.current;
    if (!element) return;
    let frame = 0;
    let started = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started) return;
        started = true;
        const startedAt = performance.now();
        const duration = 680;
        const animate = (now: number) => {
          const progress = Math.min((now - startedAt) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 4);
          setN(Math.round(value * eased));
          if (progress < 1) frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
        observer.disconnect();
      },
      { threshold: 0.12, rootMargin: "0px 1000px -8% 1000px" },
    );
    observer.observe(element.closest(".metrics-grid") ?? element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);
  return <span ref={counterRef}>{n.toLocaleString("en-IN")}+</span>;
}
function ActivityCard({
  a,
}: {
  a: (typeof activities)[0] & { href?: string };
}) {
  return (
    <motion.article
      {...reveal}
      whileHover={{ y: -8 }}
      className="group overflow-hidden rounded-[28px] bg-white shadow-soft"
    >
      <div className="h-64 overflow-hidden">
        <img
          src={a.image}
          alt={a.title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
      </div>
      <div className="p-7">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-saffron">
          {a.tag}
        </p>
        <h3 className="display text-2xl font-bold">{a.title}</h3>
        <p className="mt-3 text-sm leading-6 text-ink/55">{a.description}</p>
        <Link
          href={a.href ?? `/activities/${a.slug}`}
          className="mt-6 inline-flex items-center gap-2 rounded-xl px-0 py-2 text-sm font-bold text-ink transition group-hover:bg-saffron group-hover:px-4 group-hover:text-white"
        >
          Read story <ArrowRight size={16} />
        </Link>
      </div>
    </motion.article>
  );
}
function ProgramCard({ p }: { p: (typeof programs)[0] }) {
  return (
    <motion.article
      {...reveal}
      whileHover={{ y: -6 }}
      className="group relative min-h-[440px] overflow-hidden rounded-[30px] bg-ink text-white"
    >
      <img
        src={p.image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-65 transition duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-7">
        <span
          className={`mb-5 inline-flex rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${p.state === "closed" ? "bg-white/15 backdrop-blur" : "bg-saffron"}`}
        >
          {p.deadline}
        </span>
        <h3 className="display text-3xl font-bold">{p.title}</h3>
        <p className="mt-3 text-sm leading-6 text-white/65">{p.description}</p>
        <button
          onClick={() =>
            p.state === "open" && (window.location.href = `/programs/${p.slug}`)
          }
          disabled={p.state === "closed"}
          className={`mt-6 w-full rounded-xl py-3.5 text-sm font-bold ${p.state === "closed" ? "cursor-not-allowed bg-white/15 text-white/60" : "bg-white text-ink hover:bg-saffron hover:text-white"}`}
        >
          {p.state === "closed" ? "Registrations Closed" : "Join Program"}
        </button>
      </div>
    </motion.article>
  );
}
function GalleryBento({
  limit = false,
  onOpen,
}: {
  limit?: boolean;
  onOpen?: (s: string) => void;
}) {
  const list = limit ? gallery.slice(0, 5) : gallery;
  return (
    <div
      className={
        limit
          ? "grid auto-rows-[180px] grid-cols-2 gap-3 md:grid-cols-4"
          : "masonry"
      }
    >
      {list.map((src, i) => (
        <motion.button
          {...reveal}
          key={i}
          onClick={() => onOpen?.(src)}
          className={`group w-full overflow-hidden rounded-2xl bg-black ${limit ? (i === 0 ? "col-span-2 row-span-2" : i === 3 ? "row-span-2" : "") : ""}`}
        >
          <img
            src={src}
            alt={`SARAK community moment ${i + 1}`}
            className={`h-full w-full object-cover transition duration-700 group-hover:scale-105 group-hover:opacity-80 ${limit ? "" : "min-h-[260px]"}`}
            style={!limit ? { height: 260 + (i % 3) * 80 } : undefined}
          />
        </motion.button>
      ))}
    </div>
  );
}
function ContactStrip() {
  return (
    <section className="px-5 py-24">
      <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[32px] bg-[#075E54] text-white shadow-[0_24px_70px_rgba(7,94,84,.22)] lg:grid-cols-[.72fr_1.28fr]">
        <div className="p-8 sm:p-12">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-saffron">
            We are listening
          </p>
          <h2 className="display mt-4 text-4xl font-bold">
            Let’s build a more connected community.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/65">
            Reach the SARAK team for programs, seva, donations or local community
            coordination.
          </p>
          <div className="mt-7">
            <Button href="/contact">Contact SARAK</Button>
          </div>
        </div>
        <div className="grid gap-3 border-t border-white/10 p-6 text-sm text-white/60 sm:grid-cols-3 lg:border-l lg:border-t-0 lg:p-6">
          {[
            [Phone, "Call", "+91 97270 70787"],
            [Mail, "Email", "sarakutkarsh99@gmail.com"],
            [
              MapPin,
              "Location",
              "102 Blue Ribbon Building, near Harmony Residency, Vesu",
            ],
          ].map(([Icon, label, value]: any) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/8 p-4"
            >
              <Icon className="text-saffron" />
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[.2em] text-white/35">
                {label}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/80">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
function Home() {
  return (
    <>
      <section className="relative min-h-[850px] overflow-hidden bg-ink pt-32 text-white">
        <img
          src={images.hero}
          alt="Jain temple"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/10" />
        <div className="relative mx-auto flex min-h-[700px] max-w-7xl items-center px-5">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9 }}
            className="max-w-4xl"
          >
            <div className="mb-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[.24em] text-orange-200">
              <span className="h-px w-10 bg-saffron" />
              Seva • Sanskar • Sangh
            </div>
            <h1 className="display text-6xl font-bold leading-[.92] sm:text-8xl lg:text-[104px]">
              Rooted in values.
              <br />
              <span className="editorial font-semibold italic text-orange-300">
                Moving forward.
              </span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-7 text-white/70">
              A modern home for the Jain community—connecting generations
              through compassionate service, purposeful programs and timeless
              wisdom.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button href="/programs/join-sarak">Join the movement</Button>
              <Button href="/activities" dark>
                Explore our impact
              </Button>
            </div>
          </motion.div>
        </div>
        <div className="absolute -bottom-1 h-16 w-full rounded-t-[55%] bg-cream" />
      </section>
      <section className="px-5 py-24">
        <SectionHeading
          eyebrow="Impact in motion"
          title="Service measured in lives touched."
          center
        />
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 md:grid-cols-5">
          {[
            [18, "Years"],
            [150, "Programs"],
            [10000, "Members"],
            [800, "Villages"],
            [1000, "Volunteers"],
          ].map(([v, l], i) => (
            <motion.div
              {...reveal}
              transition={{ delay: i * 0.06 }}
              key={l}
              className="rounded-2xl border border-black/5 bg-white p-6 text-center shadow-sm"
            >
              <div>
                <p className="display text-3xl font-bold sm:text-4xl">
                  <AnimatedCounter value={v as number} />
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-ink/40">
                  {l}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
      <section className="bg-white px-5 py-28">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Our story"
            title="Tradition, translated for today."
            copy="We bring the Jain spirit of compassion and selfless service into a connected, contemporary platform."
          />
          <div className="grid gap-5 md:grid-cols-3">
            {[
              [
                images.temple,
                "Who we are",
                "A values-led community grounded in ahimsa and belonging.",
              ],
              [
                images.volunteer,
                "What we do",
                "We turn shared intent into meaningful action at local scale.",
              ],
              [
                images.youth,
                "What people say",
                "“SARAK gave our family a community that feels like home.”",
              ],
            ].map((x, i) => (
              <motion.article
                {...reveal}
                whileHover={{ y: -8 }}
                key={x[1]}
                className="group overflow-hidden rounded-[28px] bg-cream"
              >
                <div>
                  <img
                    src={x[0]}
                    alt=""
                    className="h-52 w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="p-7">
                    <span className="text-xs font-bold text-saffron">
                      0{i + 1}
                    </span>
                    <h3 className="display mt-3 text-2xl font-bold uppercase">
                      {x[1]}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-ink/55">{x[2]}</p>
                    <p className="mt-5 text-sm font-bold">Read more →</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
      <section className="px-5 py-28">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Featured activities"
            title="Compassion, made practical."
          />
          <div className="grid gap-5 md:grid-cols-3">
            {activities.slice(0, 3).map((a) => (
              <ActivityCard key={a.slug} a={a} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button href="/activities">View all activities</Button>
          </div>
        </div>
      </section>
      <section className="bg-white px-5 py-28">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Current programs"
            title="Find your way to participate."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {programs.map((p) => (
              <ProgramCard key={p.slug} p={p} />
            ))}
          </div>
        </div>
      </section>
      <section className="px-5 py-28">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="From the community"
            title="Moments that become memories."
          />
          <GalleryBento limit />
          <div className="mt-10 text-center">
            <Button href="/gallery">Explore gallery</Button>
          </div>
        </div>
      </section>
      <ContactStrip />
    </>
  );
}
const activityDisplayContent = {
  "blood-donation-camp": {
    title: "रक्तदान शिविर",
    tag: "Seva Gatividhi",
    description:
      "समाज के सहयोग से आयोजित रक्तदान अभियान, जिससे अनेक जरूरतमंदों को समय पर सहायता मिलती है।",
  },
  "village-education-initiative": {
    title: "ग्राम शिक्षा अभियान",
    tag: "Shiksha Gatividhi",
    description:
      "विद्यार्थियों को अध्ययन सामग्री, मार्गदर्शन और संस्कार शिक्षा से जोड़ने की सतत पहल।",
  },
  "medical-checkup-camp": {
    title: "स्वास्थ्य जांच शिविर",
    tag: "Swasthya Gatividhi",
    description:
      "ग्रामीण परिवारों तक प्राथमिक स्वास्थ्य जांच और चिकित्सकीय परामर्श पहुँचाने का प्रयास।",
  },
  "food-distribution": {
    title: "अन्न वितरण सेवा",
    tag: "Seva Gatividhi",
    description:
      "जरूरतमंद परिवारों तक सम्मानपूर्वक अन्न सहायता पहुँचाने की सेवा।",
  },
  "women-empowerment-workshop": {
    title: "महिला सशक्तिकरण कार्यशाला",
    tag: "Mahila Gatividhi",
    description:
      "महिलाओं को आत्मविश्वास, कौशल और सामुदायिक सहयोग से जोड़ने वाली कार्यशाला।",
  },
  "youth-leadership-camp": {
    title: "युवा नेतृत्व शिविर",
    tag: "Yuva Gatividhi",
    description:
      "युवाओं में सेवा, अनुशासन और जैन मूल्यों पर आधारित नेतृत्व विकसित करने का कार्यक्रम।",
  },
} as const;

const allActivityCards = activities.map((activity) => ({
  ...activity,
  ...activityDisplayContent[
    activity.slug as keyof typeof activityDisplayContent
  ],
}));

const pastActivityCards = [
  {
    slug: "past-shrutgyan-mahotsav",
    href: "/activities/past#past-shrutgyan-mahotsav",
    title: "श्रुतज्ञान महोत्सव",
    tag: "Heritage Gatividhi",
    image: activities[0].image,
    description:
      "शास्त्र अध्ययन, आराधना और संस्कार जागरण के लिए आयोजित प्रेरक महोत्सव।",
  },
  {
    slug: "past-gram-shibir",
    href: "/activities/past#past-gram-shibir",
    title: "ग्राम शिविर",
    tag: "Sadharmik Seva",
    image: activities[5].image,
    description:
      "गाँव-गाँव जाकर धर्म, संस्कार और शिक्षा का प्रचार-प्रसार करने वाली सेवा यात्रा।",
  },
  {
    slug: "past-shiksha-sahyog",
    href: "/activities/past#past-shiksha-sahyog",
    title: "शिक्षा सहयोग अभियान",
    tag: "Shiksha Gatividhi",
    image: activities[1].image,
    description:
      "विद्यार्थियों को शिक्षा सामग्री, मार्गदर्शन और सतत प्रेरणा प्रदान करने की पहल।",
  },
  {
    slug: "past-ann-seva",
    href: "/activities/past#past-ann-seva",
    title: "अन्न वितरण सेवा",
    tag: "Seva Gatividhi",
    image: activities[3].image,
    description:
      "जरूरतमंद परिवारों तक सम्मानपूर्वक अन्न सहायता पहुँचाने की पूर्ण हुई सेवा।",
  },
  {
    slug: "past-mahila-karyashala",
    href: "/activities/past#past-mahila-karyashala",
    title: "महिला सशक्तिकरण कार्यशाला",
    tag: "Mahila Gatividhi",
    image: activities[4].image,
    description:
      "महिलाओं को आत्मविश्वास, कौशल और सामुदायिक सहयोग से जोड़ने वाली कार्यशाला।",
  },
  {
    slug: "past-swasthya-janch",
    href: "/activities/past#past-swasthya-janch",
    title: "स्वास्थ्य जांच शिविर",
    tag: "Swasthya Gatividhi",
    image: activities[2].image,
    description:
      "ग्रामीण परिवारों के लिए चिकित्सकीय परामर्श और प्राथमिक जांच की सेवा।",
  },
];

function Activities() {
  const ongoingActivities = allActivityCards;
  const pastActivitiesPreview = pastActivityCards.slice(0, 3);

  return (
    <>
      <PremiumPageHero
        eyebrow="Activities"
        title="सेवा से"
        highlight="समाज उत्थान"
        copy="गाँव-गाँव तक शिक्षा, स्वास्थ्य, संस्कार और साधर्मिक सेवा पहुँचाने वाली गतिविधियाँ।"
        image={pageHeroImages.activities}
        imageAlt="सराक सेवा गतिविधि"
        imageClassName="object-[56%_center] sm:object-[58%_center] lg:object-center"
      />
      <section className="px-5 py-24">
        <div className="mx-auto max-w-7xl space-y-20">
          <SectionHeading
            eyebrow="Ongoing activities"
            title="अभी चल रही सेवा पहल"
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {ongoingActivities.map((a) => (
              <ActivityCard key={a.slug} a={a} />
            ))}
          </div>
          <SectionHeading
            eyebrow="Past activities"
            title="पूर्ण हुई प्रेरक गतिविधियाँ"
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pastActivitiesPreview.map((a) => (
              <ActivityCard key={a.slug} a={a} />
            ))}
          </div>
          <div className="text-center">
            <Button href="/activities/past">View all past activities</Button>
          </div>
        </div>
      </section>
      <ContactStrip />
    </>
  );
}

function PastActivitiesPage() {
  return (
    <>
      <PremiumPageHero
        eyebrow="Past Activities"
        title="पूर्व सेवा"
        highlight="गतिविधियाँ"
        copy="सराक परिवार की वे प्रेरक गतिविधियाँ जिन्होंने गाँवों, परिवारों और साधर्मिक जीवन में सकारात्मक परिवर्तन जोड़ा।"
        image={pageHeroImages.activities}
        imageAlt="पूर्व सराक गतिविधियाँ"
        imageClassName="object-[56%_center] sm:object-[58%_center] lg:object-center"
      />
      <section className="px-5 py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Archive" title="पूर्ण हुई गतिविधियाँ" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pastActivityCards.map((a) => (
              <ActivityCard key={a.slug} a={a} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function ActivityDetail({ slug }: { slug: string }) {
  const a = allActivityCards.find((x) => x.slug === slug) || allActivityCards[0];
  return (
    <>
      <PremiumPageHero
        eyebrow={a.tag}
        title={a.title}
        copy={a.description}
        image={a.image}
        imageAlt={a.title}
        imageClassName="object-[50%_center] sm:object-[54%_center] lg:object-center"
      />
      <div className="bg-cream px-5 pt-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/activities"
            className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-bold text-[#d87a30] shadow-sm transition hover:bg-saffron hover:text-white"
          >
            ← Back to Activities
          </Link>
        </div>
      </div>
      <section className="px-5 py-24">
        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <SectionHeading
              eyebrow="Overview"
              title="Care, organised with purpose."
              copy="This initiative brings together trusted medical partners, trained volunteers and local community leaders to create an experience rooted in dignity and measurable impact."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "Increase access for underserved families",
                "Create awareness through education",
                "Build a reliable volunteer network",
                "Deliver transparent, lasting outcomes",
              ].map((x, i) => (
                <div
                  key={x}
                  className="rounded-2xl bg-white p-5 text-sm font-semibold"
                >
                  <span className="mr-3 text-saffron">0{i + 1}</span>
                  {x}
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-[32px]">
            <img
              src={a.image}
              alt={a.title}
              className="h-full min-h-[480px] w-full object-cover"
            />
          </div>
        </div>
      </section>
      <section className="bg-white px-5 py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Field notes" title="A closer look." />
          <GalleryBento />
          <div className="mt-12 grid items-center gap-8 rounded-[28px] border border-orange-100 bg-[#fff7ef] p-5 shadow-[0_18px_55px_rgba(91,54,30,.12)] lg:grid-cols-[1.05fr_.95fr] lg:p-8">
            <div className="aspect-video overflow-hidden rounded-2xl bg-black">
              <iframe
                src="https://www.youtube.com/embed/aukUpgwN53c?mute=1&rel=0&modestbranding=1"
                title={`${a.title} YouTube preview`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                loading="lazy"
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.22em] text-saffron">
                YouTube preview
              </p>
              <h3 className="hindi mt-3 text-3xl font-bold text-[#4b2c20]">
                गतिविधि की झलक
              </h3>
              <p className="hindi mt-4 text-sm leading-7 text-[#6f6158]">
                इस गतिविधि से जुड़े सेवा भाव, सहभागिता और समुदाय के अनुभवों की झलक यहाँ देखें।
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="px-5 py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Keep exploring"
            title="Related activities."
          />
          <div className="flex snap-x gap-5 overflow-x-auto pb-6 hide-scroll">
            {allActivityCards
              .filter((x) => x.slug !== a.slug)
              .slice(0, 3)
              .map((x) => (
                <div className="min-w-[310px] max-w-sm" key={x.slug}>
                  <ActivityCard a={x} />
                </div>
              ))}
          </div>
        </div>
      </section>
    </>
  );
}
function Programs() {
  return (
    <>
      <PremiumPageHero
        eyebrow="Programs"
        title="सेवा के माध्यम से"
        highlight="समाज निर्माण"
        copy="हमारे विविध कार्यक्रम समाज के सर्वांगीण विकास के लिए समर्पित हैं। आइए, हम सब मिलकर जागरूक, संवेदनशील और सशक्त समाज के निर्माण में योगदान दें।"
        image={pageHeroImages.programs}
        imageAlt="जैन मंदिर परिसर"
        imageClassName="object-[60%_center] sm:object-[62%_center] lg:object-center"
      />
      <section className="px-5 py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Open now"
            title="Current programs."
            copy="Every program is designed as a clear, welcoming pathway into community life."
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {programs.map((p) => (
              <ProgramCard key={p.slug} p={p} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
function ProgramDetail({ slug }: { slug: string }) {
  const p = programs.find((x) => x.slug === slug) || programs[0];
  const [modal, setModal] = useState(false);
  return (
    <>
      <PremiumPageHero
        eyebrow="Current program"
        title={p.title}
        highlight="कार्यक्रम"
        copy={p.description}
        image={p.image}
        imageAlt={p.title}
        imageClassName="object-[58%_center] sm:object-[60%_center] lg:object-center"
      />
      <section className="px-5 py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_340px]">
          <div className="space-y-16">
            <SectionHeading
              eyebrow="Program overview"
              title="Show up. Learn. Contribute."
              copy="A thoughtfully facilitated community experience that balances personal growth, meaningful service and genuine connection."
            />
            <Info
              title="Objectives"
              items={[
                "Deepen connection to Jain values",
                "Create practical avenues for seva",
                "Build friendships across generations",
              ]}
            />
            <Info
              title="Eligibility & benefits"
              items={[
                "Open to individuals and families",
                "Curated learning and mentorship",
                "Community recognition and support network",
              ]}
            />
            <div>
              <h2 className="display mb-8 text-4xl font-bold">Your journey</h2>
              {[
                "Submit interest",
                "Welcome conversation",
                "Orientation",
                "Begin your journey",
              ].map((x, i) => (
                <div
                  key={x}
                  className="flex gap-5 border-l border-orange-200 pb-8 pl-7 last:pb-0"
                >
                  <span className="-ml-[43px] grid h-8 w-8 place-items-center rounded-full bg-saffron text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-bold">{x}</h3>
                    <p className="mt-1 text-sm text-ink/50">
                      A simple, guided step with the SARAK team.
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <FAQ />
          </div>
          <aside>
            <div className="sticky top-28 rounded-[28px] bg-ink p-7 text-white">
              <p className="text-xs font-bold uppercase tracking-wider text-saffron">
                {p.deadline}
              </p>
              <h3 className="display mt-4 text-3xl font-bold">
                Ready to join?
              </h3>
              <p className="mt-3 text-sm leading-6 text-white/55">
                Take the first step. The SARAK team will guide you from there.
              </p>
              <button
                onClick={() => setModal(true)}
                className="mt-7 w-full rounded-xl bg-saffron py-4 text-sm font-bold"
              >
                Register now
              </button>
            </div>
          </aside>
        </div>
      </section>
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-5 backdrop-blur">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="max-w-md rounded-[28px] bg-white p-8 text-center"
            >
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-orange-100 text-saffron">
                <HandHeart />
              </div>
              <h3 className="display mt-5 text-3xl font-bold">
                Registration form coming soon.
              </h3>
              <p className="mt-3 text-sm leading-6 text-ink/55">
                We’re preparing a seamless registration experience. Please check
                back shortly.
              </p>
              <button
                onClick={() => setModal(false)}
                className="mt-7 rounded-xl bg-ink px-7 py-3 text-sm font-bold text-white"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
function Info({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="display mb-7 text-4xl font-bold">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((x) => (
          <div
            key={x}
            className="flex gap-3 rounded-2xl bg-white p-5 text-sm font-semibold"
          >
            <Check className="text-forest" size={18} />
            {x}
          </div>
        ))}
      </div>
    </div>
  );
}
function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <div>
      <h2 className="display mb-7 text-4xl font-bold">Frequently asked</h2>
      {[
        "Is there a participation fee?",
        "Can families register together?",
        "Do I need prior volunteering experience?",
      ].map((q, i) => (
        <div key={q} className="border-b border-black/10">
          <button
            onClick={() => setOpen(open === i ? -1 : i)}
            className="flex w-full items-center justify-between py-5 text-left font-bold"
          >
            {q}
            <ChevronDown
              className={`transition ${open === i ? "rotate-180" : ""}`}
            />
          </button>
          {open === i && (
            <p className="pb-5 text-sm leading-6 text-ink/55">
              No prior experience is required. Our team shares all relevant
              details during orientation and supports you throughout.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

const donationSchemes = [
  ["एक साल के लिए एक गाम दत्तक", "5,55,000", "पांच लाख पचपन हजार"],
  ["पाठशाला शुभेच्छक (वार्षिक)", "1,08,000", "एक लाख आठ हजार"],
  ["आयंबिल ओली शुभेच्छक", "72,000", "बहत्तर हजार"],
  ["पर्युषण पर्व शुभेच्छक", "1,08,000", "एक लाख आठ हजार"],
  ["शिखरजी तीर्थ यात्रा", "72,000", "बहत्तर हजार"],
  ["पंचानिका महोत्सव एवं ग्राम शिबिर", "55,000", "पचपन हजार"],
  ["पाठशाला शुभेच्छक (मासिक)", "9,000", "नौ हजार"],
  ["एक साधर्मिक को धर्म के रंग में रंगना", "2,500", "ढाई हजार"],
] as const;

const schemeImages = [
  "/DJI_0828.JPG",
  "/DSC_0615.JPG",
  "/DSC_0493.JPG",
  "/DSC_0461.JPG",
  "/DSC_7026.JPG",
  "/DSC_0030.JPG",
  "/sarak-education.jpg",
  "/sarak-seva.jpg",
] as const;

const donationBankDetailsText = [
  "SHREE SAMASTA SWET MURTI JAIN SANGH SAMETSHIKHAR TIRTH TRUST",
  "Bank: IDFC BANK",
  "A/c: 10075814963",
  "Branch: PALDI",
  "IFSC: IDFB0040311",
  "Contact: 98258 60488 / 94094 24509",
].join("\n");

function Donation() {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <PremiumPageHero
        eyebrow="Donation"
        title="दान से"
        highlight="धर्म सेवा"
        copy="हर योगदान शिक्षा, स्वास्थ्य, तीर्थ संरक्षण और साधर्मिक सेवा के कार्यों को आगे बढ़ाता है।"
        image={images.food}
        imageAlt="दान और सेवा"
        imageClassName="object-[55%_center] sm:object-[58%_center] lg:object-center"
      />
      <section className="px-5 py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Donation schemes"
            title="धर्म सेवा के प्रमुख दान अवसर"
            copy="स्रोत वेबसाइट पर दिए गए दान विकल्पों को हमारी SARAK थीम में व्यवस्थित रूप से प्रस्तुत किया गया है।"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {donationSchemes.map(([name, amount, words], i) => {
              const Icon = [Landmark, BookOpen, Heart, HandHeart][i % 4];
              return (
              <motion.div
                {...reveal}
                key={name}
                className="group relative min-h-[300px] overflow-hidden rounded-[26px] border border-orange-100 bg-ink p-7 text-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(249,115,22,.13)]"
              >
                <img
                  src={schemeImages[i]}
                  alt={name}
                  className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
                <div className="relative z-10 flex min-h-[246px] flex-col justify-end">
                  <Icon className="mb-5 text-saffron" />
                  <h3 className="hindi text-xl font-bold leading-8 text-white">
                    {name}
                  </h3>
                  <p className="display mt-5 text-3xl font-bold text-orange-300">
                    ₹{amount}
                  </p>
                  <p className="hindi mt-2 text-sm leading-6 text-white/75">
                    {words}
                  </p>
                </div>
              </motion.div>
            );})}
          </div>
          <div className="mt-16 grid overflow-hidden rounded-[32px] bg-ink text-white lg:grid-cols-[1.2fr_.8fr]">
            <div className="p-8 sm:p-12">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-saffron">
                Bank transfer
              </p>
              <h2 className="display mt-4 text-4xl font-bold">
                Secure contribution details
              </h2>
              <dl className="mt-8 grid gap-5 text-sm sm:grid-cols-2">
                {[
                  [
                    "Account Name",
                    "SHREE SAMASTA SWET MURTI JAIN SANGH SAMETSHIKHAR TIRTH TRUST",
                  ],
                  ["Bank", "IDFC BANK"],
                  ["Branch", "PALDI"],
                  ["Account Number", "10075814963"],
                  ["IFSC", "IDFB0040311"],
                  ["Contact", "98258 60488 / 94094 24509"],
                ].map(([a, b]) => (
                  <div key={a}>
                    <dt className="text-[10px] uppercase tracking-wider text-white/35">
                      {a}
                    </dt>
                    <dd className="mt-1 font-semibold">{b}</dd>
                  </div>
                ))}
              </dl>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(donationBankDetailsText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="mt-8 flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-bold"
              >
                {copied ? <Check /> : <Copy />}
                {copied ? "Copied" : "Copy bank details"}
              </button>
            </div>
            <div className="grid place-items-center bg-white/5 p-10">
              <div className="text-center">
                <div className="mx-auto overflow-hidden rounded-2xl bg-white p-3 shadow-lg shadow-black/10">
                  <img
                    src="https://sarakabhiyan.org/img/donation/donation-QR%20Code.png"
                    alt="Donation QR Code"
                    className="h-44 w-44 object-contain"
                  />
                </div>
                <button className="mt-6 w-full rounded-xl bg-saffron py-4 text-sm font-bold">
                  Donate now
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
function GalleryPage() {
  const [light, setLight] = useState("");
  return (
    <>
      <PremiumPageHero
        eyebrow="Gallery"
        title="स्मृतियों का"
        highlight="जीवंत संग्रह"
        copy="सेवा, उत्सव और समुदाय के वे क्षण जो सराक परिवार की यात्रा को जीवंत बनाते हैं।"
        image="/DSC_7026.JPG"
        imageAlt="सराक समुदाय की स्मृतियाँ"
        titleClassName="leading-[1.24]"
        imageClassName="object-[48%_center] sm:object-[52%_center] lg:object-center"
      />
      <section className="px-5 py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Community gallery"
            title="Moments worth keeping."
          />
          <GalleryBento onOpen={setLight} />
        </div>
      </section>
      <AnimatePresence>
        {light && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLight("")}
            className="fixed inset-0 z-[80] grid cursor-zoom-out place-items-center bg-black/90 p-5"
          >
            <button className="absolute right-6 top-6 text-white">
              <X />
            </button>
            <motion.img
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              src={light}
              alt="Gallery preview"
              className="max-h-[85vh] max-w-[95vw] rounded-2xl object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const blogPosts = [
  {
    title: "सराक समाज की विरासत",
    category: "Heritage",
    image: "/history-of-sarak.jpg",
    excerpt:
      "सराक समाज की जैन परंपरा, इतिहास और वर्तमान अभियान को समझने का एक संक्षिप्त परिचय।",
  },
  {
    title: "सेवा क्यों आवश्यक है",
    category: "Seva",
    image: "/sarak-seva.jpg",
    excerpt:
      "साधर्मिक भक्ति और करुणा से समाज में स्थायी परिवर्तन कैसे लाया जा सकता है।",
  },
  {
    title: "नई पीढ़ी और संस्कार",
    category: "Education",
    image: "/sarak-education.jpg",
    excerpt:
      "युवा पीढ़ी को शिक्षा, नेतृत्व और जैन मूल्यों से जोड़ने की दिशा में अभियान की भूमिका।",
  },
] as const;

function BlogsPage() {
  return (
    <>
      <PremiumPageHero
        eyebrow="Blogs"
        title="विचार और"
        highlight="प्रेरणा"
        copy="सराक समाज, सेवा, शिक्षा और जैन संस्कृति से जुड़े लेख और विचार।"
        image={pageHeroImages.blogs}
        imageAlt="सराक इतिहास और विरासत"
        imageClassName="object-[52%_center] sm:object-[54%_center] lg:object-center"
      />
      <section className="bg-[#fffaf5] px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Latest articles" title="समाज से जुड़े विचार" />
          <div className="grid gap-6 md:grid-cols-3">
            {blogPosts.map((post) => (
              <motion.article
                {...reveal}
                whileHover={{ y: -6 }}
                key={post.title}
                className="group overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_14px_40px_rgba(92,57,32,.07)]"
              >
                <div className="h-56 overflow-hidden bg-orange-50">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-7">
                  <p className="text-xs font-bold uppercase tracking-[.2em] text-[#dc7d43]">
                    {post.category}
                  </p>
                  <h3 className="hindi mt-3 text-2xl font-bold text-[#4b2c20]">
                    {post.title}
                  </h3>
                  <p className="hindi mt-4 text-sm leading-7 text-[#6f6158]">
                    {post.excerpt}
                  </p>
                  <Link
                    href="#"
                    className="mt-6 inline-flex text-sm font-bold text-[#e66f2d]"
                  >
                    पूरा लेख पढ़ें →
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

const contactGroups = [
  {
    title: "For Donation",
    people: [
      ["Nareshbhai Sheth (Deesa)", "+91 94094 24509"],
      ["Sanjaybhai Vora (Surat)", "+91 9825263722"],
    ],
  },
  {
    title: "For Jinalay Nirman/Jirnodhar",
    people: [
      ["Nareshbhai Sheth (Deesa)", "+91 94094 24509"],
      ["Sanjaybhai Vora (Surat)", "+91 9825263722"],
    ],
  },
  {
    title: "For Upashray Nirman",
    people: [
      ["Sanjaybhai Vora (Surat)", "+91 9825263722"],
      ["Amitbhai Shah (Mumbai)", "+91 9892659510"],
    ],
  },
  {
    title: "For Paryushan Aradhana",
    people: [["Raj Gandhi (Ahmedabad)", "+91 8000993815"]],
  },
  {
    title: "For Pathshala",
    people: [["Raj Gandhi (Ahmedabad)", "+91 8000993815"]],
  },
  {
    title: "For Navpad Oli Aradhana",
    people: [["Arvindbhai Mehta (Surat)", "+91 9824798738"]],
  },
  {
    title: "For Jinalay Salgira Mahotsav",
    people: [["Niranjan Shah (Surat)", "+91 9825860488"]],
  },
] as const;

function Contact() {
  return (
    <>
      <PremiumPageHero
        eyebrow="Contact Us"
        title="हमसे जुड़ें"
        copy="सेवा, कार्यक्रम, दान या सामान्य जानकारी के लिए सराक टीम से संपर्क करें।"
        image={images.youth}
        imageAlt="सराक समुदाय संपर्क"
        titleClassName="lg:whitespace-nowrap"
        imageClassName="object-[46%_center] sm:object-[50%_center] lg:object-center"
      />
      <section className="px-5 py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Main office"
            title="Main Office Information"
          />
          <div className="mb-16 grid gap-4 md:grid-cols-3">
            {[
              [
                MapPin,
                "Address",
                "102 Blue ribbon building, near harmony residency, vesu",
              ],
              [Phone, "Phone", "+91 9727070787"],
              [Mail, "Email", "sarakutkarsh99@gmail.com"],
            ].map(([I, t, c]: any) => (
              <div key={t} className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
                <I className="text-saffron" />
                <p className="mt-6 text-xs font-bold uppercase tracking-wider text-ink/35">
                  {t}
                </p>
                <p className="mt-2 font-bold">{c}</p>
              </div>
            ))}
          </div>
          <div className="mb-16 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {contactGroups.map((group) => (
              <motion.article
                {...reveal}
                key={group.title}
                className="rounded-[26px] border border-orange-100 bg-white p-6 shadow-sm"
              >
                <p className="text-xs font-bold uppercase tracking-[.18em] text-saffron">
                  {group.title}
                </p>
                <div className="mt-5 space-y-4">
                  {group.people.map(([name, phone]) => (
                    <div key={`${group.title}-${name}`}>
                      <p className="font-bold text-[#4b2c20]">{name}</p>
                      <a
                        href={`tel:${phone.replace(/\s/g, "")}`}
                        className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-[#d87a30]"
                      >
                        <Phone size={15} /> {phone}
                      </a>
                    </div>
                  ))}
                </div>
              </motion.article>
            ))}
          </div>
          <div className="grid items-stretch gap-5 lg:grid-cols-[.8fr_1.2fr]">
            <div className="flex rounded-[30px] bg-[#075E54] p-8 text-white lg:self-stretch">
              <div className="flex min-h-[360px] flex-col justify-between">
                <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-orange-200">
                Direct connect
              </p>
              <h2 className="display mt-4 text-4xl font-bold">
                सही संपर्क से सेवा जल्दी आगे बढ़ती है।
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/75">
                ऊपर दिए गए विभाग अनुसार संपर्क करें या सामान्य संदेश नीचे भेजें।
              </p>
                </div>
                <div className="mt-8 rounded-2xl border border-white/10 bg-white/10 p-5 text-sm leading-7 text-white/75">
                  Main Office Information: 102 Blue ribbon building, near harmony residency, vesu
                </div>
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert(
                  "Thank you! This frontend demo has captured your enquiry.",
                );
              }}
              className="rounded-[30px] bg-white p-7 sm:p-10"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-saffron">
                Enquiry form
              </p>
              <h2 className="display mt-3 text-4xl font-bold">
                How can we help?
              </h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {["Name", "Phone", "Email", "Subject"].map((x) => (
                  <label key={x} className="text-xs font-bold text-ink/45">
                    {x}
                    <input
                      required
                      className="mt-2 w-full rounded-xl border border-black/10 bg-cream px-4 py-3.5 text-sm font-normal outline-none focus:border-saffron"
                      placeholder={`Your ${x.toLowerCase()}`}
                    />
                  </label>
                ))}
                <label className="text-xs font-bold text-ink/45 sm:col-span-2">
                  Message
                  <textarea
                    required
                    rows={5}
                    className="mt-2 w-full resize-none rounded-xl border border-black/10 bg-cream px-4 py-3.5 text-sm font-normal outline-none focus:border-saffron"
                    placeholder="Tell us a little more..."
                  />
                </label>
              </div>
              <button className="mt-5 w-full rounded-xl bg-saffron py-4 text-sm font-bold text-white">
                Submit enquiry
              </button>
            </form>
          </div>
        </div>
      </section>
      <SupportSystemSection />
    </>
  );
}
function PremiumHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const links = [
    ["Home", "/"],
    ["About", "/about"],
    ["Activities", "/activities"],
    ["Programs", "/programs"],
    ["Donation", "/donation"],
    ["Gallery", "/gallery"],
    ["Blogs", "/blogs"],
    ["Contact Us", "/contact"],
  ];
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-orange-100 bg-white">
      <div className="relative mx-auto flex h-[84px] max-w-7xl items-center justify-between px-5 lg:justify-center">
        <Link
          href="/"
          aria-label="SARAK home"
          className="lg:absolute lg:left-6"
        >
          <img
            src="/sarak-logo-authentic.png"
            alt="SARAK Mission Jain Hravak"
            className="h-[54px] w-[142px] object-contain"
          />
        </Link>
        <nav className="hidden items-center gap-6 lg:flex lg:translate-x-10 xl:translate-x-14 xl:gap-9">
          {links.map(([n, h]) => (
            <Link
              key={h}
              href={h}
              className={`relative py-3 text-[13px] font-semibold transition after:absolute after:inset-x-0 after:-bottom-0 after:mx-auto after:h-px after:w-0 after:bg-[#df854b] after:transition-all hover:text-[#c8713d] hover:after:w-full ${pathname === h ? "text-[#c8713d] after:w-full" : "text-[#3d342e]"}`}
            >
              {n}
            </Link>
          ))}
          <Link
            href="/programs/join-paryushan"
            className="rounded-lg bg-[#f29a5b] px-5 py-3 text-[13px] font-bold text-white shadow-md shadow-orange-200/60 transition hover:bg-[#df854b]"
          >
            Join Paryushan
          </Link>
        </nav>
        <button
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="grid h-11 w-11 place-items-center rounded-full bg-[#f6aa70] text-white lg:hidden"
        >
          <Menu />
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              aria-label="Close menu overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-[#2f241d]/30 lg:hidden"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed bottom-0 right-0 top-0 z-[60] w-[84%] max-w-sm bg-white p-6 shadow-2xl lg:hidden"
            >
              <div className="flex items-center justify-between">
                <img
                  src="/sarak-logo-authentic.png"
                  alt="SARAK"
                  className="h-12 w-32 object-contain"
                />
                <button
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-[#f6aa70] text-white"
                >
                  <X />
                </button>
              </div>
              <nav className="mt-12 grid gap-2">
                {links.map(([n, h]) => (
                  <Link
                    onClick={() => setOpen(false)}
                    key={h}
                    href={h}
                    className="rounded-2xl px-5 py-4 text-lg font-semibold text-[#4f4037] transition hover:bg-[#fde8d7] hover:text-[#c8713d]"
                  >
                    {n}
                  </Link>
                ))}
                <Link
                  onClick={() => setOpen(false)}
                  href="/programs/join-paryushan"
                  className="mt-4 rounded-2xl bg-[#f29a5b] px-5 py-4 text-center font-bold text-white"
                >
                  Join Paryushan
                </Link>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

const whoSarak = [
  "सराक यानी एक ऐसी धर्म-संस्कारी जाति जो श्री सम्मेद शिखरजी महातीर्थ के आसपास - बंगाल, बिहार, ओडिसा, झारखंड राज्य में बसी है।",
  "वर्षो पूर्व, उन क्षेत्रों में हमारे पूर्वजों का, जैनों का निवास था। बहुत से प्राचीन जैन मंदिर थे, बड़ी-बड़ी जैन नगरियां थी। तीर्थंकर परमात्माओं का परिभ्रमण उन क्षेत्रों में होने के कारण बहुत बड़े पैमाने पर जैन वहां रहते थे। आज भी उन मंदिरों के अवशेष पाए जाते है।",
  "लेकिन समय के चलते, असामाजिक तत्वों के आक्रमणों से अनेक मंदिर नष्ट हो गए। और प्राकृतिक आपदा भी इस प्रकार हुई की अहिंसा का पालन करना दुष्कर हो गया। जब अनाज आदि की कमी के कारण जीवन निर्वाह करना मुश्किल हो गया, तब वहां से पलायन करने के अलावा कोई रास्ता नहीं था।",
  "लेकिन कुछ परिवार वहीं रहे और वहां रहकर भी अपने आचारों को कायम रखा। समय के प्रवाह के साथ, उनकी जो मूल पहचान थी, वह खो सी गई। वही लोग आगे चलकर श्रावक से सराक कहलाए जाने लगे, जिनके आचार मूल रूप से जैन धर्म के ही है।",
  "ऐसी सराक जाति की कई बाते प्राचीन ग्रंथो में भी मिलती है। उनके बारे में अद्भुत बात तो यह है की उनके गोत्र आदिदेव, अनंतदेव, शांतिदेव, धर्मदेव, गौतम, आदि है, जो कि जैन धर्म के तीर्थंकर एवं गणधर भगवंत के नाम से है।",
  "तो एक अर्थ में ऐसा कह सकते है की यह प्रभु के ही वंशज है। कई वर्षों पूर्व, सराक लोग धर्म से बिछड़ गए, परंतु उनकी जीवनचर्या वैसी ही रही, और आज भी उसकी झलक उनके जीवन में देखने को मिलती है।",
];
const sarakHistory = [
  "लगभग ८० साल पहले, संवत १९९० में न्याय विषारद पूज्य मंगलविजयजी महाराजा और पूज्य प्रभाकरविजयजी महाराजा ने इस क्षेत्र में विचरण किया था। आगे चलकर उन्हें अथाह परिश्रम के बाद सराक जाति का परिचय हुआ। शुरुआत के समय में ज्ञान के अभाव से सराक लोगों ने महात्मा का तिरस्कार तक किया, पर गुरु भगवंत ने ऐसी परिस्थिति में भी उन लोगो को धर्म का परिचय करवाया और उनमें धर्मबीज बोया।",
  "आगे चलकर पूज्य मोहनलालजी महाराजा के अनेक महात्माओं ने भी इस क्षेत्र में सुंदर कार्य किया। सन् २००० में जब कलिकुंड तीर्थोर्द्धारक परम पूज्य आचार्य श्री राजेंन्द्र सूरीश्वरजी महाराजा छः माह का छ'रि पालित श्री संघ लेकर श्री सम्मेत शिखरजी महातीर्थ पधारे, तब कुछ सराक जाति के बारे में उनको ज्ञात हुआ। फिर गुरु भगवंत ने उनके बारे में और जानकारी प्राप्त करने हेतु प्रयास शुरू किए।",
  "सन २००९ में जब फिर से ६ माह का छ'रि पालित संघ लेकर श्री सम्मेद शिखरजी महातीर्थ पधारे, तब गुरुदेव के आदेशानुसार उनके शिष्य, पन्यास राजपद्मविजयजी महाराजा (वर्तमान में आचार्य श्री राजपरम सुरीश्वरजी महाराजा) ने सराक क्षेत्र में विचरण किया।",
  "और जानकारी प्राप्त होने पर पूज्य गुरुदेव ने उस समय सकल श्री संघ एवं राज परिवार को जीवोद्धार करने का उपदेश दिया। उन्होंने सराक जाति के उद्धार कार्य में जुड़ने का आदेश फरमाया और श्री सम्मेद शिखरजी तीर्थ में मेरु तेरस के दिन गुरुदेव का कालधर्म हुआ।",
  "गुरुदेव का अंतिम स्वप्न राज परिवार ने जीवनमंत्र बना दिया और तब से शासनरत्न श्री कुमारपाल भाई वि. शाह के मार्गदर्शन से शुरू हुआ सराक उत्कर्ष अभियान।",
];
const whatNext = [
  "हमारे ही जैन समाज के धर्मप्रिय ऐसे सराक भाईयों का व्यवहारिक, आर्थिक, आध्यात्मिक तीनों रूप से उद्धार हो और वह सब पुनः जल्द से जल्द धर्ममय पूर्ण जीवन को प्राप्त कर आत्म कल्याण के लिए आगे बढ़ सके ऐसा प्रयास।",
  "हर गांव में एक जिनालय, जैन भवन एवं पाठशाला हो।",
  "साथ ही, धर्म को गहराई से समझकर यही सराक जैन हमारे २० तीर्थंकरों की कल्याणक भूमि ऐसे श्री शिखरजी महातीर्थ एवं निकटतम सभी कल्याणक भूमि की सेवा और रक्षा कर सके।",
  "इस प्रकार, तीर्थ की महत्ता को जानकर, आसपास में रहे हुए और भी अनेक लोगों को इस महान तीर्थ से जोड़े, उनमें तीर्थयात्रा का भाव जगाएं जिससे तीर्थ पर आवागमन बढ़े, आशातना घटे और तीर्थ के ऊर्जा एवं प्रभाव में वृद्धि हो।",
  "अथार्थ साधर्मिक भक्ति के साथ-साथ तीर्थ रक्षा के कर्तव्य को भी अच्छे से अदा कर सके इस तरह का एक्शन प्लान हमें बनाना है।",
];

const supportSystem = [
  ["narendramodi.jpeg", "Shri Narendra Modi"],
  ["yashovijayms.jpeg", "Pujya Yashovijayji Maharaj Saheb"],
  ["amitshah.jpeg", "Shri Amit Shah"],
  ["vijayrupani.jpeg", "Shri Vijay Rupani"],
  ["mahabodhims.jpeg", "Pujya Mahabodhiji Maharaj Saheb"],
  ["kumarpal.jpeg", "Shri Kumarpalbhai V. Shah"],
  ["kalpyashms.jpeg", "Pujya Kalpyashji Maharaj Saheb"],
  ["padmasagarms.jpeg", "Pujya Padmasagarji Maharaj Saheb"],
  ["rajshekharms.jpeg", "Pujya Rajshekharji Maharaj Saheb"],
] as const;

function SupportSystemSection() {
  return (
    <section className="overflow-hidden bg-[#fffaf5] py-16 sm:py-20 lg:py-24">
      <div className="px-4 sm:px-6">
        <SectionHeading
          eyebrow="Our support system"
          title="Guided by faith. Strengthened by support."
          center
          copy="The people whose encouragement and guidance continue to strengthen SARAK Utkarsh Abhiyan."
        />
      </div>
      <div className="support-viewport mt-4 overflow-hidden">
        <div className="support-track flex w-max gap-5 px-5">
          {[...supportSystem, ...supportSystem].map(([file, name], i) => (
            <article
              key={`${file}-${i}`}
              className="group w-[230px] shrink-0 overflow-hidden rounded-[26px] border border-orange-100 bg-white p-3 shadow-[0_12px_35px_rgba(86,50,28,.07)] sm:w-[270px]"
            >
              <div className="overflow-hidden rounded-[20px]">
                <img
                  src={`https://sarakabhiyan.org/img/supportsystem/${file}`}
                  alt={name}
                  className="h-[285px] w-full object-cover object-top transition duration-500 group-hover:scale-105"
                />
              </div>
              <p className="px-2 pb-2 pt-4 text-center text-sm font-semibold text-[#4b2c20]">
                {name}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const sarakServices = [
  {
    title: "शिक्षा",
    image: "/sarak-education.jpg",
    alt: "ग्रामीण विद्यार्थियों के लिए शिक्षा सेवा",
    copy: "सराक परिवार के बच्चों को गुणवत्तापूर्ण शिक्षा, अध्ययन सामग्री, छात्रवृत्ति और सतत मार्गदर्शन उपलब्ध कराना अभियान का प्रमुख संकल्प है। गाँवों में पाठशालाओं और संस्कार केंद्रों के माध्यम से बच्चों को ज्ञान के साथ आत्मविश्वास और उज्ज्वल भविष्य की दिशा दी जाती है।",
  },
  {
    title: "सेवा",
    image: "/sarak-seva.jpg",
    alt: "सराक समुदाय में सेवा कार्य",
    copy: "स्वास्थ्य शिविर, अन्न सहायता, वस्त्र वितरण और जरूरतमंद परिवारों के सहयोग जैसे कार्यों के माध्यम से सेवा को दैनिक जीवन का हिस्सा बनाया जाता है। प्रत्येक पहल सम्मान, करुणा और साधर्मिक भक्ति के भाव से संचालित होती है।",
  },
  {
    title: "संस्करण",
    image: "/sarak-version.jpg",
    alt: "नई पीढ़ी के लिए विकसित सराक कार्यक्रम",
    copy: "अभियान के प्रत्येक संस्करण में समय और समाज की आवश्यकता के अनुसार नए कार्यक्रम, बेहतर कार्यप्रणाली और व्यापक सहभागिता जोड़ी जाती है। डिजिटल संवाद, युवा नेतृत्व और आधुनिक प्रशिक्षण के माध्यम से सेवा और शिक्षा की पहल को नई पीढ़ी तक अधिक प्रभावी रूप से पहुँचाया जाता है।",
  },
] as const;

const pageHeroImages = {
  about: "/murti.png",
  activities: "/DSC_0615.JPG",
  programs: "/programs.png",
  blogs: "/DJI_0828.JPG",
} as const;

function PremiumPageHero({
  eyebrow,
  title,
  highlight,
  copy,
  image,
  imageAlt,
  titleClassName = "",
  imageClassName = "object-[62%_center] lg:object-center",
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  copy: string;
  image: string;
  imageAlt: string;
  titleClassName?: string;
  imageClassName?: string;
}) {
  return (
    <section className="relative mt-[84px] overflow-hidden border-b border-[#dfa35f] bg-[#fff8ec]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(255,255,255,.95),rgba(255,247,234,.72)_35%,rgba(241,171,91,.18)_100%)]" />
      <div className="absolute inset-0 z-0">
        <img
          src={image}
          alt={imageAlt}
          className={`h-full w-full object-cover opacity-38 mix-blend-multiply md:opacity-72 lg:opacity-92 ${imageClassName}`}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#fff8ec] via-[#fff8ec]/78 to-[#fff8ec]/10 lg:via-[#fff8ec]/50 lg:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#fff8ec]/55 via-transparent to-transparent" />
      </div>
      <img
        src="/decorations/mandala.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-20 w-[340px] opacity-[.055] md:w-[460px]"
      />
      <img
        src="/decorations/lotus.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-4 left-1/2 hidden w-20 -translate-x-1/2 opacity-30 md:block"
      />
      <div className="relative z-10 mx-auto grid min-h-[430px] max-w-[1500px] items-center px-4 py-12 sm:px-6 md:min-h-[460px] lg:grid-cols-[44%_56%] lg:px-10 lg:py-0 xl:px-16">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center lg:text-left"
        >
          <div className="mb-5 flex items-center justify-center gap-4 text-xs font-bold uppercase tracking-[.28em] text-[#bf6b28] lg:justify-start">
            <span className="h-px w-12 bg-[#d8904f]" />
            <span>{eyebrow}</span>
            <span className="h-px w-12 bg-[#d8904f]" />
          </div>
          <h1
            className={`hindi text-4xl font-bold leading-[1.12] text-[#4b3427] sm:text-5xl lg:text-[58px] ${titleClassName}`}
          >
            {title}
            {highlight && (
              <>
                <br />
                <span className="text-[#d87a30]">{highlight}</span>
              </>
            )}
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
        <div aria-hidden="true" className="hidden lg:block" />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#d89f4f] to-transparent" />
    </section>
  );
}

function AboutPage() {
  return (
    <>
      <PremiumPageHero
        eyebrow="About SARAK"
        title="हमारी पहचान"
        highlight="हमारी विरासत"
        copy="सराक उत्कर्ष अभियान धर्म, शिक्षा और सेवा के माध्यम से सराक समाज को पुनः जैन संस्कारों और तीर्थ परंपरा से जोड़ने का संकल्प है।"
        image={pageHeroImages.about}
        imageAlt="भगवान की सुवर्ण मूर्ति"
        imageClassName="object-[68%_center] sm:object-[70%_center] lg:object-center"
      />

      <section className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl space-y-16 sm:space-y-20 lg:space-y-24">
          <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-[.85fr_1.15fr] lg:gap-12">
            <motion.div
              {...reveal}
              className="relative overflow-hidden rounded-[36px] rounded-br-[110px] border-b-4 border-orange-400 bg-orange-50 p-2"
            >
              <img
                src="/history-of-sarak.jpg"
                alt="Historic Jain temple in the SARAK region"
                className="h-[380px] w-full rounded-[30px] rounded-br-[105px] object-cover object-top sm:h-[500px] lg:h-[610px]"
              />
            </motion.div>
            <motion.div {...reveal}>
              <p className="text-xs font-bold uppercase tracking-[.22em] text-[#dd7c3d]">
                The journey
              </p>
              <h2 className="display mt-3 text-4xl font-bold leading-tight text-[#4b2c20] sm:text-5xl">
                History Of
                <br />
                <span className="text-[#e47735]">Sarak Utkarsh Abhiyan</span>
              </h2>
              <div className="mt-7 space-y-4">
                {sarakHistory.map((p, i) => (
                  <p key={i} className="hindi text-[15px] leading-8 text-[#55483f]">
                    {p}
                  </p>
                ))}
              </div>
              <blockquote className="hindi mt-7 rounded-2xl border border-orange-200 bg-[#fff8f2] p-5 text-base font-semibold leading-8 text-[#d56f33]">
                “गुरुदेव का अंतिम स्वप्न राज परिवार ने जीवनमंत्र बना दिया और तब
                से शुरू हुआ सराक उत्कर्ष अभियान।”
              </blockquote>
            </motion.div>
          </div>

          <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-[1.15fr_.85fr] lg:gap-12">
            <motion.div {...reveal}>
              <p className="text-xs font-bold uppercase tracking-[.22em] text-[#dd7c3d]">
                The road ahead
              </p>
              <h2 className="display mt-3 text-4xl font-bold text-[#4b2c20] sm:text-5xl">
                What <span className="text-[#e47735]">Next?</span>
              </h2>
              <div className="mt-7 space-y-4">
                {whatNext.map((p, i) => (
                  <p key={i} className="hindi text-[15px] leading-8 text-[#55483f]">
                    {p}
                  </p>
                ))}
              </div>
            </motion.div>
            <motion.div
              {...reveal}
              className="relative overflow-hidden rounded-[36px] rounded-bl-[110px] border-b-4 border-orange-400 bg-orange-50 p-2"
            >
              <img
                src="/whats-next.jpg"
                alt="SARAK education and community uplift"
                className="h-[360px] w-full rounded-[30px] rounded-bl-[105px] object-cover sm:h-[470px] lg:h-[560px]"
              />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#fffaf5] px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <img
          src="/decorations/mandala.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-8 hidden w-96 opacity-[.035] md:block"
        />
        <div className="relative mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="People & stewardship"
            title="Leadership"
            copy="A values-led structure created to protect the mission, guide its work and serve the community with accountability."
          />
          <div className="grid gap-5 md:grid-cols-3">
            {[
              ["/sarak-leadership.jpg", "Founder", "Founding Council", "Vision, spiritual purpose and the original commitment behind SARAK Utkarsh Abhiyan."],
              ["/sarak-education.jpg", "Management Team", "Community Leadership", "Program planning, village coordination and the day-to-day stewardship of every initiative."],
              ["/sarak-heritage-idol.jpg", "Trust", "Governance & Accountability", "Transparent oversight that protects resources, continuity and the long-term interests of the community."],
            ].map(([image, label, title, copy]) => (
              <motion.article
                {...reveal}
                whileHover={{ y: -6 }}
                key={label as string}
                className="group overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_14px_40px_rgba(92,57,32,.07)]"
              >
                <div className="aspect-[4/3] overflow-hidden bg-orange-50">
                  <img
                    src={image as string}
                    alt={`${label as string} — ${title as string}`}
                    className="h-full w-full object-cover object-center transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-7 sm:p-8">
                  <p className="text-xs font-bold uppercase tracking-[.2em] text-[#dc7d43]">{label as string}</p>
                  <h3 className="mt-3 text-2xl font-bold text-[#4b2c20]">{title as string}</h3>
                  <p className="mt-4 text-sm leading-7 text-[#6f6158]">{copy as string}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function HomeMissionSections() {
  return (
    <>
      <section className="relative overflow-hidden bg-[#fffaf5] px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <img
          src="/decorations/mandala.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-10 hidden w-96 opacity-[.035] md:block"
        />
        <div className="relative mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Purpose in action"
            title="What does SARAK do?"
            copy="Education, compassionate service and evolving community initiatives form one connected path of uplift."
          />
          <div className="border-y border-orange-200/70">
            {sarakServices.map((service, i) => (
              <motion.article
                {...reveal}
                key={service.title}
                className={`grid items-center gap-7 py-9 sm:py-11 lg:grid-cols-[470px_1fr] lg:gap-12 ${i > 0 ? "border-t border-orange-200/70" : ""}`}
              >
                <div
                  className={`${i % 2 ? "lg:order-2" : ""} h-[220px] w-full overflow-hidden rounded-[26px] bg-orange-50 sm:h-[280px] lg:h-[320px] lg:w-[430px] xl:w-[470px]`}
                >
                  <img
                    src={service.image}
                    alt={service.alt}
                    className="h-full w-full object-cover object-center transition duration-700 hover:scale-105"
                  />
                </div>
                <div
                  className={`${i % 2 ? "lg:order-1" : ""} ${service.title === "सेवा" ? "lg:ml-auto lg:max-w-[760px] lg:pl-12" : ""}`}
                >
                  <span className="hindi text-xs font-bold tracking-[.24em] text-[#df854b]">
                    0{i + 1}
                  </span>
                  <h3 className="hindi mt-3 text-4xl font-bold text-[#4b2c20] sm:text-5xl">
                    {service.title}
                  </h3>
                  <p className="hindi mt-5 max-w-3xl text-[16px] leading-8 text-[#5f5148]">
                    {service.copy}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="A living heritage" title="A story worth carrying forward." />
          <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-12">
            <motion.div
              {...reveal}
              className="aspect-video overflow-hidden rounded-[28px] border border-orange-100 bg-[#fff7ef] shadow-[0_18px_55px_rgba(91,54,30,.12)]"
            >
              <iframe
                src="https://www.youtube.com/embed/aukUpgwN53c?mute=1&rel=0&modestbranding=1"
                title="SARAK community testimonial"
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                loading="lazy"
              />
            </motion.div>
            <motion.div {...reveal}>
              <p className="hindi text-[16px] leading-9 text-[#55483f] sm:text-[17px]">
                पूर्वोत्तर भारत के सैकड़ों गाँवों में आज भी सराक समाज जैन धर्म के मूल सिद्धांत—अहिंसा, सत्य और सदाचार—का पालन करता आ रहा है। 'सराक' शब्द प्राचीन 'श्रावक' परंपरा से जुड़ा है और यह समाज सदियों से अपनी जैन पहचान को संजोए हुए है। इतिहास में अनेक तीर्थंकरों के कल्याणक इसी क्षेत्र से जुड़े होने के बावजूद, समय के साथ यह समाज मुख्यधारा के जैन समुदाय से दूर होता गया। आध्यात्मिक मार्गदर्शन और धार्मिक संपर्क के अभाव ने इस विरासत को चुनौती दी, फिर भी सराक समाज ने अपने संस्कारों और मूल्यों को जीवित रखा। सराक उत्कर्ष अभियान का उद्देश्य इसी प्राचीन विरासत को पुनः मुख्यधारा से जोड़ना, धार्मिक जागरूकता बढ़ाना तथा आने वाली पीढ़ियों तक जैन संस्कृति, शिक्षा और आध्यात्मिक मूल्यों को सशक्त रूप से पहुँचाना है।
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="bg-[#fffaf5] px-4 pb-16 pt-4 sm:px-6 sm:pb-20 lg:pb-24">
        <motion.div
          {...reveal}
          className="relative mx-auto grid max-w-7xl items-center gap-7 overflow-hidden rounded-[26px] border border-[#0a6f63] bg-[#075E54] px-6 py-8 text-white shadow-[0_18px_45px_rgba(7,94,84,.22)] sm:px-9 md:grid-cols-[96px_1fr_auto] md:px-10 lg:gap-9 lg:px-12"
        >
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white p-2 shadow-lg shadow-green-950/20 md:mx-0">
            <img
              src="/sarak-logo-authentic.png"
              alt="SARAK Mission Jain Hravak"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <h2 className="hindi text-2xl font-bold sm:text-3xl">सराक परिवार से जुड़ें</h2>
            <span className="mt-3 block h-px w-24 bg-[#9ed2b3]" />
            <p className="hindi mt-3 max-w-xl text-sm leading-7 text-white/80 sm:text-base">
              हमारे WhatsApp समूह से जुड़ें और सभी महत्वपूर्ण जानकारी प्राप्त करें।
            </p>
          </div>
          <Link
            href="https://wa.me/919727070787"
            target="_blank"
            rel="noreferrer"
            className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#eef8f1] px-7 font-bold text-[#1d633f] shadow-lg shadow-green-950/10 transition hover:-translate-y-0.5 md:justify-self-end"
          >
            <img
              src="https://cdn.simpleicons.org/whatsapp/25D366"
              alt="WhatsApp"
              className="h-6 w-6"
            />
            <span className="hindi">WhatsApp पर जुड़ें</span>
          </Link>
        </motion.div>
      </section>
    </>
  );
}

function RefinedHome() {
  const metricData = [
    [Landmark, 18, "Years"],
    [BookOpen, 150, "Programs"],
    [Users, 10000, "Members"],
    [HandHeart, 800, "Villages"],
    [Heart, 1000, "Volunteers"],
  ] as const;
  const featured = [
    [
      "श्रुतज्ञान महोत्सव",
      "शास्त्रों के अध्ययन और संस्कारों की वृद्धि के लिए आयोजित विशेष कार्यक्रम।",
      activities[0],
    ],
    [
      "ग्राम शिविर",
      "गाँव-गाँव जाकर धर्म, संस्कार और शिक्षा का प्रचार-प्रसार।",
      activities[5],
    ],
    [
      "शिक्षा सहयोग अभियान",
      "छात्रों को शिक्षा सामग्री और मार्गदर्शन प्रदान करने की पहल।",
      activities[1],
    ],
  ] as const;
  return (
    <>
      <section className="relative mt-[84px] h-[calc(100svh-84px)] overflow-hidden bg-[#fff9f2] md:h-[88svh] md:min-h-[680px] md:max-h-[920px]">
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
        <div className="absolute inset-0 hidden bg-gradient-to-r from-[#fff9f2]/45 via-[#fff9f2]/8 to-transparent md:block" />
        <img
          src="/decorations/mandala.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 top-10 hidden h-72 w-72 opacity-[.045] lg:block"
        />
        <div className="relative mx-auto grid h-full max-w-[1500px] md:grid-cols-[46%_54%]">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 flex items-start px-5 pb-8 pt-8 md:items-center md:px-10 md:py-14 lg:px-14 xl:px-16 xl:py-20"
          >
            <div className="max-w-[300px] md:max-w-xl">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[.22em] text-[#d37b42] md:mb-5 md:text-xs md:tracking-[.26em]">
                SARAK Utkarsh Abhiyan
              </p>
              <h1 className="hindi text-[25px] font-bold leading-[1.38] text-[#4b2c20] md:text-4xl md:leading-[1.28] lg:text-[50px] xl:text-[58px]">
                धर्म, <span>दया</span> और सेवा
                <br />
                हमारा संकल्प, हमारा पथ
              </h1>
              <div className="my-4 hidden items-center gap-3 md:my-7 md:flex md:gap-4">
                <span className="h-px w-12 bg-orange-200 md:w-20" />
                <span className="text-xl text-[#e88d4e] md:text-2xl">❀</span>
                <span className="h-px w-12 bg-orange-200 md:w-20" />
              </div>
              <p className="hindi mt-2 text-[13px] font-medium leading-5 text-[#5d4b41] md:mt-0 md:text-lg md:leading-8 lg:text-xl lg:leading-9">
                था गुरु राज का आखिरी सपना
                <br />
                जिसे राज परिवार ने बनाया अपना।
              </p>
            </div>
          </motion.div>
          <div aria-hidden="true" className="hidden xl:block" />
        </div>
      </section>

      <section className="relative border-y border-orange-100 bg-white px-4 py-8 sm:px-6 sm:py-10">
        <motion.div
          {...reveal}
          className="mx-auto grid w-full max-w-7xl items-center gap-6 rounded-[28px] border border-orange-200 bg-white px-5 py-7 shadow-soft sm:px-7 md:grid-cols-[180px_1fr_260px]"
        >
          <div className="text-center">
            <img
              src="/raj-parivar.png"
              alt="Raj Parivar"
              className="mx-auto h-28 w-28 object-contain"
            />
            <p className="hindi mt-2 font-semibold text-[#bd2e21]">
              राज परिवार
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-3 flex items-center justify-center gap-4">
              <span className="h-px w-12 bg-orange-200" />
              <span className="text-2xl text-[#ec8a49]">❀</span>
              <span className="h-px w-12 bg-orange-200" />
            </div>
            <p className="hindi text-base font-medium leading-7 text-[#4f433b]">
              सराक उत्कर्ष अभियान की प्रेरणा और
              <br />
              मार्गदर्शन राज परिवार से मिलता है।
            </p>
          </div>
          <div className="text-center">
            <img
              src="/sarak-logo-authentic.png"
              alt="SARAK Jain Hravak"
              className="mx-auto h-24 w-56 object-contain"
            />
            <p className="hindi mt-1 font-semibold text-[#e37d3b]">
              सराक उत्कर्ष अभियान
            </p>
          </div>
        </motion.div>
      </section>

      <section className="relative overflow-hidden bg-[#fffdf9] px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div
          className="absolute inset-0 opacity-[.035]"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, #f97316 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <img
          src="/metrics-temple.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-6 -left-20 hidden w-[360px] mix-blend-multiply opacity-55 sm:block lg:w-[430px]"
        />
        <img
          src="/metrics-temple.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-6 -right-20 hidden w-[360px] -scale-x-100 mix-blend-multiply opacity-55 sm:block lg:w-[430px]"
        />
        <img
          src="/decorations/mandala.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 hidden w-[460px] -translate-x-1/2 -translate-y-1/2 opacity-[.025] md:block"
        />
        <div className="metrics-grid relative mx-auto flex max-w-7xl snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-5 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 md:grid-cols-6 xl:grid-cols-5 xl:gap-8">
          {metricData.map(([Icon, v, l], i) => (
            <motion.div
              {...reveal}
              transition={{ delay: i * 0.06 }}
              key={l}
              className="metric-card group relative flex aspect-square w-[148px] flex-none snap-center items-center justify-center px-[18%] pb-[10%] pt-[18%] text-center drop-shadow-[0_10px_20px_rgba(102,64,35,.08)] transition duration-300 hover:-translate-y-2 hover:drop-shadow-[0_16px_26px_rgba(249,115,22,.18)] sm:mx-auto sm:w-full sm:min-w-0 sm:max-w-[230px]"
            >
              <img
                src="/decorations/ornamental-frame.svg"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              />
              <div className="relative z-10">
                <Icon
                  className="mx-auto mb-1 text-[#f97316] transition duration-300 group-hover:scale-110 sm:mb-3"
                  size={27}
                  strokeWidth={1.7}
                />
                <p className="display whitespace-nowrap text-2xl font-bold leading-none text-[#1f2937] sm:text-3xl sm:leading-normal xl:text-4xl">
                  <AnimatedCounter value={v} />
                </p>
                <p className="mt-1 text-xs font-medium leading-none text-[#59616d] sm:mt-2 sm:text-sm sm:leading-normal">
                  {l}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-[1.15fr_.85fr] lg:gap-12">
            <motion.div {...reveal}>
              <p className="text-xs font-bold uppercase tracking-[.22em] text-[#dd7c3d]">
                About the community
              </p>
              <h2 className="display mt-3 text-4xl font-bold text-[#4b2c20] sm:text-5xl">
                Who Is <span className="text-[#e47735]">Sarak?</span>
              </h2>
              <div className="mt-7 space-y-4">
                {whoSarak.map((p, i) => (
                  <p
                    key={i}
                    className="hindi text-[15px] leading-8 text-[#55483f]"
                  >
                    {p}
                  </p>
                ))}
              </div>
            </motion.div>
            <motion.div
              {...reveal}
              className="relative overflow-hidden rounded-[36px] rounded-bl-[110px] border-b-4 border-orange-400 bg-orange-50 p-2"
            >
              <img
                src="/who-is-sarak.jpeg"
                alt="Jain temple near the SARAK region"
                className="h-[360px] w-full rounded-[30px] rounded-bl-[105px] object-cover sm:h-[480px] lg:h-[600px]"
              />
            </motion.div>
          </div>
        </div>
      </section>

      <HomeMissionSections />

      <section className="bg-[#fffaf5] px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Featured activities"
            title="संस्कार, सेवा और शिक्षा की पहल"
          />
          <div className="grid gap-5 lg:grid-cols-3">
            {featured.map(([title, desc, a]) => (
              <motion.article
                {...reveal}
                whileHover={{ y: -5 }}
                key={title}
                className="group relative min-h-[230px] overflow-hidden rounded-2xl shadow-lg"
              >
                <div>
                  <img
                    src={a.image}
                    alt={title}
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#21150f]/90 via-[#21150f]/55 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-5 p-6">
                    <div>
                      <h3 className="hindi text-2xl font-bold text-white">
                        {title}
                      </h3>
                      <p className="hindi mt-2 max-w-sm text-sm leading-6 text-white/80">
                        {desc}
                      </p>
                    </div>
                    <Link
                      href={`/activities/${a.slug}`}
                      aria-label={`Read ${title}`}
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-[#e67c3b] shadow-md transition group-hover:bg-[#f97216] group-hover:text-white"
                    >
                      <ArrowRight />
                    </Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Current programs"
            title="A clear way to participate."
            copy="Join the community, observe Paryushan together, celebrate milestones or contribute your time as a volunteer."
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {programs.map((p) => (
              <ProgramCard key={p.slug} p={p} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#fffdf8] px-4 pb-16 pt-20 before:absolute before:left-1/2 before:top-0 before:h-12 before:w-[110%] before:-translate-x-1/2 before:-translate-y-8 before:rounded-[50%] before:border-t before:border-[#f3b17d] before:content-[''] sm:px-6 sm:pb-20 sm:pt-24">
        <img
          src="/decorations/temple-outline.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-12 -left-24 hidden w-[340px] opacity-[.05] sm:block"
        />
        <img
          src="/decorations/temple-outline.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-12 -right-24 hidden w-[340px] -scale-x-100 opacity-[.05] sm:block"
        />
        <span className="absolute left-1/2 top-4 -translate-x-1/2 bg-[#fffdf8] px-4 text-2xl text-[#f97316]">
          ❀
        </span>
        <div className="relative mx-auto grid max-w-7xl items-center gap-6 overflow-hidden rounded-[28px] border border-orange-100 bg-white px-6 py-8 shadow-[0_14px_45px_rgba(94,58,33,.08)] md:grid-cols-[96px_1fr_auto] md:px-10 lg:px-12">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-[#fff3e8] text-[#f97216] shadow-sm">
            <Heart size={34} strokeWidth={1.7} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.22em] text-[#d87a30]">
              Make a Donation
            </p>
            <h2 className="hindi mt-3 text-3xl font-bold text-[#33251e] sm:text-4xl">
              आपका सहयोग सेवा, शिक्षा और धर्मकार्य को आगे बढ़ाता है।
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#75675f]">
              हर योगदान सराक परिवार के उत्थान, पाठशाला, तीर्थ सेवा और साधर्मिक भक्ति में सीधा सहयोग बनता है।
            </p>
          </div>
          <Link
            href="/donation"
            className="inline-flex items-center justify-center rounded-full bg-[#f97216] px-7 py-4 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-[#df650f]"
          >
            Donate Now <ArrowRight className="ml-2" size={17} />
          </Link>
        </div>
      </section>
    </>
  );
}

function ReferenceFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-orange-100 bg-[#fffaf3] px-5 pb-7 pt-16 text-[#4a382e]">
      <img
        src="/decorations/mandala.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 bottom-10 hidden w-64 opacity-[.04] sm:block"
      />
      <img
        src="/decorations/pillar.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 hidden h-full w-14 object-cover opacity-[.22] lg:block"
      />
      <img
        src="/decorations/pillar.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-14 -scale-x-100 object-cover opacity-[.22] lg:block"
      />
      <div className="relative mx-auto grid max-w-6xl gap-11 pb-12 md:grid-cols-2 xl:grid-cols-[1.05fr_1.35fr_1fr_1.15fr]">
        <div>
          <img
            src="/sarak-logo-authentic.png"
            alt="SARAK Mission Jain Hravak"
            className="h-20 w-48 object-contain"
          />
          <div className="mt-6 flex gap-3">
            {["t", "f", "◎", "▶"].map((s, i) => (
              <Link
                href="#"
                key={i}
                aria-label={`Social media ${i + 1}`}
                className="grid h-10 w-10 place-items-center rounded-full border border-[#d99a6b] text-sm font-bold text-[#be6d38] transition hover:-translate-y-1 hover:bg-[#f97316] hover:text-white"
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
        <div className="xl:border-l xl:border-orange-200/70 xl:pl-8">
          <h3 className="text-sm font-bold uppercase tracking-wide">
            About Us
          </h3>
          <div className="mt-3 flex items-center gap-2 text-[#f97316]">
            <span className="h-px w-8 bg-orange-300" />❀
            <span className="h-px w-8 bg-orange-300" />
          </div>
          <p className="hindi mt-5 text-[13px] leading-7 text-[#6d5c52]">
            सराक उत्कर्ष अभियान का उद्देश्य है धर्म, शिक्षा और सेवा के माध्यम से
            सराक समाज का उत्थान करना और आने वाली पीढ़ियों को संस्कारित बनाना।
          </p>
        </div>
        <div className="xl:border-l xl:border-orange-200/70 xl:pl-8">
          <h3 className="text-sm font-bold uppercase tracking-wide">
            Site Links
          </h3>
          <div className="mt-3 flex items-center gap-2 text-[#f97316]">
            <span className="h-px w-8 bg-orange-300" />❀
            <span className="h-px w-8 bg-orange-300" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 text-sm text-[#66564d]">
            {[
              ["Home", "/"],
              ["About", "/about"],
              ["Activities", "/activities"],
              ["Programs", "/programs"],
              ["Donate", "/donation"],
              ["Gallery", "/gallery"],
              ["Blogs", "/blogs"],
              ["Contact Us", "/contact"],
            ].map(([n, h]) => (
              <Link
                href={h}
                key={`${n}-${h}`}
                className="flex items-center gap-2 transition hover:text-[#e37232]"
              >
                <span className="text-[10px] text-[#f97316]">❀</span>
                {n}
              </Link>
            ))}
          </div>
        </div>
        <div className="xl:border-l xl:border-orange-200/70 xl:pl-8">
          <h3 className="text-sm font-bold uppercase tracking-wide">
            Have A Questions?
          </h3>
          <div className="mt-3 flex items-center gap-2 text-[#f97316]">
            <span className="h-px w-8 bg-orange-300" />❀
            <span className="h-px w-8 bg-orange-300" />
          </div>
          <div className="mt-5 space-y-4 text-[13px] leading-6 text-[#66564d]">
            <p className="flex gap-3">
              <MapPin className="mt-1 shrink-0 text-[#f97316]" size={17} />
              102 Blue Ribbon Building, near Harmony Residency, Vesu
            </p>
            <p className="flex gap-3">
              <Phone className="shrink-0 text-[#f97316]" size={17} />
              +91 97270 70787
            </p>
            <p className="flex gap-3 break-all">
              <Mail className="shrink-0 text-[#f97316]" size={17} />
              sarakutkarsh99@gmail.com
            </p>
          </div>
        </div>
      </div>
      <div className="relative mx-auto flex max-w-6xl items-center gap-4 border-t border-orange-200/70 pt-5 text-center text-xs text-[#816e63]">
        <span className="h-px flex-1 bg-[linear-gradient(90deg,transparent,#edaa78)]" />
        <span className="text-[#f97316]">❀</span>
        <p>© 2024 Sarak Utkarsh Abhiyan. All Rights Reserved.</p>
        <span className="text-[#f97316]">❀</span>
        <span className="h-px flex-1 bg-[linear-gradient(90deg,#edaa78,transparent)]" />
      </div>
    </footer>
  );
}

export default function SarakSite({ path }: { path: string }) {
  const parts = path.split("/").filter(Boolean);
  let page: React.ReactNode = <RefinedHome />;
  if (parts[0] === "about") page = <AboutPage />;
  else if (parts[0] === "activities")
    page =
      parts[1] === "past" ? (
        <PastActivitiesPage />
      ) : parts[1] ? (
        <ActivityDetail slug={parts[1]} />
      ) : (
        <Activities />
      );
  else if (parts[0] === "programs")
    page = parts[1] ? <ProgramDetail slug={parts[1]} /> : <Programs />;
  else if (parts[0] === "donation") page = <Donation />;
  else if (parts[0] === "gallery") page = <GalleryPage />;
  else if (parts[0] === "blogs") page = <BlogsPage />;
  else if (parts[0] === "contact") page = <Contact />;
  return (
    <div className="noise min-h-screen overflow-hidden">
      <PremiumHeader />
      <AnimatePresence mode="wait">
        <motion.main
          key={path}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {page}
        </motion.main>
      </AnimatePresence>
      <ReferenceFooter />
    </div>
  );
}
