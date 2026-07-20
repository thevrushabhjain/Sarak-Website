import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../components/SarakSite.tsx", import.meta.url),
  "utf8",
);

const aboutStart = source.indexOf("function AboutPage()");
const missionStart = source.indexOf("function HomeMissionSections()");
const homeStart = source.indexOf("function RefinedHome()");
const footerStart = source.indexOf("function ReferenceFooter()");
const activitiesStart = source.indexOf("function Activities()");
const activityDetailStart = source.indexOf("function ActivityDetail");
const programsStart = source.indexOf("function Programs()");
const programDetailStart = source.indexOf("function ProgramDetail");
const infoStart = source.indexOf("function Info");
const donationStart = source.indexOf("function Donation()");
const galleryStart = source.indexOf("function GalleryPage()");
const contactStart = source.indexOf("function Contact()");
const premiumHeaderStart = source.indexOf("function PremiumHeader()");
const heroStart = source.indexOf("function PremiumPageHero(");
const aboutStartAfterHero = source.indexOf("function AboutPage()");
const aboutSource = source.slice(aboutStart, missionStart);
const missionSource = source.slice(missionStart, homeStart);
const homeSource = source.slice(homeStart, footerStart);
const activitiesSource = source.slice(activitiesStart, activityDetailStart);
const activityDetailSource = source.slice(activityDetailStart, programsStart);
const programDetailSource = source.slice(programDetailStart, infoStart);
const donationSource = source.slice(donationStart, galleryStart);
const contactSource = source.slice(contactStart, premiumHeaderStart);
const heroSource = source.slice(heroStart, aboutStartAfterHero);
const refinedHomeSource = source.slice(homeStart, footerStart);

