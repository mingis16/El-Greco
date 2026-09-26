import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Car,
  Coffee,
  Mic2,
  MonitorPlay,
  Snowflake,
  UserRoundCheck,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { photos, type Photo } from "@/lib/photos";
import { whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Events & private hire",
  description:
    "Host birthdays, anniversaries, private parties, meetings, workshops and corporate events at El Greco in Aberdeen, Freetown: conference room, event hall and sea-view terrace, with buffets and event support.",
  alternates: { canonical: "/events" },
  openGraph: { url: "/events" },
};

const SPACES: { name: string; photo: Photo; body: string; points: string[] }[] = [
  {
    name: "Conference room",
    photo: photos.conferenceUShape,
    body: "Meetings, workshops and corporate events with natural light and a view of the sea.",
    points: ["Boardroom, U-shape or classroom layouts", "Projector and large-screen display", "Breakfast, lunch or dinner buffet"],
  },
  {
    name: "Event hall",
    photo: photos.eventHallLogo,
    body: "A bright, flexible hall dressed in white linen for receptions, launches and celebrations.",
    points: ["Banquet or cocktail layouts", "Decoration and styling on request", "Buffet or set menus"],
  },
  {
    name: "Sea-view terrace",
    photo: photos.celebrationLongTable,
    body: "Long tables beside the Atlantic for birthdays, anniversaries and family gatherings.",
    points: ["Styled long-table dinners", "Sunset views over the ocean", "Cakes, flowers and balloons arranged for you"],
  },
];

const AMENITIES: { icon: LucideIcon; label: string }[] = [
  { icon: MonitorPlay, label: "Projector & large-screen display" },
  { icon: Mic2, label: "Sound system & microphones" },
  { icon: Wifi, label: "High-speed Wi-Fi" },
  { icon: Snowflake, label: "Air-conditioned comfort" },
  { icon: UserRoundCheck, label: "Dedicated event support staff" },
  { icon: Car, label: "Ample parking space" },
  { icon: Coffee, label: "Breakfast, lunch & dinner buffets" },
];

const OCCASIONS: { label: string; occasion: string; photo: Photo }[] = [
  { label: "Birthdays", occasion: "birthday", photo: photos.birthdayBalloons },
  { label: "Anniversaries", occasion: "anniversary", photo: photos.dateNightTable },
  { label: "Private parties", occasion: "private-party", photo: photos.celebrationBlueYellow },
  { label: "Meetings & workshops", occasion: "corporate", photo: photos.conferenceRoom },
];

const PROCESS = [
  { title: "Send your request", body: "Tell us the date, guest numbers and what you have in mind. It takes two minutes." },
  { title: "We call you within 24 hours", body: "Our events team agrees the room, layout, menu and any deposit with you." },
  { title: "Get your confirmed event pass", body: "Your booking reference and QR pass update to Confirmed, with every detail in writing." },
  { title: "Arrive to a room that's ready", body: "Staff scan your pass at the door and your set-up is exactly as agreed." },
];

