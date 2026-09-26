import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarCheck,
  MapPin,
  Music2,
  Phone,
  QrCode,
  Waves,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { BOOKING_RULES, OCCASIONS } from "@/lib/booking/config";
import { getMenu } from "@/lib/menu";
import type { MenuGroupId } from "@/lib/menu-types";
import { MENU_GROUPS, formatPrice, groupStartingPrice } from "@/lib/menu-utils";
import { photos, type Photo } from "@/lib/photos";
import { site, whatsappLink } from "@/lib/site";

const GROUP_PHOTOS: Record<MenuGroupId, Photo> = {
  brunch: photos.eggsBenedict,
  appetizers: photos.springRolls,
  mains: photos.steakPlate,
  specialities: photos.acheke,
  desserts: photos.chocolateCake,
  drinks: photos.margarita,
};

const OCCASION_CARDS: { title: string; body: string; href: string; photo: Photo }[] = [
  {
    title: "Birthdays",
    body: "Balloons, cake and a table styled for the celebration.",
    href: "/reservations?occasion=birthday",
    photo: photos.birthdayBalloons,
  },
  {
    title: "Date nights & anniversaries",
    body: "A quiet table, flowers and a sea view if you'd like one.",
    href: "/reservations?occasion=date-night",
    photo: photos.dateNightTable,
  },
  {
    title: "Business meetings",
    body: "Wi-Fi, a calm corner or the full conference room.",
    href: "/reservations?occasion=business",
    photo: photos.conferenceRoom,
  },
  {
    title: "Private parties & events",
    body: "Long tables, buffets and a team that plans it with you.",
    href: "/events",
    photo: photos.celebrationLongTable,
  },
];

const SPACES: { name: string; photo: Photo }[] = [
  { name: "Main dining room", photo: photos.diningOakCeiling },
  { name: "Sea-view terrace", photo: photos.terraceSeaTable },
  { name: "Conference room", photo: photos.conferenceUShape },
  { name: "Event hall", photo: photos.eventHallLogo },
];

const GALLERY: Photo[] = [
  photos.lobsterPlatter,
  photos.smokingCocktail,
  photos.flatbreadPizza,
  photos.milkshakes,
  photos.seafoodJollof,
  photos.cappuccino,
];