const checks = [
  [source.includes('["About", "/about"]'), "About remains in the primary navigation"],
  [source.includes("function PremiumPageHero("), "Shared premium page hero exists"],
  [source.includes('about: "/murti.png"'), "About uses the uploaded murti image"],
  [source.includes('programs: "/programs.png"'), "Programs uses the uploaded programs image"],
  [source.includes('activities: "/DSC_0615.JPG"'), "Activities uses an uploaded local hero image"],
  [aboutSource.includes("<PremiumPageHero"), "About renders the shared premium hero"],
  [!aboutSource.includes("Who Is"), "Who Is Sarak is removed from About"],
  [!aboutSource.includes("What does SARAK do?"), "Purpose services are removed from About"],
  [!aboutSource.includes("aukUpgwN53c"), "The testimonial is removed from About"],
  [!aboutSource.includes("सराक परिवार से जुड़ें"), "WhatsApp CTA is removed from About"],
  [aboutSource.includes("Leadership"), "About contains the leadership section"],
  [homeSource.includes("<HomeMissionSections />"), "Home renders the mission sequence below Who Is Sarak"],
  [missionSource.includes("What does SARAK do?"), "Purpose services are on Home"],
  [missionSource.includes("aukUpgwN53c"), "The testimonial is on Home"],
  [missionSource.includes("सराक परिवार से जुड़ें"), "WhatsApp CTA is on Home"],
  [source.includes('title: "संस्करण"'), "The third service is labelled संस्करण"],
  [!source.includes('title: "संस्कार"'), "The old संस्कार service label is absent"],
  [missionSource.includes("cdn.simpleicons.org/whatsapp"), "The CTA uses a WhatsApp logo"],
  [missionSource.includes("bg-[#075E54]"), "The CTA uses the requested WhatsApp background"],
  [missionSource.includes("rounded-full bg-white"), "The CTA logo is presented as a white circular profile image"],
  [missionSource.includes('href="https://wa.me/919727070787"'), "The WhatsApp CTA links to WhatsApp"],
  [missionSource.includes('/sarak-logo-authentic.png'), "The CTA uses the SARAK logo"],
  [homeSource.includes("object-cover object-center md:block"), "Desktop home hero image uses cover without stretching"],
  [homeSource.includes("object-cover object-center md:hidden"), "Mobile home hero image uses cover without stretching"],
  [missionSource.includes("h-[220px] w-full") && missionSource.includes("lg:h-[320px]"), "Service images use equal fixed responsive sizing"],
  [homeSource.includes("leading-[1.38]") || homeSource.includes("leading-[1.34]"), "Home Hindi hero heading has safer line-height"],
  [missionSource.includes("lg:w-[430px]") && missionSource.includes("xl:w-[470px]"), "Service images use fixed desktop width"],
  [source.includes("group-hover:bg-saffron") && source.includes("Read story"), "Activity card CTA turns saffron on hover"],
  [heroSource.includes("md:opacity-72") && heroSource.includes("lg:opacity-92"), "Inner hero image composition is integrated with responsive opacity"],
  [heroSource.includes("absolute inset-0 z-0") && heroSource.includes("object-cover opacity-38"), "Inner hero image fills the full desktop hero area"],
  [heroSource.includes("absolute inset-0 z-0") && heroSource.includes("min-h-[430px]"), "Non-home hero image covers the full hero background"],
  [heroSource.includes("imageClassName") && heroSource.includes("object-[62%_center]"), "Non-home hero supports mobile subject positioning"],
  [homeSource.includes('src="/sarak-hero-desktop.png"') && homeSource.includes('src="/sarak-hero-mobile.png"'), "Home hero image sources remain unchanged"],
  [heroSource.includes("titleClassName") && source.includes("lg:whitespace-nowrap"), "Hero supports contact title on one desktop line"],
  [source.includes("leading-[1.24]") && source.includes("Gallery"), "Gallery hero has increased title line spacing"],
  [source.includes('/sarak-education.jpg'), "The education service uses supplied photography"],
  [source.includes('/sarak-seva.jpg'), "The seva service uses supplied photography"],
  [source.includes('/sarak-version.jpg'), "The version service uses supplied photography"],
  [aboutSource.includes('/sarak-heritage-idol.jpg'), "About history uses supplied heritage photography"],
  [aboutSource.includes('/sarak-leadership.jpg'), "Leadership uses the supplied portrait"],
  [source.includes('["Blogs", "/blogs"]'), "Blogs is present in navigation/footer links"],
  [source.includes("function BlogsPage()"), "Blogs page exists"],
  [source.includes('parts[0] === "blogs"'), "Blogs route is registered"],
  [activitiesSource.includes("ongoingActivities"), "Activities page has ongoing activities"],
  [activitiesSource.includes("pastActivities"), "Activities page has past activities"],
  [source.includes("function PastActivitiesPage()"), "Past activities page exists"],
  [source.includes('parts[1] === "past"'), "Past activities route is registered"],
  [source.includes('slug: "past-shrutgyan-mahotsav"'), "Past activities use distinct archive records"],
  [source.includes('href: "/activities/past#past-shrutgyan-mahotsav"'), "Past activity cards stay on the past archive"],
  [activitiesSource.includes("ongoingActivities = allActivityCards"), "Ongoing activities show all current activities"],
  [activitiesSource.includes("pastActivitiesPreview = pastActivityCards.slice(0, 3)"), "Main activities page shows three past activities"],
  [source.includes("Shiksha Gatividhi"), "Activity category labels are English transliterations"],
  [!source.includes("चल रही गतिविधि"), "Old Hindi ongoing category label is removed"],
  [!source.includes("पूर्व गतिविधि"), "Old Hindi past category label is removed"],
  [activityDetailSource.includes("<PremiumPageHero"), "Activity detail renders the shared premium hero"],
  [programDetailSource.includes("<PremiumPageHero"), "Program detail renders the shared premium hero"],
  [activityDetailSource.includes('href="/activities"'), "Activity detail has back navigation to activities"],
  [activityDetailSource.includes("YouTube preview"), "Activity detail has a YouTube preview section"],
  [!activityDetailSource.includes("Watch the story"), "Old watch-the-story CTA is removed from activity details"],
  [source.includes("एक साल के लिए एक गाम दत्तक") && source.includes("5,55,000"), "Donation schemes include source donation content"],
  [donationSource.includes("IDFC BANK") && donationSource.includes("10075814963") && donationSource.includes("IDFB0040311"), "Donation bank details use source content"],
  [donationSource.includes("navigator.clipboard.writeText"), "Donation copy button writes bank details to clipboard"],
  [donationSource.includes("donation-QR%20Code.png"), "Donation QR image uses the source QR asset"],
  [donationSource.includes("schemeImages") && donationSource.includes("bg-gradient-to-t"), "Donation scheme cards include images with readable overlays"],
  [!donationSource.includes("Select scheme"), "Donation scheme select buttons are removed"],
  [contactSource.includes("Main Office Information") && source.includes("For Jinalay Nirman/Jirnodhar"), "Contact page uses source contact groups"],
  [source.includes("Nareshbhai Sheth") && source.includes("Raj Gandhi") && source.includes("Arvindbhai Mehta"), "Contact page includes official contact people"],
  [!contactSource.includes("Find the right team"), "Find the right team section is removed"],
  [contactSource.includes("102 Blue ribbon building, near harmony residency, vesu"), "Contact page uses official office address"],
  [source.includes("bg-[#075E54]") && source.includes("ContactStrip"), "Contact CTA keeps WhatsApp green theme"],
  [source.includes("function SupportSystemSection()") && contactSource.includes("<SupportSystemSection />"), "Support system moved to Contact page"],
  [!refinedHomeSource.includes("supportSystem"), "Support system removed from Home page"],
  [refinedHomeSource.includes("Make a Donation") && !refinedHomeSource.includes("Become a Volunteer"), "Home footer CTA is donation-only"],
  [refinedHomeSource.includes("group-hover:bg-[#f97216]"), "Featured activity arrow hover background uses #f97216"],
  [missionSource.includes("lg:ml-auto") && missionSource.includes("service.title === \"सेवा\""), "Seva content block is shifted right on desktop"],
  [contactSource.includes("lg:self-stretch") && contactSource.includes("justify-between"), "Contact direct panel balances height beside form"],
];

const failures = checks.filter(([passed]) => !passed);
for (const [passed, description] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${description}`);
}

if (failures.length) process.exit(1);