export default function EventsPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-charcoal-900 text-cream">
        <div className="container-page grid gap-10 py-14 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow text-mint-400">Events &amp; private hire</p>
            <h1 className="mt-3 text-4xl leading-tight font-bold sm:text-5xl">Celebrate, meet and host by the sea.</h1>
            <p className="mt-4 max-w-lg text-charcoal-200">
              From birthday dinners on the terrace to full-day workshops in the conference room, we plan the details with you
              and confirm everything in writing.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/reservations?occasion=private-party"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 font-semibold text-primary-ink transition hover:bg-mint-300"
              >
                Send an event request <ArrowRight aria-hidden className="size-5" />
              </Link>
              <a
                href={whatsappLink("Hello El Greco, I'd like to plan an event.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-semibold ring-1 ring-charcoal-600 transition hover:ring-cream"
              >
                <WhatsAppIcon className="size-5 text-whatsapp" /> Talk to our events team
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PhotoTile photo={photos.eventHall} className="col-span-2 aspect-[16/9]" priority sizes="(min-width: 1024px) 40vw, 100vw" />
            <PhotoTile photo={photos.conferenceRoom} className="aspect-square" sizes="(min-width: 1024px) 20vw, 50vw" />
            <PhotoTile photo={photos.birthdayBalloons} className="aspect-square" sizes="(min-width: 1024px) 20vw, 50vw" />
          </div>
        </div>
        <div aria-hidden className="meander opacity-50" />
      </section>

      <section aria-labelledby="spaces-heading" className="container-page py-16 sm:py-24">
        <p className="eyebrow text-primary-text">Our spaces</p>
        <h2 id="spaces-heading" className="mt-2 text-3xl font-bold sm:text-4xl">
          A room for every kind of occasion
        </h2>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {SPACES.map((space) => (
            <article key={space.name} className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line">
              <PhotoTile photo={space.photo} className="aspect-[4/3] rounded-none" sizes="(min-width: 1024px) 33vw, 100vw" />
              <div className="p-6">
                <h3 className="text-xl font-semibold">{space.name}</h3>
                <p className="mt-2 text-sm text-ink-muted">{space.body}</p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {space.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-mint-500" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="amenities-heading" className="bg-charcoal-900 text-cream">
        <div className="container-page grid gap-10 py-16 sm:py-20 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <p className="eyebrow text-mint-400">Meetings, workshops &amp; corporate events</p>
            <h2 id="amenities-heading" className="mt-2 text-3xl font-bold sm:text-4xl">
              The perfect space to work &amp; dine
            </h2>
            <p className="mt-4 text-charcoal-200">
              Good food, good ambience, and everything you need to get work done, with our team on hand from set-up to the
              last coffee.
            </p>
            <Link
              href="/reservations?occasion=corporate"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-ink transition hover:bg-mint-300"
            >
              Request the conference room <ArrowRight aria-hidden className="size-5" />
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {AMENITIES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 rounded-xl bg-charcoal-800 p-4">
                <Icon aria-hidden className="size-5 shrink-0 text-mint-400" />
                <span className="text-sm font-medium">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="occasions-heading" className="container-page py-16 sm:py-24">
        <p className="eyebrow text-primary-text">Plan your occasion</p>
        <h2 id="occasions-heading" className="mt-2 text-3xl font-bold sm:text-4xl">
          What are we celebrating?
        </h2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OCCASIONS.map((o) => (
            <li key={o.occasion}>
              <Link href={`/reservations?occasion=${o.occasion}`} className="group relative block aspect-[3/4] overflow-hidden rounded-card">
                <Image
                  src={o.photo.src}
                  alt={o.photo.alt}
                  fill
                  placeholder="blur"
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-charcoal-950/85 via-charcoal-950/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-cream">
                  <h3 className="text-xl font-semibold">{o.label}</h3>
                  <p className="mt-1 inline-flex items-center gap-1 text-sm text-mint-300">
                    Start planning <ArrowRight aria-hidden className="size-4" />
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="process-heading" className="bg-wood-50">
        <div className="container-page py-16 sm:py-20">
          <p className="eyebrow text-wood-600">How event booking works</p>
          <h2 id="process-heading" className="mt-2 text-3xl font-bold sm:text-4xl">
            Everything agreed, nothing left to chance
          </h2>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map((step, i) => (
              <li key={step.title} className="rounded-card bg-surface p-5 ring-1 ring-wood-100">
                <span className="grid size-9 place-items-center rounded-full bg-charcoal-900 font-semibold text-mint-300">{i + 1}</span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-ink-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="music-heading" className="container-page grid gap-8 py-16 sm:py-24 lg:grid-cols-2 lg:items-center">
        <div className="grid grid-cols-2 gap-3">
          <PhotoTile photo={photos.liveMusicSax} className="aspect-[3/4]" sizes="(min-width: 1024px) 25vw, 50vw" />
          <PhotoTile photo={photos.liveMusicBand} className="aspect-[3/4]" sizes="(min-width: 1024px) 25vw, 50vw" />
        </div>
        <div>
          <p className="eyebrow text-primary-text">Entertainment</p>
          <h2 id="music-heading" className="mt-2 text-3xl font-bold sm:text-4xl">
            Live music and match nights
          </h2>
          <p className="mt-4 text-ink-muted">
            Saxophone sets, live bands and big-screen football nights bring the room to life. Ask us about adding live music
            to your event.
          </p>
          <a
            href={whatsappLink("Hello El Greco, when is your next live music night?")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 font-semibold text-primary-text underline-offset-4 hover:underline"
          >
            Ask about upcoming nights <ArrowRight aria-hidden className="size-4" />
          </a>
        </div>
      </section>
    </>
  );
}

function PhotoTile({
  photo,
  className = "",
  sizes,
  priority,
}: {
  photo: Photo;
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-card bg-charcoal-800 ${className}`}>
      <Image src={photo.src} alt={photo.alt} fill placeholder="blur" priority={priority} sizes={sizes} className="object-cover" />
    </div>
  );
}
