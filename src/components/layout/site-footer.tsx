import { cacheLife } from "next/cache";
import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { InstagramIcon, TikTokIcon } from "@/components/brand/social-icons";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { CookieSettingsButton } from "@/components/layout/cookie-settings-button";
import { navLinks, site, whatsappLink } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-charcoal-900 text-charcoal-200 print:hidden">
      <div aria-hidden className="meander opacity-60" />
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_0.8fr]">
        <div className="max-w-xs">
          <Logo className="h-16 w-auto" />
          <p className="mt-5 font-display text-lg text-cream">{site.tagline}</p>
          <p className="mt-2 text-sm leading-relaxed text-charcoal-300">
            Sea-view dining, celebrations and meetings in Aberdeen, Freetown.
          </p>
          <div className="mt-5 flex gap-2">
            <a
              href={site.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="El Greco on Instagram"
              className="grid size-10 place-items-center rounded-full bg-charcoal-800 text-cream transition hover:bg-mint-400 hover:text-charcoal-900"
            >
              <InstagramIcon className="size-5" />
            </a>
            <a
              href={site.social.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="El Greco on TikTok"
              className="grid size-10 place-items-center rounded-full bg-charcoal-800 text-cream transition hover:bg-mint-400 hover:text-charcoal-900"
            >
              <TikTokIcon className="size-5" />
            </a>
          </div>
        </div>

        <div>
          <h2 className="eyebrow text-mint-400">Visit</h2>
          <address className="mt-4 space-y-3 text-sm not-italic">
            <p className="flex gap-2">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-charcoal-400" />
              <span>
                {site.address.street}
                <br />
                {site.address.area}, {site.address.city}
                <br />
                {site.address.country}
              </span>
            </p>
            <a
              href={site.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-cream hover:text-mint-300"
            >
              Get directions <ArrowUpRight aria-hidden className="size-4" />
            </a>
          </address>
        </div>

        <div>
          <h2 className="eyebrow text-mint-400">Reservations &amp; enquiries</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a href={`tel:${site.phone}`} className="inline-flex items-center gap-2 hover:text-cream">
                <Phone aria-hidden className="size-4 text-charcoal-400" />
                {site.phoneDisplay}
              </a>
            </li>
            <li>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-cream"
              >
                <WhatsAppIcon className="size-4 text-charcoal-400" />
                WhatsApp us
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="inline-flex items-center gap-2 break-all hover:text-cream">
                <Mail aria-hidden className="size-4 shrink-0 text-charcoal-400" />
                {site.email}
              </a>
            </li>
          </ul>
        </div>

        <nav aria-label="Footer">
          <h2 className="eyebrow text-mint-400">Explore</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-cream">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/verify" className="hover:text-cream">
                Verify a booking pass
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-charcoal-800">
        {/* Bottom padding keeps the floating WhatsApp button off these links. */}
        <div className="container-page flex flex-col gap-3 pt-5 pb-24 text-xs text-charcoal-400 sm:flex-row sm:items-center sm:gap-6 sm:pb-5">
          <p>
            &copy; <CopyrightYear /> {site.name}. All rights reserved.
          </p>
          <CookieSettingsButton className="self-start text-left underline-offset-4 hover:text-cream hover:underline sm:self-auto" />
          <Link href="/staff" className="self-start underline-offset-4 hover:text-cream hover:underline sm:ml-auto sm:self-auto">
            Staff
          </Link>
        </div>
      </div>
    </footer>
  );
}

async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