export default async function HomePage() {
  const menu = await getMenu();
  const groups = MENU_GROUPS.map((group) => {
    const categories = menu.categories.filter((c) => c.group === group.id);
    return {
      ...group,
      photo: GROUP_PHOTOS[group.id],
      itemCount: categories.reduce((n, c) => n + c.items.length, 0),
      from: groupStartingPrice(categories),
    };
  }).filter((g) => g.itemCount > 0);

  return (
    <>
      <Hero />
      <TrustStrip />

      <section aria-labelledby="occasions-heading" className="container-page py-16 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-primary-text">Plan your occasion</p>
            <h2 id="occasions-heading" className="mt-2 text-3xl font-bold sm:text-4xl">
              Every celebration, planned properly
            </h2>
          </div>
          <Link href="/events" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-text hover:underline">
            Events &amp; private hire <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OCCASION_CARDS.map((card) => (
            <li key={card.title}>
              <Link href={card.href} className="group relative block aspect-[3/4] overflow-hidden rounded-card bg-charcoal-800">
                <Image
                  src={card.photo.src}
                  alt={card.photo.alt}
                  fill
                  placeholder="blur"
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-charcoal-950/90 via-charcoal-950/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-cream">
                  <h3 className="text-xl font-semibold">{card.title}</h3>
                  <p className="mt-1 text-sm text-charcoal-200">{card.body}</p>
                  <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-mint-300">
                    Book now <ArrowRight aria-hidden className="size-4 transition group-hover:translate-x-0.5" />
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="spaces-heading" className="bg-charcoal-900 text-cream">
        <div className="container-page py-16 sm:py-24">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:items-end">
            <div>
              <p className="eyebrow text-mint-400">The space</p>
              <h2 id="spaces-heading" className="mt-2 text-3xl font-bold sm:text-4xl">
                Oak ceilings, black lamps and the Atlantic outside
              </h2>
            </div>
            <p className="text-charcoal-200">
              Choose your spot when you book: the bright main dining room, the open terrace facing the ocean, or a private
              room for meetings and events.
            </p>
          </div>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SPACES.map((space) => (
              <li key={space.name} className="group relative aspect-[4/5] overflow-hidden rounded-card">
                <Image
                  src={space.photo.src}
                  alt={space.photo.alt}
                  fill
                  placeholder="blur"
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-charcoal-950/80 to-transparent" />
                <p className="absolute bottom-4 left-4 font-display text-lg font-semibold">{space.name}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="menu-heading" className="container-page py-16 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-primary-text">The menu</p>
            <h2 id="menu-heading" className="mt-2 text-3xl font-bold sm:text-4xl">
              Something for every hour
            </h2>
          </div>
          <Link href="/menu" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-text hover:underline">
            See the full menu <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/menu#${g.id}`}
                className="group flex h-full overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line transition hover:ring-mint-400"
              >
                <div className="relative w-2/5 shrink-0 bg-charcoal-100">
                  <Image
                    src={g.photo.src}
                    alt={g.photo.alt}
                    fill
                    placeholder="blur"
                    sizes="(min-width: 1024px) 13vw, 40vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-lg font-semibold">{g.label}</h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    <span className="font-semibold text-ink tabular-nums">{g.itemCount} items</span>
                    {g.from !== undefined && <> · from {formatPrice(g.from)}</>}
                  </p>
                  <p className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-primary-text">
                    Browse <ArrowUpRight aria-hidden className="size-4" />
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <ul aria-label="From our kitchen and bar" className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {GALLERY.map((photo) => (
            <li key={photo.alt} className="relative aspect-square overflow-hidden rounded-xl bg-charcoal-100">
              <Image src={photo.src} alt={photo.alt} fill placeholder="blur" sizes="(min-width: 640px) 16vw, 33vw" className="object-cover" />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="music-heading" className="bg-wood-50">
        <div className="container-page grid gap-10 py-16 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div className="relative aspect-[4/3] overflow-hidden rounded-card">
            <Image
              src={photos.liveMusicBand.src}
              alt={photos.liveMusicBand.alt}
              fill
              placeholder="blur"
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div>
            <p className="eyebrow text-wood-600">Nights at El Greco</p>
            <h2 id="music-heading" className="mt-2 text-3xl font-bold sm:text-4xl">
              Live music, match nights and more
            </h2>
            <p className="mt-4 text-ink-muted">
              Saxophone sets and live bands, big games on the screens, and a cocktail bar that keeps going. Book ahead on
              busy nights and your table will be waiting.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/reservations"
                className="inline-flex items-center gap-2 rounded-full bg-charcoal-900 px-6 py-3 font-semibold text-cream transition hover:bg-charcoal-800"
              >
                <CalendarCheck aria-hidden className="size-5" /> Book a table
              </Link>
              <a
                href={site.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-surface px-6 py-3 font-semibold ring-1 ring-line transition hover:ring-charcoal-400"
              >
                See what&apos;s on {site.social.handle}
              </a>
            </div>
          </div>
        </div>
      </section>

      <Visit />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-charcoal-900 text-cream">
      <div className="container-page grid gap-10 pt-10 pb-14 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-20">
        <div>
          <p className="eyebrow text-mint-400">Aberdeen · Freetown · Sea view</p>
          <h1 className="mt-4 text-4xl leading-[1.05] font-bold sm:text-6xl">
            Good food. Good vibe. <span className="text-mint-400">More memories.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-charcoal-200 sm:text-lg">
            Brunch, mezze, grills, seafood and cocktails by the Atlantic. Book your table for a date night, a birthday or a
            business lunch, and walk in to a table that&apos;s ready.
          </p>
          <QuickBooking />
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <Link href="/menu" className="inline-flex items-center gap-1.5 font-semibold text-cream hover:text-mint-300">
              Order online <ArrowRight aria-hidden className="size-4" />
            </Link>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-cream hover:text-mint-300"
            >
              <WhatsAppIcon className="size-4 text-whatsapp" /> WhatsApp us
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:h-[30rem] sm:grid-rows-[2fr_1fr]">
          <div className="relative col-span-2 aspect-[16/10] overflow-hidden rounded-card sm:aspect-auto">
            <Image
              src={photos.diningOakCeiling.src}
              alt={photos.diningOakCeiling.alt}
              fill
              priority
              placeholder="blur"
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-card sm:aspect-auto">
            <Image
              src={photos.terraceSeaTable.src}
              alt={photos.terraceSeaTable.alt}
              fill
              placeholder="blur"
              sizes="(min-width: 1024px) 22vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-card sm:aspect-auto">
            <Image
              src={photos.acheke.src}
              alt={photos.acheke.alt}
              fill
              placeholder="blur"
              sizes="(min-width: 1024px) 22vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
      <div aria-hidden className="meander opacity-60" />
    </section>
  );
}

/** Plain GET form so it works before JavaScript loads; the reservations page reads the query. */
function QuickBooking() {
  const selectClass =
    "h-12 w-full rounded-xl bg-charcoal-800 px-3 text-sm text-cream ring-1 ring-charcoal-700 focus:ring-2 focus:ring-mint-400 focus:outline-none";
  return (
    <form action="/reservations" className="mt-8 grid gap-2 rounded-card bg-charcoal-950/60 p-3 ring-1 ring-charcoal-700 sm:grid-cols-[1.2fr_0.8fr_auto]">
      <div>
        <label htmlFor="qb-occasion" className="sr-only">
          Occasion
        </label>
        <select id="qb-occasion" name="occasion" defaultValue="dining" className={selectClass}>
          {OCCASIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="qb-party" className="sr-only">
          Guests
        </label>
        <select id="qb-party" name="party" defaultValue="2" className={selectClass}>
          {Array.from({ length: BOOKING_RULES.maxTablePartySize }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "guest" : "guests"}
            </option>
          ))}
          <option value={BOOKING_RULES.maxTablePartySize + 1}>{BOOKING_RULES.maxTablePartySize + 1}+ guests (event)</option>
        </select>
      </div>
      <button
        type="submit"
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-ink transition hover:bg-mint-300"
      >
        <CalendarCheck aria-hidden className="size-5" /> Find a table
      </button>
    </form>
  );
}

function TrustStrip() {
  const items = [
    { icon: BadgeCheck, text: `Instant confirmation for up to ${BOOKING_RULES.autoConfirmMaxParty} guests` },
    { icon: QrCode, text: "Verified QR booking pass" },
    { icon: Waves, text: "Sea-view terrace" },
    { icon: Music2, text: "Live music nights" },
  ];
  return (
    <section aria-label="Why book with us" className="border-b border-line bg-surface">
      <ul className="container-page grid grid-cols-2 gap-4 py-5 text-sm font-medium lg:grid-cols-4">
        {items.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mint-50 text-mint-700 ring-1 ring-mint-100">
              <Icon aria-hidden className="size-4" />
            </span>
            {text}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Visit() {
  return (
    <section id="visit" aria-labelledby="visit-heading" className="relative overflow-hidden bg-charcoal-900 text-cream">
      <div className="absolute inset-0">
        <Image src={photos.terraceOpenAir.src} alt="" fill placeholder="blur" sizes="100vw" className="object-cover opacity-30" />
        <div className="absolute inset-0 bg-linear-to-r from-charcoal-900 via-charcoal-900/90 to-charcoal-900/50" />
      </div>
      <div className="container-page relative grid gap-10 py-16 sm:py-24 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="eyebrow text-mint-400">Visit us</p>
          <h2 id="visit-heading" className="mt-2 text-3xl font-bold sm:text-4xl">
            Find El Greco in Aberdeen
          </h2>
          <p className="mt-4 max-w-md text-charcoal-200">
            Walk in for coffee, stay for sunset, or book ahead for dinner and celebrations.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={site.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-ink transition hover:bg-mint-300"
            >
              <MapPin aria-hidden className="size-5" /> Get directions
            </a>
            <a
              href={`tel:${site.phone}`}
              className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold ring-1 ring-charcoal-600 transition hover:ring-cream"
            >
              <Phone aria-hidden className="size-5" /> {site.phoneDisplay}
            </a>
          </div>
        </div>
        <address className="rounded-card bg-charcoal-950/70 p-6 not-italic ring-1 ring-charcoal-700 backdrop-blur sm:p-8">
          <dl className="grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="eyebrow text-charcoal-400">Address</dt>
              <dd className="mt-2 leading-relaxed">
                {site.address.street}
                <br />
                {site.address.area}, {site.address.city}
                <br />
                {site.address.country}
              </dd>
            </div>
            <div>
              <dt className="eyebrow text-charcoal-400">Reservations</dt>
              <dd className="mt-2 space-y-1">
                <a href={`tel:${site.phone}`} className="block hover:text-mint-300">
                  {site.phoneDisplay}
                </a>
                <a href={`mailto:${site.email}`} className="block break-all hover:text-mint-300">
                  {site.email}
                </a>
                <Link href="/reservations" className="block font-semibold text-mint-300 hover:underline">
                  Book online
                </Link>
              </dd>
            </div>
          </dl>
        </address>
      </div>
    </section>
  );
}
